'use client'
import { useRef, useCallback, useState } from 'react'

export function useWebcam() {
  const streamRef = useRef<MediaStream | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async (videoEl: HTMLVideoElement) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      videoEl.srcObject = stream
      await videoEl.play()
      setActive(true)
      setError(null)
    } catch (err) {
      setError('摄像头访问被拒绝')
      console.error(err)
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setActive(false)
  }, [])

  return { start, stop, active, error }
}
