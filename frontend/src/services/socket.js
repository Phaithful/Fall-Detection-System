/**
 * WebSocket service for real-time detection stream.
 * Exposes a singleton that the custom useWebSocket hook consumes.
 */

const WS_URL = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/ws/detection'

class DetectionSocket {
  constructor() {
    this._ws = null
    this._listeners = {}
    this._reconnectDelay = 2000
    this._reconnectTimer = null
    this._shouldConnect = false
    this._pingInterval = null
  }

  connect() {
    this._shouldConnect = true
    this._open()
  }

  disconnect() {
    this._shouldConnect = false
    clearTimeout(this._reconnectTimer)
    clearInterval(this._pingInterval)
    if (this._ws) {
      this._ws.close(1000, 'Client disconnect')
      this._ws = null
    }
  }

  sendFrame(base64Data, timestamp) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'frame', data: base64Data, timestamp }))
    }
  }

  sendSettingsUpdate(settings) {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify({ type: 'update_settings', ...settings }))
    }
  }

  on(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(handler)
    return () => this.off(event, handler)
  }

  off(event, handler) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter((h) => h !== handler)
    }
  }

  get connected() {
    return this._ws?.readyState === WebSocket.OPEN
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _open() {
    if (this._ws) return
    try {
      this._ws = new WebSocket(WS_URL)
      this._ws.onopen    = () => this._handleOpen()
      this._ws.onmessage = (e) => this._handleMessage(e)
      this._ws.onclose   = (e) => this._handleClose(e)
      this._ws.onerror   = (e) => this._emit('error', e)
    } catch (err) {
      console.error('[DetectionSocket] Connect error:', err)
      this._scheduleReconnect()
    }
  }

  _handleOpen() {
    this._emit('connected', null)
    // Keep-alive ping every 25s
    this._pingInterval = setInterval(() => {
      if (this._ws?.readyState === WebSocket.OPEN) {
        this._ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25_000)
  }

  _handleMessage(event) {
    try {
      const msg = JSON.parse(event.data)
      this._emit(msg.type, msg)
      this._emit('*', msg)    // wildcard listener
    } catch {
      // ignore malformed messages
    }
  }

  _handleClose(event) {
    clearInterval(this._pingInterval)
    this._ws = null
    this._emit('disconnected', event)
    if (this._shouldConnect) this._scheduleReconnect()
  }

  _scheduleReconnect() {
    this._reconnectTimer = setTimeout(() => {
      if (this._shouldConnect) this._open()
    }, this._reconnectDelay)
  }

  _emit(event, data) {
    ;(this._listeners[event] || []).forEach((h) => {
      try { h(data) } catch { /* ignore listener errors */ }
    })
  }
}

export const detectionSocket = new DetectionSocket()
