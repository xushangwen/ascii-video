export const CHAR_ASPECT = 0.6 // JetBrains Mono 字符宽高比

export type ColorMode = 'bw' | 'color' | 'single'

export interface AsciiParams {
  cols: number
  fps: number          // 1–60
  brightness: number   // -100 to +100
  contrast: number     // -128 to +128
  invert: boolean
  colorMode: ColorMode
  fgColor: string      // hex — used in 'single' mode
  bgColor: string      // hex — canvas background
  charset: string
}

export interface AsciiCell {
  char: string
  r: number
  g: number
  b: number
}

export const CHARSETS: Record<string, string> = {
  minimal:  ' .:-=',
  standard: ' .:-=+*#%@',
  dense:    " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks:   ' ░▒▓█',
  braille:  ' ⠁⠃⠇⡇⣇⣧⣷⣿',
}

// ITU-R BT.709 亮度公式
function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function applyBrightnessContrast(l: number, brightness: number, contrast: number): number {
  let v = l + brightness * 2.55
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  v = factor * (v - 128) + 128
  return Math.max(0, Math.min(255, v))
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

export function escSvgChar(char: string): string {
  if (char === '&') return '&amp;'
  if (char === '<') return '&lt;'
  if (char === '>') return '&gt;'
  if (char === '"') return '&quot;'
  if (char === ' ') return '&#160;'
  return char
}

export function buildSvgBody(
  cells: AsciiCell[],
  cols: number,
  rows: number,
  charW: number,
  charH: number,
  bgColor: string
): string {
  let s = `<rect width="100%" height="100%" fill="${bgColor}"/>`
  for (let row = 0; row < rows; row++) {
    const y = (row * charH).toFixed(2)
    s += `<text y="${y}" dominant-baseline="hanging" xml:space="preserve">`
    for (let col = 0; col < cols; col++) {
      const cell = cells[row * cols + col]
      if (!cell) continue
      s += `<tspan x="${(col * charW).toFixed(2)}" fill="rgb(${cell.r},${cell.g},${cell.b})">${escSvgChar(cell.char)}</tspan>`
    }
    s += '</text>'
  }
  return s
}

// imageData 已经是按 cols×rows 采样好的，直接遍历即可
export function processFrame(imageData: ImageData, params: AsciiParams): AsciiCell[] {
  const { data, width: cols, height: rows } = imageData
  const charset = params.charset || CHARSETS.standard
  const charLen = charset.length
  const cells: AsciiCell[] = []
  const [sr, sg, sb] = hexToRgb(params.fgColor)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = (row * cols + col) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]

      let l = luminance(r, g, b)
      l = applyBrightnessContrast(l, params.brightness, params.contrast)
      if (params.invert) l = 255 - l

      const charIdx = Math.floor((l / 255) * (charLen - 1))
      const char = charset[charIdx]

      if (params.colorMode === 'bw') {
        const v = Math.round(l)
        cells.push({ char, r: v, g: v, b: v })
      } else if (params.colorMode === 'single') {
        cells.push({ char, r: sr, g: sg, b: sb })
      } else {
        cells.push({ char, r, g, b })
      }
    }
  }

  return cells
}
