import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useDetectionStore } from '../../store/useDetectionStore'
import { formatConfidence, formatDateTime } from '../../utils/formatters'
import alarmSound from '../../../alarm.wav'

export default function AlertOverlay({ audioEnabled = true }) {
  const fallDetected = useDetectionStore((s) => s.fallDetected)
  const fallEvent    = useDetectionStore((s) => s.fallEvent)
  const dismissFall  = useDetectionStore((s) => s.dismissFall)
  const audioRef     = useRef(null)

  useEffect(() => {
    const alarm = new Audio(alarmSound)
    alarm.loop = true
    audioRef.current = alarm
    return () => { alarm.pause(); audioRef.current = null }
  }, [])

  useEffect(() => {
    const alarm = audioRef.current
    if (!alarm) return
    if (fallDetected && audioEnabled) {
      alarm.currentTime = 0
      alarm.play().catch(() => {})
    } else {
      alarm.pause()
      alarm.currentTime = 0
    }
  }, [fallDetected, audioEnabled])

  return (
    <AnimatePresence>
      {fallDetected && (
        <>
          {/* Subtle red tint */}
          <motion.div
            className="fixed inset-0 bg-red-500/10 pointer-events-none z-40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismissFall}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl border border-red-200 w-full max-w-sm mx-4 overflow-hidden alert-ring"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-red-50 border-b border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle size={18} className="text-red-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800 leading-tight">Fall Detected</p>
                    <p className="text-xs text-red-500">Immediate attention required</p>
                  </div>
                </div>
                <button onClick={dismissFall} className="btn-icon text-red-400 hover:text-red-600 hover:bg-red-100">
                  <X size={16} />
                </button>
              </div>

              {/* Stats */}
              {fallEvent && (
                <div className="px-5 py-4 space-y-2">
                  {[
                    ['Confidence',  formatConfidence(fallEvent.confidence), 'text-red-600 font-bold'],
                    ['Body Angle',  `${fallEvent.body_angle?.toFixed(1)}°`, ''],
                    ['Event ID',    `#${fallEvent.event_id}`,               'font-mono'],
                    ['Time',        formatDateTime(fallEvent.timestamp),    ''],
                  ].map(([label, val, extra]) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-xs text-slate-500">{label}</span>
                      <span className={`text-xs font-medium text-slate-800 ${extra}`}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action */}
              <div className="px-5 pb-4">
                <button onClick={dismissFall} className="btn-danger w-full justify-center" aria-label="Acknowledge alert">
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
