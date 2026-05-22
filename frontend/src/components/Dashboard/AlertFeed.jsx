import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ShieldCheck, Radio } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatRelative, formatConfidence } from '../../utils/formatters'

export default function AlertFeed() {
  const alertFeed = useAppStore((s) => s.alertFeed)

  return (
    <div className="card flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title mb-0">Alert Feed</h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Radio size={12} className="text-red-500 animate-pulse" />
          Live
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        <AnimatePresence initial={false}>
          {alertFeed.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-28 gap-2"
            >
              <ShieldCheck size={28} className="text-slate-200" strokeWidth={1.5} />
              <p className="text-xs text-slate-400">No alerts detected</p>
              <p className="text-[11px] text-slate-300">System is monitoring…</p>
            </motion.div>
          ) : (
            alertFeed.map((alert, i) => (
              <motion.div
                key={`${alert.event_id}-${i}`}
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 6 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 p-2.5 rounded-lg bg-red-50 border border-red-100"
              >
                <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-red-700">Fall Detected</span>
                    <span className="text-[10px] text-red-400 flex-shrink-0">
                      {formatRelative(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-600 mt-0.5">
                    Confidence: <span className="font-semibold">{formatConfidence(alert.confidence)}</span>
                    <span className="text-red-400 mx-1">·</span>
                    Event #{alert.event_id}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
