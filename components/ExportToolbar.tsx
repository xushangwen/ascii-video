'use client'

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  recording: boolean
  elapsed: number
  onStartRecord: () => void
  onStopRecord: () => void
  onGenerateCard: () => void
}

export function ExportToolbar({ canvasRef, recording, elapsed, onStartRecord, onStopRecord, onGenerateCard }: Props) {
  function handleScreenshot() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => {
      if (!blob) return
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = `ascii-${Date.now()}.jpg`
      a.click()
      URL.revokeObjectURL(objectUrl)
    }, 'image/jpeg', 0.95)
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

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
            ? 'border-red-500 text-red-500 hover:border-red-400'
            : 'border-neutral-300 text-neutral-500 hover:border-neutral-900 hover:text-neutral-900'}`}
      >
        <i className={`text-xs ${recording ? 'ri-stop-circle-line' : 'ri-record-circle-line'}`} />
        {recording ? (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
            {mm}:{ss}
          </span>
        ) : 'Record'}
      </button>
    </div>
  )
}
