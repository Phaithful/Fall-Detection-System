/**
 * Axios API client — all REST communication with the FastAPI backend.
 */
import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Global error interceptor — only toasts on actual server errors (4xx/5xx),
// not on network-level failures (backend starting up, connection refused).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with an error status — show it
      const msg =
        error.response.data?.detail ||
        error.response.data?.message ||
        `Error ${error.response.status}`
      toast.error(String(msg).slice(0, 120))
    }
    // Network errors (no response) are silently rejected so callers can
    // handle them or ignore them without flooding the UI with toasts.
    return Promise.reject(error)
  },
)

// ── Events ──────────────────────────────────────────────────────────────────
export const eventsApi = {
  list: (params) => api.get('/api/events', { params }),
  get:  (id)     => api.get(`/api/events/${id}`),
  updateStatus: (id, status) => api.patch(`/api/events/${id}/status`, null, { params: { status } }),
  delete: (id)   => api.delete(`/api/events/${id}`),
  exportCsv: ()  => `${BASE_URL}/api/events/export/csv`,
}

// ── Video ────────────────────────────────────────────────────────────────────
export const videoApi = {
  upload:  (formData, onProgress) =>
    api.post('/api/video/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    }),
  analyze: (videoId) => api.post(`/api/video/analyze/${videoId}`),
  status:  (videoId) => api.get(`/api/video/status/${videoId}`),
  results: (videoId) => api.get(`/api/video/results/${videoId}`),
  startStream: () => api.post('/api/video/stream/start'),
  stopStream:  () => api.post('/api/video/stream/stop'),
}

// ── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  summary:        ()       => api.get('/api/analytics/summary'),
  fallsOverTime:  (params) => api.get('/api/analytics/falls-over-time', { params }),
  confidenceDist: ()       => api.get('/api/analytics/confidence-dist'),
  performance:    (params) => api.get('/api/analytics/performance', { params }),
  heatmap:        (params) => api.get('/api/analytics/heatmap', { params }),
  performanceSeries: (params) => api.get('/api/analytics/performance-series', { params }),
}

// ── Settings ─────────────────────────────────────────────────────────────────
export const settingsApi = {
  get:         ()     => api.get('/api/settings'),
  update:      (data) => api.put('/api/settings', data),
  retrainModel: ()    => api.post('/api/settings/ml/retrain'),
}

// ── System ───────────────────────────────────────────────────────────────────
export const systemApi = {
  info:   () => api.get('/api/system/info'),
  health: () => api.get('/api/system/health'),
}

export default api
