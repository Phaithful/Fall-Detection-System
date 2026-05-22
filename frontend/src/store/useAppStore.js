/**
 * Global application state — system status, alert feed, recent events, settings.
 */
import { create } from 'zustand'
import { analyticsApi, eventsApi, settingsApi, systemApi } from '../services/api'

export const useAppStore = create((set, get) => ({
  // ── System ────────────────────────────────────────────────────────────────
  systemStatus: 'idle',      // 'idle' | 'active' | 'alert'
  backendOnline: false,
  systemInfo: null,

  // ── Summary stats ─────────────────────────────────────────────────────────
  summary: {
    total_events: 0,
    total_falls: 0,
    today_events: 0,
    today_falls: 0,
    uptime_hours: 0,
    avg_confidence: 0,
    false_alarm_rate: 0,
  },

  // ── Alert feed (real-time WebSocket push) ─────────────────────────────────
  alertFeed: [],             // last 50 alerts

  // ── Recent events (REST) ──────────────────────────────────────────────────
  recentEvents: [],
  eventsLoading: false,

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: null,
  settingsLoading: false,

  // ── System health (WebSocket push) ───────────────────────────────────────
  health: { fps: 0, cpu: 0, memory: 0, latency_ms: 0 },

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Bootstraps all data on app load. */
  fetchInitialData: async () => {
    await Promise.allSettled([
      get().fetchSummary(),
      get().fetchRecentEvents(),
      get().fetchSettings(),
      get().checkBackend(),
    ])
  },

  checkBackend: async () => {
    try {
      const { data } = await systemApi.health()
      set({ backendOnline: true, systemInfo: data })
    } catch {
      set({ backendOnline: false })
    }
  },

  fetchSummary: async () => {
    try {
      const { data } = await analyticsApi.summary()
      set({ summary: data })
    } catch { /* handled by interceptor */ }
  },

  fetchRecentEvents: async () => {
    set({ eventsLoading: true })
    try {
      const { data } = await eventsApi.list({ page: 1, page_size: 10 })
      set({ recentEvents: data.items || [] })
    } catch {
      set({ recentEvents: [] })
    } finally {
      set({ eventsLoading: false })
    }
  },

  fetchSettings: async () => {
    set({ settingsLoading: true })
    try {
      const { data } = await settingsApi.get()
      set({ settings: data })
    } catch {
      set({ settings: null })
    } finally {
      set({ settingsLoading: false })
    }
  },

  updateSettings: async (patch) => {
    try {
      const { data } = await settingsApi.update(patch)
      set({ settings: data })
      return data
    } catch {
      return null
    }
  },

  /** Called by WebSocket handler when a fall is detected. */
  pushAlert: (alert) => {
    set((state) => ({
      alertFeed: [alert, ...state.alertFeed].slice(0, 50),
      systemStatus: 'alert',
    }))
    // Auto-clear alert status after 15 s
    setTimeout(() => {
      set((state) => {
        if (state.systemStatus === 'alert') return { systemStatus: 'active' }
        return {}
      })
    }, 15_000)
  },

  /** Called by WebSocket handler for system_health messages. */
  updateHealth: (health) => set({ health }),

  setSystemStatus: (status) => set({ systemStatus: status }),
}))
