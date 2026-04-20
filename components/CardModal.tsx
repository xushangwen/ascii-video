'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AsciiParams, CHARSETS } from '@/lib/asciiEngine'
import { setCardData } from '@/lib/cardStore'

interface Props {
  cardSvgRef: React.RefObject<SVGSVGElement | null>
  params: AsciiParams
  mediaSrc: string
  mediaType: 'video' | 'image'
  onClose: () => void
}

const TITLE_PRESETS = [
  'Every Frame in Characters.',
  'Reality, Rendered in Text.',
  'Noise Into Signal.',
  'The Art of Character.',
  'Visual Data, Textually.',
]

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

function generateDesc(params: AsciiParams): string {
  const name = Object.entries(CHARSETS).find(([, v]) => v === params.charset)?.[0] ?? 'custom'
  const mode = { bw: 'B&W', color: 'Color', single: 'Custom Tint' }[params.colorMode]
  return `${params.cols} columns · ${name} charset · ${mode} · ${params.fps}fps · ASCII.VIDEO`
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(' ')
  let line = ''
  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, x, y); y += lineH; line = word
    } else { line = test }
  }
  if (line) ctx.fillText(line, x, y)
}

export function CardModal({ cardSvgRef, params, mediaSrc, mediaType, onClose }: Props) {
  const router = useRouter()
  const [presetIdx, setPresetIdx] = useState(() => Math.floor(Math.random() * TITLE_PRESETS.length))
  const [title, setTitle] = useState(() => TITLE_PRESETS[Math.floor(Math.random() * TITLE_PRESETS.length)])
  const [desc, setDesc] = useState(() => generateDesc(params))
  const [downloading, setDownloading] = useState(false)

  function handleOpenPreview() {
    setCardData({ mediaSrc, mediaType, params, title, desc })
    router.push('/card')
  }

  function cycleTitle() {
    const next = (presetIdx + 1) % TITLE_PRESETS.length
    setPresetIdx(next)
    setTitle(TITLE_PRESETS[next])
  }


  async function handleDownload() {
    setDownloading(true)
    const CARD_W = 900
    const CARD_H = 1200
    const DPR = 2
    const PAD = 56

    const canvas = document.createElement('canvas')
    canvas.width = CARD_W * DPR
    canvas.height = CARD_H * DPR
    const ctx = canvas.getContext('2d')!
    ctx.scale(DPR, DPR)

    // 背景
    ctx.fillStyle = '#f5f5f3'
    ctx.fillRect(0, 0, CARD_W, CARD_H)

    // 从 live SVG 序列化当前帧
    const artH = CARD_H * 0.58
    const svgEl = cardSvgRef.current
    if (svgEl) {
      const str = new XMLSerializer().serializeToString(svgEl)
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(str)}`
      await new Promise<void>(resolve => {
        const img = new Image()
        img.onload = () => {
          const ar = img.width / img.height
          const maxW = CARD_W - PAD * 2
          const maxH = artH - PAD
          let dw = maxW, dh = dw / ar
          if (dh > maxH) { dh = maxH; dw = dh * ar }
          const dx = (CARD_W - dw) / 2
          const dy = PAD + (maxH - dh) / 2
          ctx.drawImage(img, dx, dy, dw, dh)
          resolve()
        }
        img.onerror = () => resolve()
        img.src = svgDataUrl
      })
    }

    // 分隔线
    const divY = artH + PAD * 0.5
    ctx.strokeStyle = '#ddd'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(PAD, divY); ctx.lineTo(CARD_W - PAD, divY); ctx.stroke()

    // 标题
    ctx.fillStyle = '#111'
    ctx.font = `700 38px "Space Grotesk", sans-serif`
    ctx.fillText(title, PAD, divY + 60, CARD_W - PAD * 2)

    // 描述（自动换行）
    ctx.fillStyle = '#888'
    ctx.font = `400 15px "Space Grotesk", sans-serif`
    wrapText(ctx, desc, PAD, divY + 96, CARD_W - PAD * 2, 22)

    // 四角 L 形装饰
    const BK = 28, INS = 30
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

    // 品牌
    ctx.fillStyle = '#bbb'
    ctx.font = `400 11px "Space Grotesk", sans-serif`
    ctx.letterSpacing = '0.15em'
    ctx.fillText('ASCII.VIDEO', PAD, CARD_H - INS - 6)
    ctx.letterSpacing = '0'

    canvas.toBlob(blob => {
      if (!blob) return
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `ascii-card-${Date.now()}.jpg`
      a.click()
      URL.revokeObjectURL(objectUrl)
      setDownloading(false)
    }, 'image/jpeg', 0.95)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-widest text-neutral-400 uppercase">Generate Card</span>
          <div className="flex items-center gap-3">
            <button
              onClick={cycleTitle}
              className="text-[11px] tracking-widest text-neutral-400 hover:text-neutral-100 uppercase transition-colors flex items-center gap-1"
              title="换个标题"
            >
              <i className="ri-refresh-line text-xs" /> Reshuffle
            </button>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 transition-colors">
              <i className="ri-close-line text-base" />
            </button>
          </div>
        </div>

        {/* 卡片预览 */}
        <div
          className="relative w-full select-none"
          style={{ background: '#f5f5f3', aspectRatio: '3/4', padding: '7%' }}
        >
          {/* 四角 L 形 */}
          {(['tl', 'tr', 'bl', 'br'] as const).map(p => (
            <div key={p} style={cornerStyle(p)} />
          ))}

          {/* ASCII 动态预览 */}
          <div style={{ height: '56%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <svg
              ref={cardSvgRef}
              preserveAspectRatio="xMidYMid meet"
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
          </div>

          {/* 分隔线 */}
          <div style={{ borderTop: '1px solid #e0e0e0', marginTop: '5%', marginBottom: '4%' }} />

          {/* 标题（可编辑） */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#111', fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 16, fontWeight: 700, lineHeight: 1.3,
              width: '100%', marginBottom: 6,
            }}
          />

          {/* 描述（可编辑） */}
          <textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            style={{
              background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              color: '#888', fontFamily: '"Space Grotesk", sans-serif',
              fontSize: 10, lineHeight: 1.5, width: '100%',
            }}
          />

          {/* 品牌标识 */}
          <div style={{
            position: 'absolute', bottom: 24, left: '7%',
            fontSize: 9, color: '#bbb', letterSpacing: '0.15em',
            textTransform: 'uppercase', fontFamily: '"Space Grotesk", sans-serif',
          }}>
            ASCII.VIDEO
          </div>
        </div>

        {/* 按钮组 */}
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 py-2.5 text-[12px] tracking-widest uppercase border border-neutral-200 text-white
              hover:bg-white hover:text-neutral-900 transition-colors flex items-center justify-center gap-2
              disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <i className={`text-xs ${downloading ? 'ri-loader-4-line animate-spin' : 'ri-image-2-line'}`} />
            {downloading ? 'Rendering...' : 'Save JPG'}
          </button>
          <button
            onClick={handleOpenPreview}
            disabled={!mediaSrc}
            title={!mediaSrc ? 'Not available in webcam mode' : ''}
            className="flex-1 py-2.5 text-[12px] tracking-widest uppercase border border-neutral-500 text-neutral-400
              hover:border-white hover:text-white transition-colors flex items-center justify-center gap-2
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <i className="ri-video-download-line text-xs" />
            Preview &amp; Video
          </button>
        </div>
      </div>
    </div>
  )
}
