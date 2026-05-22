import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Film, AlertTriangle, Clock } from 'lucide-react'
import { formatDuration, formatConfidence } from '../../utils/formatters'

export default function AnnotatedFrames({ frames = [] }) {
  const [selected, setSelected] = useState(null)
  const fallFrames = frames.filter(f => f.is_fall)

  if (fallFrames.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 py-8 text-center">
        <Film size={28} className="text-slate-200" strokeWidth={1.5} />
        <p className="text-sm text-slate-500">No fall frames to display</p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title mb-0">Detected Fall Frames</h3>
        <span className="badge-fall"><AlertTriangle size={11} />{fallFrames.length} frames</span>
      </div>

      {/* Horizontal frame strip */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {fallFrames.map((frame, i) => (
          <motion.button
            key={frame.frame_number}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelected(frame)}
            className={`flex-shrink-0 w-36 rounded-lg overflow-hidden border-2 transition-all duration-150
              ${selected?.frame_number === frame.frame_number
                ? 'border-red-400 shadow-danger-ring'
                : 'border-slate-200 hover:border-red-300'}`}
            aria-label={`Frame ${frame.frame_number}`}
          >
            {frame.thumbnail_b64 ? (
              <img src={`data:image/jpeg;base64,${frame.thumbnail_b64}`}
                   alt={`Frame ${frame.frame_number}`}
                   className="w-full h-20 object-cover" />
            ) : (
              <div className="w-full h-20 bg-slate-100 flex items-center justify-center">
                <Film size={20} className="text-slate-300" strokeWidth={1.5} />
              </div>
            )}
            <div className="px-2 py-1.5 bg-white border-t border-slate-100">
              <p className="text-[10px] text-slate-400">Frame {frame.frame_number}</p>
              <p className="text-xs font-semibold text-red-600">{formatConfidence(frame.confidence)}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Selected frame detail */}
      {selected && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-4"
        >
          {selected.thumbnail_b64 && (
            <img src={`data:image/jpeg;base64,${selected.thumbnail_b64}`}
                 alt="Selected frame" className="w-40 rounded-lg border border-slate-200 flex-shrink-0" />
          )}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-slate-800">Frame #{selected.frame_number}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Clock size={11} className="text-slate-400" />
              {formatDuration(selected.timestamp_ms / 1000)} into video
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <AlertTriangle size={11} className="text-red-500" />
              <span className="font-bold text-red-600">{formatConfidence(selected.confidence)}</span>
              <span className="text-slate-400">confidence</span>
            </div>
            <p className="text-xs text-slate-500">
              Body angle: <span className="font-medium text-slate-700">{selected.body_angle?.toFixed(1)}°</span>
            </p>
          </div>
        </motion.div>
      )}
    </div>
  )
}
