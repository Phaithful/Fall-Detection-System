import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Film, Percent } from 'lucide-react'
import { formatConfidence, formatDuration } from '../../utils/formatters'

export default function ResultsPanel({ result }) {
  if (!result) return null

  const fallRate = result.processed_frames > 0
    ? ((result.falls_detected / result.processed_frames) * 100).toFixed(1) : 0

  const stats = [
    { label: 'Falls Detected',    value: result.falls_detected,                    Icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100' },
    { label: 'Avg Confidence',    value: formatConfidence(result.overall_confidence), Icon: Percent,    color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
    { label: 'Frames Processed',  value: result.processed_frames,                  Icon: Film,         color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100' },
    { label: 'Duration',          value: formatDuration(result.duration_seconds),  Icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="card border-emerald-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
          <CheckCircle2 size={16} className="text-emerald-600" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Analysis Complete</p>
          <p className="text-xs text-slate-500">{result.processed_frames} frames · {formatDuration(result.duration_seconds)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, Icon, color, bg, border }) => (
          <div key={label} className={`p-3 rounded-lg ${bg} border ${border}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={13} className={color} strokeWidth={2} />
              <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{label}</span>
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {result.event_ids?.length > 0 && (
        <div className="mt-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center gap-2">
          <span className="text-xs text-slate-500">Logged event IDs:</span>
          <span className="text-xs font-mono text-red-600">
            {result.event_ids.map(id => `#${id}`).join(', ')}
          </span>
        </div>
      )}
    </motion.div>
  )
}
