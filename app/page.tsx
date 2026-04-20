'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { AsciiParams, CHARSETS } from '@/lib/asciiEngine'
import { useWebcam } from '@/hooks/useWebcam'
import { useRecorder } from '@/hooks/useRecorder'
import { useAsciiRenderer } from '@/hooks/useAsciiRenderer'
import { VideoInput, VideoInputHandle, InputMode } from '@/components/VideoInput'
import { AsciiCanvas } from '@/components/AsciiSvg'
import { ControlsPanel } from '@/components/ControlsPanel'
import { ExportToolbar } from '@/components/ExportToolbar'
import { CardModal } from '@/components/CardModal'


const DEFAULT_PARAMS: AsciiParams = {
  cols: 140,
  fps: 30,
  brightness: 0,
  contrast: 0,
  invert: false,
  colorMode: 'bw',
  fgColor: '#000000',
  bgColor: '#ffffff',
  charset: CHARSETS.standard,
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cardSvgRef = useRef<SVGSVGElement>(null)
  const recordCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const videoInputRef = useRef<VideoInputHandle>(null)

  const [params, setParams] = useState<AsciiParams>(DEFAULT_PARAMS)
  const [inputMode, setInputMode] = useState<InputMode>('none')
  const [renderActive, setRenderActive] = useState(false)
  const [showCard, setShowCard] = useState(false)
  const [mediaSrc, setMediaSrc] = useState('')
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video')
  const [isDragging, setIsDragging] = useState(false)
  const dropUrlRef = useRef('')

  const webcam = useWebcam()
  const { start: startRecord, stop: stopRecord, recording, elapsed } = useRecorder(recordCanvasRef)

  useAsciiRenderer(
    videoRef, canvasRef, recordCanvasRef, previewContainerRef,
    params, renderActive, recording, cardSvgRef, imageRef
  )

  const handleModeChange = useCallback(async (mode: InputMode) => {
    if (mode === 'webcam') {
      webcam.stop()
      setRenderActive(false)
      setInputMode('webcam')
      setMediaSrc('')
      if (videoRef.current) {
        videoRef.current.src = ''
        await webcam.start(videoRef.current)
        setRenderActive(true)
      }
    } else if (mode === 'none') {
      webcam.stop()
      setRenderActive(false)
      setInputMode('none')
    } else if (mode === 'image') {
      webcam.stop()
      setRenderActive(false)
      setInputMode('image')
      if (videoRef.current) videoRef.current.src = ''
    } else {
      webcam.stop()
      setInputMode('file')
      if (imageRef.current) imageRef.current.src = ''
    }
  }, [webcam])

  function handleFileLoaded() { setRenderActive(true) }
  function handleSourceReady(src: string, type: 'video' | 'image') {
    setMediaSrc(src)
    setMediaType(type)
  }
  function updateParams(patch: Partial<AsciiParams>) { setParams(prev => ({ ...prev, ...patch })) }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    webcam.stop()
    if (dropUrlRef.current) URL.revokeObjectURL(dropUrlRef.current)
    const url = URL.createObjectURL(file)
    dropUrlRef.current = url
    if (file.type.startsWith('video/') && videoRef.current) {
      videoRef.current.src = url
      videoRef.current.loop = true
      videoRef.current.muted = true
      videoRef.current.play()
        .then(() => {
          setInputMode('file')
          setMediaSrc(url)
          setMediaType('video')
          setRenderActive(true)
        })
        .catch(console.error)
    } else if (file.type.startsWith('image/') && imageRef.current) {
      imageRef.current.onload = () => setRenderActive(true)
      imageRef.current.src = url
      setInputMode('image')
      setMediaSrc(url)
      setMediaType('image')
    }
  }

  useEffect(() => {
    if (inputMode === 'webcam' && webcam.active) setRenderActive(true)
  }, [inputMode, webcam.active])

  return (
    <div className="h-screen bg-neutral-50 text-neutral-900 flex flex-col overflow-hidden font-space">
      <header className="flex items-center justify-between px-6 py-3 border-b border-neutral-200 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono tracking-[0.3em] text-neutral-900 font-medium">ASCII.VIDEO</span>
          <span className="text-[9px] text-neutral-400 tracking-widest uppercase">Generator</span>
        </div>
        <VideoInput
          ref={videoInputRef}
          mode={inputMode}
          videoRef={videoRef}
          imageRef={imageRef}
          onModeChange={handleModeChange}
          onFileLoaded={handleFileLoaded}
          onSourceReady={handleSourceReady}
          webcamError={webcam.error}
        />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-52 shrink-0 border-r border-neutral-200 px-4 pt-4 pb-4 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-none">
            <ControlsPanel params={params} onChange={updateParams} />
          </div>
          <ExportToolbar
            canvasRef={canvasRef}
            recording={recording}
            elapsed={elapsed}
            onStartRecord={() => startRecord(params.fps)}
            onStopRecord={stopRecord}
            onGenerateCard={() => setShowCard(true)}
          />
        </aside>

        <main className="flex-1 relative overflow-hidden">
          {!renderActive && (
            <div
              className="absolute inset-0 select-none"
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false) }}
              onDrop={handleDrop}
            >
              {/* 中心内容 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-7">

                {/* 字符密度渐变展示条 */}
                <div className="font-mono text-[22px] tracking-[0.55em] text-neutral-300 leading-none">
                  .:-=+*#%@
                </div>

                {/* 拖拽投放区 */}
                <div className={`flex flex-col items-center gap-5 border border-dashed px-16 py-10 transition-all duration-200 ${
                  isDragging
                    ? 'border-neutral-500 bg-white/70 scale-[1.01]'
                    : 'border-neutral-300 bg-white/30'
                }`}>
                  <i className={`text-[32px] transition-colors duration-200 ${isDragging ? 'ri-drag-drop-2-fill text-neutral-500' : 'ri-upload-cloud-2-line text-neutral-300'}`} />

                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-[12px] tracking-[0.22em] uppercase text-neutral-500 font-medium">
                      {isDragging ? 'Release to convert' : 'Drop video or image here'}
                    </p>
                    <p className="text-[10px] tracking-widest text-neutral-400 uppercase">
                      or select a source
                    </p>
                  </div>

                  {/* 三个入口按钮 */}
                  <div className="flex items-center gap-2">
                    {[
                      { label: 'Webcam', icon: 'ri-camera-line', action: () => handleModeChange('webcam') },
                      { label: 'Video',  icon: 'ri-film-line',   action: () => videoInputRef.current?.triggerVideo() },
                      { label: 'Image',  icon: 'ri-image-line',  action: () => videoInputRef.current?.triggerImage() },
                    ].map(({ label, icon, action }) => (
                      <button
                        key={label}
                        onClick={action}
                        className="flex items-center gap-1.5 px-4 py-2 text-[11px] tracking-[0.18em] uppercase border border-neutral-300 text-neutral-500 hover:border-neutral-800 hover:text-neutral-800 transition-all"
                      >
                        <i className={`${icon} text-xs`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 品牌署名 */}
                <p className="text-[9px] tracking-[0.35em] text-neutral-300 uppercase">
                  ASCII.VIDEO · Real-time ASCII Art Generator
                </p>
              </div>
            </div>
          )}
          <AsciiCanvas ref={canvasRef} bgColor={params.bgColor} containerRef={previewContainerRef} />
        </main>
      </div>

      <video ref={videoRef} className="hidden" playsInline muted />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imageRef} className="hidden" alt="" />
      <canvas ref={recordCanvasRef} className="hidden" />

      {showCard && (
        <CardModal
          cardSvgRef={cardSvgRef}
          params={params}
          mediaSrc={mediaSrc}
          mediaType={mediaType}
          onClose={() => setShowCard(false)}
        />
      )}
    </div>
  )
}
