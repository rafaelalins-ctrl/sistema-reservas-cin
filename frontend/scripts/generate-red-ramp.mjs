// Gera src/styles/tokens/primitives.css a partir das cores oficiais do CIn.
//
// Uso:
//   node scripts/generate-red-ramp.mjs          escreve o arquivo e imprime o relatório
//   node scripts/generate-red-ramp.mjs --check  falha se o arquivo estiver desatualizado
//
// Referência: docs/identidade-cin-ufpe.md (seções 1.2 e 1.3).

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  clampChroma,
  differenceCiede2000,
  formatHex,
  interpolate,
  oklch,
  wcagContrast,
} from 'culori'

const OUTPUT = fileURLToPath(new URL('../src/styles/tokens/primitives.css', import.meta.url))

// Cores oficiais do manual.
const OFFWHITE = '#f5f5f5'
const RED_BASE = '#cf2d3b'
const RED_LIGHT_MANUAL = '#e83342' // HSB 355 78 91
const RED_DARK_MANUAL = '#b52834' // HSB 355 78 71
const GRAYS_MANUAL = { 400: '#858585', 600: '#555555', 800: '#252525', 950: '#050505' }

// Curva de luminosidade (OKLCH L) perceptualmente uniforme para 11 passos.
// Os extremos ficam próximos do off-white e do preto do sistema.
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
const LIGHTNESS = [0.97, 0.935, 0.88, 0.8, 0.71, 0.635, 0.57, 0.5, 0.435, 0.37, 0.26]
// Perfil de croma relativo ao pico: baixo nos extremos, máximo perto da base.
const CHROMA_PROFILE = [0.06, 0.14, 0.27, 0.48, 0.8, 0.97, 1, 0.9, 0.75, 0.6, 0.4]

const base = oklch(RED_BASE)

// Ancora a base no passo cuja luminosidade da curva estiver mais próxima.
const anchorIndex = LIGHTNESS.reduce(
  (best, l, i) => (Math.abs(l - base.l) < Math.abs(LIGHTNESS[best] - base.l) ? i : best),
  0,
)
const peakChroma = base.c / CHROMA_PROFILE[anchorIndex]

const red = STEPS.map((step, i) => {
  if (i === anchorIndex) return { step, hex: RED_BASE }
  const color = { mode: 'oklch', l: LIGHTNESS[i], c: peakChroma * CHROMA_PROFILE[i], h: base.h }
  return { step, hex: formatHex(clampChroma(color, 'oklch')) }
})

// Cinzas: os quatro valores válidos do manual + degraus interpolados em OKLab.
const mixOffwhite = interpolate([OFFWHITE, GRAYS_MANUAL[400]], 'oklab')
const mixMid = interpolate([GRAYS_MANUAL[400], GRAYS_MANUAL[600]], 'oklab')
const mixDark = interpolate([GRAYS_MANUAL[600], GRAYS_MANUAL[800]], 'oklab')
const mixDarkest = interpolate([GRAYS_MANUAL[800], GRAYS_MANUAL[950]], 'oklab')
const gray = [
  { step: 100, hex: formatHex(mixOffwhite(0.12)), origem: 'interpolado' },
  { step: 200, hex: formatHex(mixOffwhite(0.3)), origem: 'interpolado' },
  { step: 300, hex: formatHex(mixOffwhite(0.6)), origem: 'interpolado' },
  { step: 400, hex: GRAYS_MANUAL[400], origem: 'manual' },
  { step: 500, hex: formatHex(mixMid(0.5)), origem: 'interpolado' },
  { step: 600, hex: GRAYS_MANUAL[600], origem: 'manual' },
  { step: 700, hex: formatHex(mixDark(0.5)), origem: 'interpolado' },
  { step: 800, hex: GRAYS_MANUAL[800], origem: 'manual' },
  { step: 900, hex: formatHex(mixDarkest(0.5)), origem: 'interpolado' },
  { step: 950, hex: GRAYS_MANUAL[950], origem: 'manual' },
]

const css = `/*
 * Primitivos da identidade do CIn-UFPE.
 * ARQUIVO GERADO por scripts/generate-red-ramp.mjs. Não editar à mão.
 * Componentes nunca usam estes tokens diretamente: usar os aliases (aliases.css).
 */

:root {
  --cin-offwhite: ${OFFWHITE};

  /* Rampa do vermelho institucional (OKLCH, matiz ${base.h.toFixed(1)}). Base ${RED_BASE} = --cin-red-${STEPS[anchorIndex]}. */
${red.map(({ step, hex }) => `  --cin-red-${step}: ${hex};`).join('\n')}

  /* Cinzas: 400/600/800/950 vêm do manual; os demais são interpolados em OKLab. */
${gray.map(({ step, hex, origem }) => `  --cin-gray-${step}: ${hex}; /* ${origem} */`).join('\n')}
}
`

if (process.argv.includes('--check')) {
  // Ignora CRLF: no Windows o Git pode converter as quebras de linha no checkout.
  const current = readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n')
  if (current !== css) {
    console.error('primitives.css está desatualizado. Rode: node scripts/generate-red-ramp.mjs')
    process.exit(1)
  }
  console.log('primitives.css está em dia.')
  process.exit(0)
}

writeFileSync(OUTPUT, css)

// Relatório para conferência manual.
const fmt = (n) => n.toFixed(2)
console.log(
  `Base ${RED_BASE}: L=${base.l.toFixed(3)} C=${base.c.toFixed(3)} h=${base.h.toFixed(1)} → ancorada em --cin-red-${STEPS[anchorIndex]}\n`,
)
console.log('Rampa do vermelho (contraste vs off-white):')
for (const { step, hex } of red) {
  console.log(`  ${String(step).padStart(3)}  ${hex}  ${fmt(wcagContrast(hex, OFFWHITE))}:1`)
}
const deltaE = differenceCiede2000()
for (const [nome, hex] of [
  ['Claro', RED_LIGHT_MANUAL],
  ['Escuro', RED_DARK_MANUAL],
]) {
  const nearest = red
    .map((r) => ({ ...r, d: deltaE(hex, r.hex) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2)
  console.log(
    `\nTom ${nome} do manual ${hex}: mais próximo de ${nearest
      .map((n) => `--cin-red-${n.step} (ΔE ${fmt(n.d)})`)
      .join(', ')}`,
  )
}
console.log('\nCinzas (contraste vs off-white):')
for (const { step, hex, origem } of gray) {
  console.log(
    `  ${String(step).padStart(3)}  ${hex}  ${fmt(wcagContrast(hex, OFFWHITE))}:1  ${origem}`,
  )
}
console.log(`\nEscrito em ${OUTPUT}`)
