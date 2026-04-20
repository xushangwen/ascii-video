'use client'
import { useEffect, useRef, useCallback } from 'react'
import { processFrame, AsciiParams, AsciiCell, CHAR_ASPECT, buildSvgBody } from '@/lib/asciiEngine'

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
  recording: boolean,
  cardSvgRef?: React.RefObject<SVGSVGElement | null>,
  imageRef?: React.RefObject<HTMLImageElement | null>
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
    const svgEl = svgRef.current
    if (!svgEl) { rafRef.current = requestAnimationFrame(renderFrame); return }

    // 确定有效媒体源（image 优先）
    const img = imageRef?.current
    const video = sourceRef.current
    let drawable: CanvasImageSource | null = null
    let sourceW = 0, sourceH = 0
    if (img && img.complete && img.naturalWidth > 0) {
      drawable = img; sourceW = img.naturalWidth; sourceH = img.naturalHeight
    } else if (video && video.readyState >= 2) {
      drawable = video; sourceW = video.videoWidth; sourceH = video.videoHeight
    }
    if (!drawable || !sourceW || !sourceH) {
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
    const sourceAR = sourceW / sourceH

    // 在容器内保持源比例
    let canvasW: number, canvasH: number
    if (cW / cH > sourceAR) {
      canvasH = cH; canvasW = cH * sourceAR
    } else {
      canvasW = cW; canvasH = cW / sourceAR
    }

    const CHAR_W = canvasW / cols
    const CHAR_H = CHAR_W / CHAR_ASPECT
    const FONT_SIZE = Math.round(CHAR_H)
    const rows = Math.max(1, Math.round(cols * CHAR_ASPECT / sourceAR))

    // 采样到低分辨率 canvas
    if (!samplerCanvasRef.current) {
      samplerCanvasRef.current = document.createElement('canvas')
    }
    const sampler = samplerCanvasRef.current
    sampler.width = cols
    sampler.height = rows
    const sCtx = sampler.getContext('2d', { willReadFrequently: true })!
    sCtx.drawImage(drawable, 0, 0, cols, rows)
    const imageData = sCtx.getImageData(0, 0, cols, rows)
    const cells = processFrame(imageData, p)

    // --- SVG 显示（向量，天然清晰）---
    svgEl.setAttribute('width', canvasW.toFixed(0))
    svgEl.setAttribute('height', canvasH.toFixed(0))
    svgEl.setAttribute('font-family', '"JetBrains Mono",monospace')
    svgEl.setAttribute('font-size', FONT_SIZE.toFixed(1))
    svgEl.innerHTML = buildSvgBody(cells, cols, rows, CHAR_W, CHAR_H, p.bgColor)

    // --- 卡片 SVG（与主 SVG 同步，用 viewBox 让 CSS 自由缩放）---
    if (cardSvgRef?.current) {
      const cardEl = cardSvgRef.current
      const svgW = Math.round(cols * CHAR_W)
      const svgH = Math.round(rows * CHAR_H)
      cardEl.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`)
      cardEl.setAttribute('font-family', '"JetBrains Mono",monospace')
      cardEl.setAttribute('font-size', FONT_SIZE.toFixed(1))
      cardEl.innerHTML = buildSvgBody(cells, cols, rows, CHAR_W, CHAR_H, p.bgColor)
    }

    // --- 隐藏 Canvas（仅录制时更新）---
    if (recordingRef.current && recordCanvasRef.current) {
      paintCellsToCanvas(recordCanvasRef.current, cells, cols, rows, CHAR_W, CHAR_H, FONT_SIZE, p.bgColor)
    }

    rafRef.current = requestAnimationFrame(renderFrame)
  }, [sourceRef, svgRef, recordCanvasRef, cardSvgRef, imageRef])

  useEffect(() => {
    if (active) {
      rafRef.current = requestAnimationFrame(renderFrame)
    } else {
      cancelAnimationFrame(rafRef.current)
    }
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, renderFrame])
}
