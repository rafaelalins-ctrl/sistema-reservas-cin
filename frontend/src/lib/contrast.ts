// Contraste WCAG 2.x entre duas cores CSS resolvidas no navegador.

function toRgb(color: string): [number, number, number] {
  const ctx = document.createElement('canvas').getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

function luminance([r, g, b]: [number, number, number]) {
  const channel = (value: number) => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(foreground: string, background: string) {
  const a = luminance(toRgb(foreground))
  const b = luminance(toRgb(background))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/** Lê o valor resolvido de uma variável CSS do :root. */
export function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
