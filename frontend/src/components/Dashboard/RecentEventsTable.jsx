import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatDateTime, formatConfidence, sourceLabel } from '../../utils/formatters'

export default function RecentEventsTable() {
  const recentEvents  = useAppStore((s) => s.recentEvents)
  const eventsLoading = useAppStore((s) => s.eventsLoading)
  const navigate      = useNavigate()

  return (
    <div className="card-flush">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Recent Events</h3>
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          View all <ArrowRight size={12} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Recent events table">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['ID', 'Timestamp', 'Source', 'Confidence', 'Type', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {eventsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-2.5">
                      <div className="skeleton h-3.5 rounded w-16" />
                    </td>
                  ))}
                </tr>
              ))
            ) : recentEvents.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">
                  No events recorded yet
                </td>
              </tr>
            ) : (
              recentEvents.map((ev, i) => (
                <motion.tr
                  key={ev.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-slate-50 transition-colors duration-100 cursor-pointer"
                  onClick={() => navigate(`/events?id=${ev.id}`)}
                >
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-400">#{ev.id}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                    {formatDateTime(ev.timestamp)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="badge-neutral">{sourceLabel(ev.source)}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold ${ev.is_fall ? 'text-red-600' : 'text-slate-500'}`}>
                      {formatConfidence(ev.confidence)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {ev.is_fall
                      ? <span className="badge-fall">Fall</span>
                      : <span className="badge-safe">No Fall</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${
                      ev.status === 'confirmed'   ? 'badge-fall'    :
                      ev.status === 'false_alarm' ? 'badge-warning' :
                      'badge-neutral'
                    }`}>
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-400" />
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
