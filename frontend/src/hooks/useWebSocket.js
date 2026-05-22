/**
 * Custom hook that manages the WebSocket connection lifecycle and
 * routes incoming messages to the Zustand stores.
 */
import { useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { detectionSocket } from '../services/socket'
import { useAppStore } from '../store/useAppStore'
import { useDetectionStore } from '../store/useDetectionStore'

/**
 * @param {boolean} autoConnect - connect immediately on mount
 */
export function useWebSocket(autoConnect = false) {
  const pushAlert      = useAppStore((s) => s.pushAlert)
  const updateHealth   = useAppStore((s) => s.updateHealth)
  const setSystemStatus = useAppStore((s) => s.setSystemStatus)
  const fetchSummary   = useAppStore((s) => s.fetchSummary)

  const setConnected       = useDetectionStore((s) => s.setConnected)
  const processPoseUpdate  = useDetectionStore((s) => s.processPoseUpdate)
  const processFallDetected = useDetectionStore((s) => s.processFallDetected)
  const connected          = useDetectionStore((s) => s.connected)

  const unsubscribersRef = useRef([])

  const handleConnect = useCallback(() => {
    setConnected(true)
    setSystemStatus('active')
    toast.success('Connected to detection server', { id: 'ws-connect', duration: 2000 })
  }, [setConnected, setSystemStatus])

  const handleDisconnect = useCallback(() => {
    setConnected(false)
    setSystemStatus('idle')
  }, [setConnected, setSystemStatus])

  const handlePoseUpdate = useCallback((msg) => {
    processPoseUpdate(msg)
  }, [processPoseUpdate])

  const handleFallDetected = useCallback((msg) => {
    processFallDetected(msg)
    pushAlert(msg)
    fetchSummary()
    toast.error(`⚠ Fall detected! Confidence: ${msg.confidence?.toFixed(1)}%`, {
      duration: 8000,
      id: `fall-${msg.event_id}`,
    })
  }, [processFallDetected, pushAlert, fetchSummary])

  const handleHealth = useCallback((msg) => {
    updateHealth({ fps: msg.fps, cpu: msg.cpu, memory: msg.memory, latency_ms: msg.latency_ms })
  }, [updateHealth])

  useEffect(() => {
    const unsubs = [
      detectionSocket.on('connected',      handleConnect),
      detectionSocket.on('disconnected',   handleDisconnect),
      detectionSocket.on('pose_update',    handlePoseUpdate),
      detectionSocket.on('fall_detected',  handleFallDetected),
      detectionSocket.on('system_health',  handleHealth),
    ]
    unsubscribersRef.current = unsubs

    if (autoConnect) {
      detectionSocket.connect()
    }

    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }, [autoConnect, handleConnect, handleDisconnect, handlePoseUpdate, handleFallDetected, handleHealth])

  const connect = useCallback(() => detectionSocket.connect(), [])
  const disconnect = useCallback(() => detectionSocket.disconnect(), [])
  const sendFrame = useCallback((b64, ts) => detectionSocket.sendFrame(b64, ts), [])
  const sendSettings = useCallback((s) => detectionSocket.sendSettingsUpdate(s), [])

  return { connected, connect, disconnect, sendFrame, sendSettings }
}
