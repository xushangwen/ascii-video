'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { AsciiParams, CHARSETS } from '@/lib/asciiEngine'
import { useWebcam } from '@/hooks/useWebcam'
import { useRecorder } from '@/hooks/useRecorder'
import { useAsciiRenderer } from '@/hooks/useAsciiRenderer'
import { VideoInput, InputMode } from '@/components/VideoInput'
import { AsciiSvg } from '@/components/AsciiSvg'
import { ControlsPanel } from '@/components/ControlsPanel'
import { ExportToolbar } from '@/components/ExportToolbar'

const DEFAULT_PARAMS: AsciiParams = {
  cols: 140,
  fps: 30,
  brightness: 0,
  contrast: 0,
  invert: false,
  colorMode: 'bw',
  fgColor: '#ffffff',
  bgColor: '#000000',
  charset: CHARSETS.standard,
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const recordCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const [params, setParams] = useState<AsciiParams>(DEFAULT_PARAMS)
  const [inputMode, setInputMode] = useState<InputMode>('none')
  const [renderActive, setRenderActive] = useState(false)

  const webcam = useWebcam()
  const { start: startRecord, stop: stopRecord, recording } = useRecorder(recordCanvasRef)

  useAsciiRenderer(
    videoRef, svgRef, recordCanvasRef, previewContainerRef,
    params, renderActive, recording
  )

  const handleModeChange = useCallback(async (mode: InputMode) => {
    if (mode === 'webcam') {
      webcam.stop()
      setRenderActive(false)
      setInputMode('webcam')
      if (videoRef.current) {
        videoRef.current.src = ''
        await webcam.start(videoRef.current)
        setRenderActive(true)
      }
    } else if (mode === 'none') {
      webcam.stop()
      setRenderActive(false)
      setInputMode('none')
    } else {
      webcam.stop()
      setInputMode('file')
    }
  }, [webcam])

  function handleFileLoaded() {
    setRenderActive(true)
  }

  function updateParams(patch: Partial<AsciiParams>) {
    setParams(prev => ({ ...prev, ...patch }))
  }

  useEffect(() => {
    if (inputMode === 'webcam' && webcam.active) {
      setRenderActive(true)
    }
  }, [inputMode, webcam.active])

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden font-space">
      <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tracking-[0.3em] text-white font-medium">ASCII.VIDEO</span>
          <span className="text-[9px] text-neutral-600 tracking-widest uppercase">Generator</span>
        </div>
        <VideoInput
          mode={inputMode}
          videoRef={videoRef}
          onModeChange={handleModeChange}
          onFileLoaded={handleFileLoaded}
          webcamError={webcam.error}
        />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 shrink-0 border-r border-neutral-800 px-4 pt-4 pb-4 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-none">
            <ControlsPanel params={params} onChange={updateParams} />
          </div>
          <ExportToolbar
            svgRef={svgRef}
            recording={recording}
            onStartRecord={startRecord}
            onStopRecord={stopRecord}
          />
        </aside>

        <main className="flex-1 relative overflow-hidden">
          {!renderActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="font-mono text-[9px] text-neutral-800 leading-relaxed text-center select-none">
                {[' .:-=+*#%@ .:-=+*#%@','@#%*+=-:.  @#%*+=-:.'].map((r, i) => <div key={i}>{r}</div>)}
              </div>
              <p className="text-[10px] tracking-widest text-neutral-700 uppercase mt-4">
                Select Webcam or Upload to begin
              </p>
            </div>
          )}
          <AsciiSvg
            ref={svgRef}
            bgColor={params.bgColor}
            containerRef={previewContainerRef}
          />
        </main>
      </div>

      <video ref={videoRef} className="hidden" playsInline muted />
      {/* 隐藏 canvas 供录制用 */}
      <canvas ref={recordCanvasRef} className="hidden" />
    </div>
  )
}
