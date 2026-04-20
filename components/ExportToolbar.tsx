'use client'

interface Props {
  svgRef: React.RefObject<SVGSVGElement | null>
  recording: boolean
  onStartRecord: () => void
  onStopRecord: () => void
  onGenerateCard: () => void
}

export function ExportToolbar({ svgRef, recording, onStartRecord, onStopRecord, onGenerateCard }: Props) {
  function handleScreenshot() {
    const svgEl = svgRef.current
    if (!svgEl) return

    const w = svgEl.width.baseVal.value
    const h = svgEl.height.baseVal.value
    const svgString = new XMLSerializer().serializeToString(svgEl)
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    // SVG → Canvas → JPEG（macOS QuickLook 兼容）
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      canvas.toBlob(jpegBlob => {
        if (!jpegBlob) return
        const objectUrl = URL.createObjectURL(jpegBlob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = `ascii-${Date.now()}.jpg`
        a.click()
        URL.revokeObjectURL(objectUrl)
      }, 'image/jpeg', 0.95)
    }
    img.src = url
  }

  return (
    <div className="flex flex-col gap-2 pt-4 border-t border-neutral-200">
      <button
        onClick={onGenerateCard}
        className="w-full py-2 text-[12px] tracking-widest uppercase border border-neutral-900 text-neutral-900
          hover:bg-neutral-900 hover:text-white transition-colors flex items-center justify-center gap-2"
      >
        <i className="ri-layout-masonry-line text-xs" />
        Generate Card
      </button>
      <button
        onClick={handleScreenshot}
        className="w-full py-2 text-[12px] tracking-widest uppercase border border-neutral-300
          text-neutral-500 hover:border-neutral-900 hover:text-neutral-900 transition-colors flex items-center justify-center gap-2"
      >
        <i className="ri-camera-line text-xs" />
        Screenshot
      </button>
      <button
        onClick={recording ? onStopRecord : onStartRecord}
        className={`w-full py-2 text-[12px] tracking-widest uppercase border transition-colors flex items-center justify-center gap-2
          ${recording
            ? 'border-red-500 text-red-500 animate-pulse hover:border-red-400'
            : 'border-neutral-300 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900'}`}
      >
        <i className={`text-xs ${recording ? 'ri-stop-circle-line' : 'ri-record-circle-line'}`} />
        {recording ? 'Stop Rec' : 'Record'}
      </button>
    </div>
  )
}
