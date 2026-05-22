/**
 * Detection-specific state — live pose data, confidence, metrics, fall state.
 * Used primarily by the Monitor page.
 */
import { create } from 'zustand'

export const useDetectionStore = create((set, get) => ({
  // ── Connection ────────────────────────────────────────────────────────────
  connected: false,
  monitoring: false,
  source: 'webcam',          // 'webcam' | 'upload'

  // ── Live pose ─────────────────────────────────────────────────────────────
  keypoints: null,
  frameId: 0,

  // ── Motion metrics ────────────────────────────────────────────────────────
  bodyAngle: 0,
  comY: 0.5,
  velocity: 0,
  confidence: 0,

  // ── Fall state ────────────────────────────────────────────────────────────
  fallDetected: false,
  fallEvent: null,           // last fall_detected message
  detectionStatus: 'idle',   // 'idle' | 'monitoring' | 'fall'

  // ── FPS tracking ─────────────────────────────────────────────────────────
  fps: 0,
  _lastFrameTime: 0,
  _fpsBuffer: [],

  // ── Sensitivity ───────────────────────────────────────────────────────────
  sensitivityThreshold: 70,

  // ── Actions ───────────────────────────────────────────────────────────────

  setConnected: (v) => set({ connected: v }),

  setMonitoring: (v) =>
    set({ monitoring: v, detectionStatus: v ? 'monitoring' : 'idle' }),

  setSource: (source) => set({ source }),

  /** Called on each pose_update WebSocket message. */
  processPoseUpdate: (msg) => {
    const now = performance.now()
    const state = get()
    const elapsed = now - state._lastFrameTime
    const instantFps = elapsed > 0 ? 1000 / elapsed : 0
    const newBuffer = [...state._fpsBuffer, instantFps].slice(-15)
    const avgFps = newBuffer.reduce((s, v) => s + v, 0) / newBuffer.length

    set({
      keypoints: msg.keypoints,
      frameId: msg.frame_id,
      bodyAngle: msg.body_angle,
      comY: msg.com_y,
      velocity: msg.velocity,
      confidence: msg.confidence,
      fps: Math.round(avgFps),
      _lastFrameTime: now,
      _fpsBuffer: newBuffer,
    })
  },

  /** Called on fall_detected WebSocket message. */
  processFallDetected: (msg) => {
    set({
      fallDetected: true,
      fallEvent: msg,
      detectionStatus: 'fall',
      confidence: msg.confidence,
    })
  },

  /** Dismiss the current fall alert (called after the user acknowledges). */
  dismissFall: () =>
    set({
      fallDetected: false,
      fallEvent: null,
      detectionStatus: 'monitoring',
    }),

  setSensitivity: (threshold) => set({ sensitivityThreshold: threshold }),

  reset: () =>
    set({
      connected: false,
      monitoring: false,
      keypoints: null,
      frameId: 0,
      bodyAngle: 0,
      comY: 0.5,
      velocity: 0,
      confidence: 0,
      fallDetected: false,
      fallEvent: null,
      detectionStatus: 'idle',
      fps: 0,
    }),
}))
