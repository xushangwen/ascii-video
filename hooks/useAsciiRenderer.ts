'use client'
import { useEffect, useRef, useCallback } from 'react'
import { processFrame, AsciiParams, AsciiCell } from '@/lib/asciiEngine'

const CHAR_ASPECT = 0.6 // JetBrains Mono 字符宽高比

// XML 特殊字符转义（SVG 文本节点需要）
function esc(char: string): string {
  if (char === '&') return '&amp;'
  if (char === '<') return '&lt;'
  if (char === '>') return '&gt;'
  if (char === '"') return '&quot;'
  if (char === ' ') return '&#160;' // 非断行空格，防止 SVG 折叠空格
  return char
}

function buildSvgBody(
  cells: AsciiCell[],
  cols: number,
  rows: number,
  CHAR_W: number,
  CHAR_H: number,
  bgColor: string
): string {
  let s = `<rect width="100%" height="100%" fill="${bgColor}"/>`
  for (let row = 0; row < rows; row++) {
    const y = (row * CHAR_H).toFixed(2)
    s += `<text y="${y}" dominant-baseline="hanging" xml:space="preserve">`
    for (let col = 0; col < cols; col++) {
      const cell = cells[row * cols + col]
      if (!cell) continue
      const x = (col * CHAR_W).toFixed(2)
      s += `<tspan x="${x}" fill="rgb(${cell.r},${cell.g},${cell.b})">${esc(cell.char)}</tspan>`
    }
    s += '</text>'
  }
  return s
}

// 将相同 cell 数据渲染到 canvas（用于录制）
function paintCellsToCanvas(
  canvas: HTMLCanvasElement,
  cells: AsciiCell[],
  cols: number,
  rows: number,
  CHAR_W: number,
  CHAR_H: number,
  FONT_SIZE: number,
  bgColor: string
) {
  canvas.width = Math.round(cols * CHAR_W)
  canvas.height = Math.round(rows * CHAR_H)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`
  ctx.textBaseline = 'top'
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]
    ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
    ctx.fillText(cell.char, (i % cols) * CHAR_W, Math.floor(i / cols) * CHAR_H)
  }
}

export function useAsciiRenderer(
  sourceRef: React.RefObject<HTMLVideoElement | null>,
  svgRef: React.RefObject<SVGSVGElement | null>,
  recordCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
  params: AsciiParams,
  active: boolean,
  recording: boolean
) {
  const samplerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const paramsRef = useRef(params)
  const containerSizeRef = useRef({ width: 0, height: 0 })
  const recordingRef = useRef(recording)
  const lastFrameTimeRef = useRef(0)

  paramsRef.current = params
  recordingRef.current = recording

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const rect = entries[0].contentRect
      containerSizeRef.current = { width: rect.width, height: rect.height }
    })
    ro.observe(el)
    containerSizeRef.current = { width: el.clientWidth, height: el.clientHeight }
    return () => ro.disconnect()
  }, [containerRef])

  const renderFrame = useCallback(() => {
    const video = sourceRef.current
    const svgEl = svgRef.current
    if (!video || !svgEl || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(renderFrame)
      return
    }

    // 帧率限制
    const now = performance.now()
    const p = paramsRef.current
    const minInterval = 1000 / (p.fps || 30)
    if (now - lastFrameTimeRef.current < minInterval) {
      rafRef.current = requestAnimationFrame(renderFrame)
      return
    }
    lastFrameTimeRef.current = now

    const { width: cW, height: cH } = containerSizeRef.current
    if (!cW || !cH) {
      rafRef.current = requestAnimationFrame(renderFrame)
      return
    }

    const cols = p.cols
    const videoAR = video.videoWidth / video.videoHeight

    // 在容器内保持视频比例
    let canvasW: number, canvasH: number
    if (cW / cH > videoAR) {
      canvasH = cH
      canvasW = cH * videoAR
    } else {
      canvasW = cW
      canvasH = cW / videoAR
    }

    const CHAR_W = canvasW / cols
    const CHAR_H = CHAR_W / CHAR_ASPECT
    const FONT_SIZE = Math.round(CHAR_H)
    const rows = Math.max(1, Math.round(cols * CHAR_ASPECT / videoAR))

    // 采样到低分辨率 canvas
    if (!samplerCanvasRef.current) {
      samplerCanvasRef.current = document.createElement('canvas')
    }
    const sampler = samplerCanvasRef.current
    sampler.width = cols
    sampler.height = rows
    const sCtx = sampler.getContext('2d', { willReadFrequently: true })!
    sCtx.drawImage(video, 0, 0, cols, rows)
    const imageData = sCtx.getImageData(0, 0, cols, rows)
    const cells = processFrame(imageData, p)

    // --- SVG 显示（向量，天然清晰）---
    svgEl.setAttribute('width', canvasW.toFixed(0))
    svgEl.setAttribute('height', canvasH.toFixed(0))
    svgEl.setAttribute('font-family', '"JetBrains Mono",monospace')
    svgEl.setAttribute('font-size', FONT_SIZE.toFixed(1))
    svgEl.innerHTML = buildSvgBody(cells, cols, rows, CHAR_W, CHAR_H, p.bgColor)

    // --- 隐藏 Canvas（仅录制时更新）---
    if (recordingRef.current && recordCanvasRef.current) {
      paintCellsToCanvas(recordCanvasRef.current, cells, cols, rows, CHAR_W, CHAR_H, FONT_SIZE, p.bgColor)
    }

    rafRef.current = requestAnimationFrame(renderFrame)
  }, [sourceRef, svgRef, recordCanvasRef])

  useEffect(() => {
    if (active) {
      rafRef.current = requestAnimationFrame(renderFrame)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, renderFrame])
}
