/**
 * Shared formatting utilities used across all pages.
 */
import { format, formatDistanceToNow, parseISO } from 'date-fns'

/** Format an ISO datetime string as "MMM d, yyyy HH:mm" */
export function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'MMM d, yyyy HH:mm')
  } catch {
    return iso
  }
}

/** Format an ISO datetime as relative time ("2 minutes ago") */
export function formatRelative(iso) {
  if (!iso) return '—'
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true })
  } catch {
    return iso
  }
}

/** Format a confidence score with one decimal and % symbol */
export function formatConfidence(val) {
  if (val == null) return '—'
  return `${Number(val).toFixed(1)}%`
}

/** Format bytes to human-readable size */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`
}

/** Format seconds to mm:ss */
export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Clamp a number to [min, max] */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

/** Return Tailwind color class based on confidence score */
export function confidenceColor(score) {
  if (score >= 70) return 'text-danger'
  if (score >= 40) return 'text-warning'
  return 'text-success'
}

/** Return a readable label for event source */
export function sourceLabel(source) {
  const map = { webcam: 'Webcam', upload: 'Upload', demo: 'Demo' }
  return map[source] || source
}

/** Day of week label (0=Sun) */
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
