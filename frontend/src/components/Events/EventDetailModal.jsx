import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, CheckCircle2, Video, Hash } from 'lucide-react'
import { formatDateTime, formatConfidence, sourceLabel } from '../../utils/formatters'

export default function EventDetailModal({ event, onClose }) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px] p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-xl border border-slate-200 w-full max-w-md overflow-hidden shadow-card-md"
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-5 py-3.5 border-b
              ${event.is_fall ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className="flex items-center gap-2.5">
                {event.is_fall
                  ? <AlertTriangle size={16} className="text-red-600" strokeWidth={2.5} />
                  : <CheckCircle2  size={16} className="text-emerald-600" strokeWidth={2.5} />
                }
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {event.is_fall ? 'Fall Event' : 'No Fall'} <span className="font-mono text-slate-400">#{event.id}</span>
                  </p>
                  <p className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</p>
                </div>
              </div>
              <button onClick={onClose} className="btn-icon" aria-label="Close">
                <X size={15} />
              </button>
            </div>

            {/* Stat grid */}
            <div className="px-5 py-4 grid grid-cols-2 gap-2.5">
              {[
                ['Confidence', formatConfidence(event.confidence), event.is_fall ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'],
                ['Body Angle', `${event.body_angle?.toFixed(1)}°`, ''],
                ['Velocity',   event.velocity?.toFixed(4),         'font-mono'],
                ['Acceleration', event.acceleration?.toFixed(4),   'font-mono'],
                ['Source',     sourceLabel(event.source),          ''],
                ['Frame',      `#${event.frame_number}`,           'font-mono'],
              ].map(([label, val, extra]) => (
                <div key={label} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">{label}</p>
                  <p className={`text-sm text-slate-800 ${extra}`}>{val ?? '—'}</p>
                </div>
              ))}
            </div>

            {/* Status + video */}
            <div className="px-5 pb-4 space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500">Review status</span>
                <span className={`badge ${
                  event.status === 'confirmed'   ? 'badge-fall'    :
                  event.status === 'false_alarm' ? 'badge-warning' : 'badge-neutral'
                }`}>{event.status}</span>
              </div>

              {event.video_filename && (
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <Video size={13} className="text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-600 font-mono truncate">{event.video_filename}</span>
                </div>
              )}

              {/* Keypoints sample */}
              {event.keypoints_json && (() => {
                try {
                  const kp   = JSON.parse(event.keypoints_json)
                  const keys = Object.keys(kp).slice(0, 6)
                  return (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Keypoints (sample)</p>
                      <div className="grid grid-cols-3 gap-1">
                        {keys.map(k => (
                          <div key={k} className="bg-slate-50 rounded px-2 py-1.5 border border-slate-100">
                            <p className="text-[9px] text-slate-400 truncate">{k}</p>
                            <p className="text-[10px] font-mono text-slate-700">
                              {kp[k].slice(0, 2).map(v => v.toFixed(2)).join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                } catch { return null }
              })()}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
              <button onClick={onClose} className="btn-secondary">Close</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
