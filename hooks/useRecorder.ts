'use client'
import { useRef, useState, useCallback } from 'react'

export function useRecorder(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const start = useCallback((fps = 30) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const stream = canvas.captureStream(fps)
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm'
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
    })

    chunksRef.current = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ascii-${Date.now()}.webm`
      a.click()
      URL.revokeObjectURL(url)
    }

    recorder.start()
    recorderRef.current = recorder
    setRecording(true)
    setElapsed(0)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
  }, [canvasRef])

  const stop = useCallback(() => {
    recorderRef.current?.stop()
    recorderRef.current = null
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setRecording(false)
    setElapsed(0)
  }, [])

  return { start, stop, recording, elapsed }
}
