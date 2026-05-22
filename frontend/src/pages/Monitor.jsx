import React, { useCallback, useEffect, useState } from 'react'
import { Play, Square, Sliders, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react'
import { useDetectionStore } from '../store/useDetectionStore'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAppStore } from '../store/useAppStore'
import VideoPanel from '../components/Monitor/VideoPanel'
import ConfidenceMeter from '../components/Monitor/ConfidenceMeter'
import MetricsPanel from '../components/Monitor/MetricsPanel'
import AlertOverlay from '../components/Monitor/AlertOverlay'
import { videoApi, systemApi } from '../services/api'
import toast from 'react-hot-toast'

export default function Monitor() {
  const { connected, sendFrame, connect, disconnect } = useWebSocket()

  // Connect WebSocket when Monitor page mounts; disconnect on unmount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const monitoring      = useDetectionStore((s) => s.monitoring)
  const detectionStatus = useDetectionStore((s) => s.detectionStatus)
  const confidence      = useDetectionStore((s) => s.confidence)
  const setMonitoring   = useDetectionStore((s) => s.setMonitoring)
  const setSensitivity  = useDetectionStore((s) => s.setSensitivity)
  const threshold       = useDetectionStore((s) => s.sensitivityThreshold)
  const fps             = useDetectionStore((s) => s.fps)
  const frameId         = useDetectionStore((s) => s.frameId)
  const [audio, setAudio] = useState(true)

  const handleToggle = useCallback(async () => {
    if (monitoring) {
      setMonitoring(false)
      videoApi.stopStream().catch(() => {})
      toast('Monitoring stopped', { icon: null })
    } else {
      // Start monitoring immediately — WebSocket frame sending is what matters.
      // The REST startStream call is informational only; don't block on it.
      setMonitoring(true)
      videoApi.startStream().catch(() => {})
      toast.success('Monitoring started')
      // Warn if MediaPipe is not installed on the backend
      systemApi.info().then(({ data }) => {
        if (data.mediapipe_version === 'not installed') {
          toast.error(
            'MediaPipe not installed — run: pip install mediapipe',
            { duration: 10000, id: 'mp-warn' }
          )
        }
      }).catch(() => {})
    }
  }, [monitoring, setMonitoring])

  const statusConfig = {
    idle:       { label: 'Idle',            dot: 'bg-slate-300',          text: 'text-slate-500' },
    monitoring: { label: 'Monitoring',      dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-700' },
    fall:       { label: 'Fall Detected',   dot: 'bg-red-500 animate-pulse', text: 'text-red-700' },
  }[detectionStatus] || { label: 'Idle', dot: 'bg-slate-300', text: 'text-slate-500' }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Live Monitor</h2>
          <p className="page-subtitle">Real-time pose estimation and fall detection</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {connected
              ? <><Wifi size={13} className="text-emerald-500" />Connected</>
              : <><WifiOff size={13} className="text-red-400" />Disconnected</>
            }
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
            ${detectionStatus === 'fall'
              ? 'bg-red-50 border-red-200 text-red-700'
              : detectionStatus === 'monitoring'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-slate-50 border-slate-200 text-slate-600'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            {statusConfig.label}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Video — 2 cols */}
        <div className="xl:col-span-2 space-y-3">
          <VideoPanel sendFrame={sendFrame} monitoring={monitoring} />

          {/* Controls bar */}
          <div className="card flex items-center gap-4 flex-wrap py-3">
            <button onClick={handleToggle}
              className={monitoring ? 'btn-danger' : 'btn-primary'}
              aria-label={monitoring ? 'Stop monitoring' : 'Start monitoring'}
            >
              {monitoring ? <><Square size={13} /> Stop</> : <><Play size={13} /> Start</>}
            </button>

            <button onClick={() => setAudio(a => !a)}
              className="btn-icon" title={audio ? 'Mute alerts' : 'Enable audio alerts'}
              aria-label={audio ? 'Disable audio alerts' : 'Enable audio alerts'}
            >
              {audio ? <Volume2 size={15} /> : <VolumeX size={15} className="text-slate-400" />}
            </button>

            <div className="flex items-center gap-2 flex-1 min-w-40">
              <Sliders size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500 whitespace-nowrap">Threshold</span>
              <input type="range" min="40" max="95" step="5" value={threshold}
                     onChange={e => setSensitivity(parseInt(e.target.value))}
                     className="flex-1 accent-blue-600 cursor-pointer h-1"
                     aria-label="Detection threshold" />
              <span className="text-xs font-mono text-slate-700 w-8 text-right">{threshold}%</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 ml-auto">
              <span>Frame <span className="font-mono text-slate-600">#{frameId}</span></span>
              <span><span className="font-mono text-slate-600">{fps}</span> fps</span>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-3">
          <div className="card">
            <h3 className="section-title">Confidence Score</h3>
            <ConfidenceMeter confidence={confidence} />
          </div>

          <div className="card">
            <h3 className="section-title">Motion Metrics</h3>
            <MetricsPanel />
          </div>
        </div>
      </div>

      <AlertOverlay audioEnabled={audio} />
    </div>
  )
}
