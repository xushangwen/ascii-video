'use client'
import { useRef } from 'react'

export type InputMode = 'none' | 'file' | 'webcam'

interface Props {
  mode: InputMode
  videoRef: React.RefObject<HTMLVideoElement | null>
  onModeChange: (mode: InputMode) => void
  onFileLoaded: () => void
  webcamError: string | null
}

export function VideoInput({ mode, videoRef, onModeChange, onFileLoaded, webcamError }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !videoRef.current) return
    const url = URL.createObjectURL(file)
    videoRef.current.src = url
    videoRef.current.loop = true
    videoRef.current.muted = true
    videoRef.current.play().then(onFileLoaded)
    onModeChange('file')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onModeChange(mode === 'webcam' ? 'none' : 'webcam')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-widest uppercase border transition-colors
          ${mode === 'webcam'
            ? 'border-white text-white bg-white/10'
            : 'border-neutral-700 text-neutral-400 hover:border-neutral-400 hover:text-neutral-200'}`}
      >
        <i className="ri-camera-line text-xs" />
        Webcam
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-widest uppercase border transition-colors
          ${mode === 'file'
            ? 'border-white text-white bg-white/10'
            : 'border-neutral-700 text-neutral-400 hover:border-neutral-400 hover:text-neutral-200'}`}
      >
        <i className="ri-upload-2-line text-xs" />
        Upload
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFile}
        className="hidden"
      />

      {webcamError && (
        <span className="text-[12px] text-red-400">{webcamError}</span>
      )}
    </div>
  )
}
