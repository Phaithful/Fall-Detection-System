/**
 * Periodically polls backend /api/system/health and exposes live metrics.
 */
import { useState, useEffect } from 'react'
import { systemApi } from '../services/api'

/**
 * @param {number} intervalMs - polling interval (default 5000 ms)
 * @returns {{ online: boolean, cpu: number, memory: number, wsClients: number }}
 */
export function useSystemHealth(intervalMs = 5000) {
  const [health, setHealth] = useState({
    online: false,
    cpu: 0,
    memory: 0,
    wsClients: 0,
  })

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const { data } = await systemApi.health()
        if (!cancelled) {
          setHealth({
            online: true,
            cpu: data.cpu_percent ?? 0,
            memory: data.memory_percent ?? 0,
            wsClients: data.ws_clients ?? 0,
          })
        }
      } catch {
        if (!cancelled) setHealth((prev) => ({ ...prev, online: false }))
      }
    }

    poll()
    const id = setInterval(poll, intervalMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [intervalMs])

  return health
}
