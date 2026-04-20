'use client'
import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCardData } from '@/lib/cardStore'
import { processFrame, CHAR_ASPECT, buildSvgBody } from '@/lib/asciiEngine'

const CARD_W = 900
const CARD_H = 1200
const PAD = 56
const INS = 30
const BK = 28


function cornerStyle(pos: 'tl' | 'tr' | 'bl' | 'br'): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute', width: 20, height: 20,
    borderColor: '#999', borderStyle: 'solid', borderWidth: 0,
  }
  if (pos === 'tl') return { ...base, top: 22, left: 22, borderTopWidth: 1.5, borderLeftWidth: 1.5 }
  if (pos === 'tr') return { ...base, top: 22, right: 22, borderTopWidth: 1.5, borderRightWidth: 1.5 }
  if (pos === 'bl') return { ...base, bottom: 22, left: 22, borderBottomWidth: 1.5, borderLeftWidth: 1.5 }
  return { ...base, bottom: 22, right: 22, borderBottomWidth: 1.5, borderRightWidth: 1.5 }
}

export default function CardPreviewPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const cardSvgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const samplerRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [recording, setRecording] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const cardData = getCardData()

  // 加载媒体源
  useEffect(() => {
    if (!cardData) return
    if (cardData.mediaType === 'video') {
      const v = videoRef.current
      if (!v) return
      v.src = cardData.mediaSrc
      v.loop = true
      v.muted = true
      v.play().catch(() => {})
    } else {
      const img = imageRef.current
      if (img) img.src = cardData.mediaSrc
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 渲染循环
  useEffect(() => {
    if (!cardData) return
    const canvas = canvasRef.current
    if (!canvas) return

    const params = cardData.params
    canvas.width = CARD_W * 2
    canvas.height = CARD_H * 2
    const ctx = canvas.getContext('2d')!
    ctx.scale(2, 2)

    const minInterval = 1000 / Math.max(params.fps, 1)
    let lastTime = 0

    function frame(now: number) {
      const svgEl = cardSvgRef.current
      if (!svgEl) { rafRef.current = requestAnimationFrame(frame); return }

      if (now - lastTime < minInterval) { rafRef.current = requestAnimationFrame(frame); return }

      // 确定有效媒体源
      let drawable: CanvasImageSource | null = null
      let sourceW = 0, sourceH = 0
      if (cardData!.mediaType === 'image') {
        const img = imageRef.current
        if (img && img.complete && img.naturalWidth > 0) {
          drawable = img; sourceW = img.naturalWidth; sourceH = img.naturalHeight
        }
      } else {
        const v = videoRef.current
        if (v && v.readyState >= 2) {
          drawable = v; sourceW = v.videoWidth; sourceH = v.videoHeight
        }
      }
      if (!drawable || !sourceW || !sourceH) { rafRef.current = requestAnimationFrame(frame); return }
      lastTime = now

      const cols = params.cols
      const sourceAR = sourceW / sourceH
      const artAreaW = CARD_W - PAD * 2
      const artAreaH = CARD_H * 0.58 - PAD
      let artW = artAreaW, artH = artW / sourceAR
      if (artH > artAreaH) { artH = artAreaH; artW = artH * sourceAR }

      const CHAR_W = artW / cols
      const CHAR_H = CHAR_W / CHAR_ASPECT
      const FONT_SIZE = Math.round(CHAR_H)
      const rows = Math.max(1, Math.round(cols * CHAR_ASPECT / sourceAR))

      if (!samplerRef.current) samplerRef.current = document.createElement('canvas')
      const sampler = samplerRef.current
      sampler.width = cols; sampler.height = rows
      const sCtx = sampler.getContext('2d', { willReadFrequently: true })!
      sCtx.drawImage(drawable, 0, 0, cols, rows)
      const cells = processFrame(sCtx.getImageData(0, 0, cols, rows), params)

      // 更新展示用 SVG
      const svgW = Math.round(cols * CHAR_W)
      const svgH = Math.round(rows * CHAR_H)
      svgEl.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`)
      svgEl.setAttribute('font-family', '"JetBrains Mono",monospace')
      svgEl.setAttribute('font-size', FONT_SIZE.toFixed(1))
      svgEl.innerHTML = buildSvgBody(cells, cols, rows, CHAR_W, CHAR_H, params.bgColor)

      // 绘制完整卡片到录制 canvas
      const artOffX = PAD + (artAreaW - artW) / 2
      const artOffY = PAD + (artAreaH - artH) / 2
      ctx.fillStyle = '#f5f5f3'
      ctx.fillRect(0, 0, CARD_W, CARD_H)
      ctx.fillStyle = params.bgColor
      ctx.fillRect(artOffX, artOffY, artW, artH)
      ctx.font = `${FONT_SIZE}px "JetBrains Mono", monospace`
      ctx.textBaseline = 'top'
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i]
        ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
        ctx.fillText(cell.char, artOffX + (i % cols) * CHAR_W, artOffY + Math.floor(i / cols) * CHAR_H)
      }

      const divY = CARD_H * 0.58 + PAD * 0.5
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(PAD, divY); ctx.lineTo(CARD_W - PAD, divY); ctx.stroke()

      ctx.fillStyle = '#111'
      ctx.font = `700 38px "Space Grotesk", sans-serif`
      ctx.fillText(cardData!.title, PAD, divY + 60, CARD_W - PAD * 2)

      ctx.fillStyle = '#888'
      ctx.font = `400 15px "Space Grotesk", sans-serif`
      // 简单换行
      const words = cardData!.desc.split(' ')
      let line = '', lineY = divY + 96
      for (const word of words) {
        const test = line ? line + ' ' + word : word
        if (ctx.measureText(test).width > CARD_W - PAD * 2) {
          ctx.fillText(line, PAD, lineY); lineY += 22; line = word
        } else { line = test }
      }
      if (line) ctx.fillText(line, PAD, lineY)

      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1.5
      ;[
        [[INS + BK, INS], [INS, INS], [INS, INS + BK]],
        [[CARD_W - INS - BK, INS], [CARD_W - INS, INS], [CARD_W - INS, INS + BK]],
        [[INS + BK, CARD_H - INS], [INS, CARD_H - INS], [INS, CARD_H - INS - BK]],
        [[CARD_W - INS - BK, CARD_H - INS], [CARD_W - INS, CARD_H - INS], [CARD_W - INS, CARD_H - INS - BK]],
      ].forEach(pts => {
        ctx.beginPath()
        ctx.moveTo(pts[0][0], pts[0][1])
        ctx.lineTo(pts[1][0], pts[1][1])
        ctx.lineTo(pts[2][0], pts[2][1])
        ctx.stroke()
      })

      ctx.fillStyle = '#bbb'
      ctx.font = `400 11px "Space Grotesk", sans-serif`
      ctx.letterSpacing = '0.15em'
      ctx.fillText('ASCII.VIDEO', PAD, CARD_H - INS - 6)
      ctx.letterSpacing = '0'

      rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [cardData]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas || recording) return
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType: mime })
    recorderRef.current = recorder
    chunksRef.current = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `ascii-card-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(objectUrl)
      setRecording(false)
      setCountdown(0)
    }
    recorder.start()
    setRecording(true)
    let n = 8
    setCountdown(n)
    const timer = setInterval(() => {
      n--
      setCountdown(n)
      if (n <= 0) { clearInterval(timer); recorder.stop() }
    }, 1000)
  }

  if (!cardData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-space">
        <div className="text-center">
          <p className="text-neutral-400 text-sm mb-4">No card data found.</p>
          <button onClick={() => router.push('/')} className="text-sm text-neutral-500 underline">
            ← Go back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white flex overflow-hidden font-space">

      {/* 卡片区：铺满整屏，居中展示 */}
      <div className="flex-1 flex items-center justify-center bg-white overflow-hidden p-6">
        <div
          className="relative select-none shadow-2xl"
          style={{
            background: '#f5f5f3',
            aspectRatio: '3/4',
            height: 'min(calc(100vh - 48px), 860px)',
            padding: '7%',
          }}
        >
          {(['tl', 'tr', 'bl', 'br'] as const).map(p => (
            <div key={p} style={cornerStyle(p)} />
          ))}

          <div style={{ height: '56%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <svg
              ref={cardSvgRef}
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>

          <div style={{ borderTop: '1px solid #e0e0e0', marginTop: '5%', marginBottom: '4%' }} />

          <div style={{
            color: '#111', fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 16, fontWeight: 700, lineHeight: 1.3, marginBottom: 6,
          }}>
            {cardData.title}
          </div>

          <div style={{
            color: '#888', fontFamily: '"Space Grotesk", sans-serif',
            fontSize: 10, lineHeight: 1.5,
          }}>
            {cardData.desc}
          </div>

          <div style={{
            position: 'absolute', bottom: 20, left: '7%',
            fontSize: 9, color: '#bbb', letterSpacing: '0.15em',
            textTransform: 'uppercase', fontFamily: '"Space Grotesk", sans-serif',
          }}>
            ASCII.VIDEO
          </div>
        </div>
      </div>

      {/* 右侧操作栏 */}
      <div className="w-48 shrink-0 border-l border-neutral-200 flex flex-col justify-between p-6">
        <div>
          <p className="text-[9px] tracking-widest text-neutral-400 uppercase mb-6">ASCII.VIDEO</p>
          <p className="text-[11px] text-neutral-500 leading-relaxed mb-1">{cardData.title}</p>
          <p className="text-[9px] text-neutral-300 leading-relaxed">{cardData.desc}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleDownload}
            disabled={recording}
            className="w-full py-2.5 text-[11px] tracking-widest uppercase border border-black text-black
              hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className={`text-xs ${recording ? 'ri-loader-4-line animate-spin' : 'ri-video-download-line'}`} />
            {recording ? `${countdown}s…` : 'Download Video'}
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full py-2 text-[11px] tracking-widest uppercase border border-neutral-200
              text-neutral-400 hover:border-neutral-400 hover:text-neutral-700 transition-colors flex items-center justify-center gap-2"
          >
            <i className="ri-arrow-left-line text-xs" /> Back
          </button>
        </div>
      </div>

      <video ref={videoRef} className="hidden" playsInline muted loop />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} className="hidden" alt="" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
