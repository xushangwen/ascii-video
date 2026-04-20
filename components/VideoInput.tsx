'use client'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export type InputMode = 'none' | 'file' | 'webcam' | 'image'

export interface VideoInputHandle {
  triggerVideo: () => void
  triggerImage: () => void
}

interface Props {
  mode: InputMode
  videoRef: React.RefObject<HTMLVideoElement | null>
  imageRef: React.RefObject<HTMLImageElement | null>
  onModeChange: (mode: InputMode) => void
  onFileLoaded: () => void
  onSourceReady: (src: string, type: 'video' | 'image') => void
  webcamError: string | null
}

export const VideoInput = forwardRef<VideoInputHandle, Props>(function VideoInput(
  { mode, videoRef, imageRef, onModeChange, onFileLoaded, onSourceReady, webcamError },
  ref
) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const videoUrlRef = useRef('')
  const imageUrlRef = useRef('')

  useImperativeHandle(ref, () => ({
    triggerVideo: () => fileInputRef.current?.click(),
    triggerImage: () => imageInputRef.current?.click(),
  }))

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    }
  }, [])

  function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !videoRef.current) return
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
    const url = URL.createObjectURL(file)
    videoUrlRef.current = url
    videoRef.current.src = url
    videoRef.current.loop = true
    videoRef.current.muted = true
    videoRef.current.play().then(onFileLoaded).catch(console.error)
    onModeChange('file')
    onSourceReady(url, 'video')
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !imageRef.current) return
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    const url = URL.createObjectURL(file)
    imageUrlRef.current = url
    imageRef.current.onload = onFileLoaded
    imageRef.current.src = url
    onModeChange('image')
    onSourceReady(url, 'image')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onModeChange(mode === 'webcam' ? 'none' : 'webcam')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-widest uppercase border transition-colors
          ${mode === 'webcam'
            ? 'border-neutral-900 text-neutral-900 bg-black/5'
            : 'border-neutral-300 text-neutral-500 hover:border-neutral-500 hover:text-neutral-700'}`}
      >
        <i className="ri-camera-line text-xs" />
        Webcam
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-widest uppercase border transition-colors
          ${mode === 'file'
            ? 'border-neutral-900 text-neutral-900 bg-black/5'
            : 'border-neutral-300 text-neutral-500 hover:border-neutral-500 hover:text-neutral-700'}`}
      >
        <i className="ri-film-line text-xs" />
        Video
      </button>

      <button
        onClick={() => imageInputRef.current?.click()}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] tracking-widest uppercase border transition-colors
          ${mode === 'image'
            ? 'border-neutral-900 text-neutral-900 bg-black/5'
            : 'border-neutral-300 text-neutral-500 hover:border-neutral-500 hover:text-neutral-700'}`}
      >
        <i className="ri-image-line text-xs" />
        Image
      </button>

      <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoFile} className="hidden" />
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />

      {webcamError && (
        <span className="text-[12px] text-red-400">{webcamError}</span>
      )}
    </div>
  )
})
