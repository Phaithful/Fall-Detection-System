import React, { useRef, useEffect, useCallback, useState } from 'react'
import { CameraOff, RefreshCw } from 'lucide-react'
import { useDetectionStore } from '../../store/useDetectionStore'
import { drawSkeleton, clearCanvas, captureVideoFrame, drawFallFlash } from '../../utils/canvas'

const FRAME_INTERVAL_MS = 1000 / 5

export default function VideoPanel({ sendFrame, monitoring }) {
  const videoRef   = useRef(null)
  const canvasRef  = useRef(null)
  const scratchRef = useRef(document.createElement('canvas'))
  const animRef    = useRef(null)
  const intervalRef = useRef(null)
  const streamRef  = useRef(null)

  const keypoints    = useDetectionStore((s) => s.keypoints)
  const fallDetected = useDetectionStore((s) => s.fallDetected)
  const [camError, setCamError] = useState(null)
  const [camReady, setCamReady] = useState(false)

  const startCamera = useCallback(async () => {
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }, audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamReady(true)
      }
    } catch (err) {
      setCamError(err.message)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCamReady(false)
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      if (video.readyState >= 2) {
        canvas.width  = video.videoWidth  || 640
        canvas.height = video.videoHeight || 480
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        if (keypoints) drawSkeleton(ctx, keypoints, canvas.width, canvas.height, fallDetected)
        if (fallDetected) drawFallFlash(ctx, canvas.width, canvas.height, 0.15)
      }
      animRef.current = requestAnimationFrame(draw)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [keypoints, fallDetected])

  // Frame send loop
  useEffect(() => {
    if (monitoring && camReady) {
      intervalRef.current = setInterval(() => {
        if (!videoRef.current) return
        const b64 = captureVideoFrame(videoRef.current, scratchRef.current)
        sendFrame(b64, performance.now())
      }, FRAME_INTERVAL_MS)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [monitoring, camReady, sendFrame])

  useEffect(() => {
    startCamera()
    return () => { stopCamera(); cancelAnimationFrame(animRef.current) }
  }, [startCamera, stopCamera])

  return (
    <div className={`relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border-2 transition-colors duration-300
      ${fallDetected ? 'border-red-400' : 'border-slate-200'}`}
    >
      <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-0" aria-hidden />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" aria-label="Video feed with pose overlay" />

      {!camReady && !camError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Starting camera…</p>
        </div>
      )}

      {camError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-3 p-6">
          <CameraOff size={32} className="text-slate-300" strokeWidth={1.5} />
          <p className="text-sm font-medium text-slate-600">Camera unavailable</p>
          <p className="text-xs text-slate-400 text-center">{camError}</p>
          <button onClick={startCamera} className="btn-secondary text-xs">
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      )}

      {/* Monitoring badge */}
      {monitoring && camReady && (
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full border border-slate-200 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700">LIVE</span>
        </div>
      )}

      {fallDetected && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full">
          <span className="text-xs font-bold text-white tracking-wide">FALL DETECTED</span>
        </div>
      )}
    </div>
  )
}
