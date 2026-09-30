// Guarda-corpos da identidade visual do CIn (docs/identidade-cin-ufpe.md).
// Roda em `npm run lint` e no CI. Falha se alguma regra for violada em src/.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SRC = join(ROOT, 'src')
const TOKENS_DIR = join('src', 'styles', 'tokens') + sep
const STYLE_GUIDE = join('src', 'pages', 'StyleGuide.tsx')

const RULES = [
  {
    name: 'Inter só em 400/700: troque font-medium/font-semibold por font-normal/font-bold',
    pattern: /\bfont-(medium|semibold|light|thin|extralight|extrabold|black)\b/,
  },
  {
    name: 'Ícones só do Phosphor: remova lucide-react ou outra biblioteca',
    pattern:
      /from\s+['"](lucide-react|@radix-ui\/react-icons|react-icons[^'"]*|@tabler\/icons-react|@hugeicons[^'"]*)['"]/,
  },
  {
    name: 'Ícones Phosphor só no peso Fill',
    pattern: /weight=\{?\s*['"](thin|light|regular|bold|duotone)['"]/,
  },
  {
    name: 'Sem cores soltas: use tokens (bg-primary, text-muted-foreground...)',
    pattern:
      /#[0-9a-fA-F]{3,8}\b|\b(bg|text|border|ring|fill|stroke|outline|from|to|via)-\[(#|rgb|hsl|oklch)/,
    skip: (file) => file.startsWith(TOKENS_DIR),
  },
  {
    name: 'Sem paleta padrão do Tailwind: use os tokens do CIn',
    pattern:
      /\b(bg|text|border|ring|fill|stroke|outline|from|to|via|divide|shadow)-(red|rose|pink|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|slate|gray|zinc|neutral|stone)-\d{2,3}\b/,
  },
  {
    name: 'Componentes não usam primitivos (--cin-*): use os aliases',
    pattern: /--cin-/,
    skip: (file) => file.startsWith(TOKENS_DIR) || file === STYLE_GUIDE,
  },
  {
    name: 'Só tema claro: remova classes dark:',
    pattern: /(^|[\s"'`])dark:/,
  },
]

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const files = walk(SRC).filter((f) => /\.(tsx?|css)$/.test(f))
const errors = []

for (const path of files) {
  const file = relative(ROOT, path)
  const lines = readFileSync(path, 'utf8').split('\n')
  lines.forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.skip?.(file)) continue
      // Comentários de CSS/TS podem citar valores (ex.: HEX do manual) sem aplicá-los.
      if (/^\s*(\/\/|\/?\*)/.test(line)) continue
      if (rule.pattern.test(line)) errors.push(`${file}:${i + 1}  ${rule.name}\n    ${line.trim()}`)
    }
  })
}

if (errors.length) {
  console.error(`check-design: ${errors.length} problema(s)\n`)
  console.error(errors.join('\n\n'))
  process.exit(1)
}
console.log(`check-design: ok (${files.length} arquivos)`)
