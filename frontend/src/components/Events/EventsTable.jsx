import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Filter, Download, Trash2, Eye, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { eventsApi } from '../../services/api'
import { formatDateTime, formatConfidence, sourceLabel } from '../../utils/formatters'
import EventDetailModal from './EventDetailModal'
import toast from 'react-hot-toast'

export default function EventsTable({ initialId = null }) {
  const [events,  setEvents]  = useState([])
  const [total,   setTotal]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [page,    setPage]    = useState(1)
  const [selected, setSelected] = useState(null)
  const PAGE_SIZE = 15

  const [filters, setFilters] = useState({
    is_fall: '', status: '', source: '',
    min_confidence: '', max_confidence: '', search: '',
  })

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE }
      if (filters.is_fall !== '')   params.is_fall        = filters.is_fall === 'true'
      if (filters.status)           params.status         = filters.status
      if (filters.source)           params.source         = filters.source
      if (filters.min_confidence)   params.min_confidence = parseFloat(filters.min_confidence)
      if (filters.max_confidence)   params.max_confidence = parseFloat(filters.max_confidence)
      if (filters.search)           params.search         = filters.search
      const { data } = await eventsApi.list(params)
      setEvents(data.items || [])
      setTotal(data.total  || 0)
    } catch { setEvents([]) }
    finally  { setLoading(false) }
  }, [page, filters])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (initialId) eventsApi.get(initialId).then(({ data }) => setSelected(data)).catch(() => {})
  }, [initialId])

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete event #${id}?`)) return
    try { await eventsApi.delete(id); toast.success(`Event #${id} deleted`); fetchEvents() } catch {}
  }

  const patchFilter = (k, v) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }
  const totalPages  = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      {/* Filter bar */}
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={14} className="text-slate-400" strokeWidth={2} />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Filters</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            {
              key: 'is_fall', type: 'select',
              options: [['', 'All Types'], ['true', 'Falls'], ['false', 'No Falls']],
            },
            {
              key: 'status', type: 'select',
              options: [['', 'Any Status'], ['unreviewed', 'Unreviewed'], ['confirmed', 'Confirmed'], ['false_alarm', 'False Alarm']],
            },
            {
              key: 'source', type: 'select',
              options: [['', 'Any Source'], ['webcam', 'Webcam'], ['upload', 'Upload'], ['demo', 'Demo']],
            },
          ].map(({ key, type, options }) => (
            <select key={key} value={filters[key]}
                    onChange={e => patchFilter(key, e.target.value)}
                    className="input text-xs" aria-label={`Filter by ${key}`}>
              {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          ))}
          <input type="number" min="0" max="100" placeholder="Min conf %"
                 value={filters.min_confidence}
                 onChange={e => patchFilter('min_confidence', e.target.value)}
                 className="input text-xs" aria-label="Min confidence" />
          <input type="number" min="0" max="100" placeholder="Max conf %"
                 value={filters.max_confidence}
                 onChange={e => patchFilter('max_confidence', e.target.value)}
                 className="input text-xs" aria-label="Max confidence" />
          <input type="text" placeholder="Search filename…"
                 value={filters.search}
                 onChange={e => patchFilter('search', e.target.value)}
                 className="input text-xs" aria-label="Search" />
        </div>
      </div>

      {/* Table */}
      <div className="card-flush">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
          <span className="text-xs font-medium text-slate-600">
            {total.toLocaleString()} event{total !== 1 ? 's' : ''}
          </span>
          <a href={eventsApi.exportCsv()} className="btn-secondary text-xs" aria-label="Export CSV">
            <Download size={13} /> Export CSV
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Events table">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['ID', 'Date / Time', 'Source', 'Confidence', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-2.5"><div className="skeleton h-3.5 w-16 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    No events match your filters
                  </td>
                </tr>
              ) : events.map((ev, i) => (
                <motion.tr
                  key={ev.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-slate-50 transition-colors duration-100 cursor-pointer"
                  onClick={() => setSelected(ev)}
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
                      ? <span className="badge-fall"><AlertTriangle size={10} />Fall</span>
                      : <span className="badge-safe"><CheckCircle2 size={10} />No Fall</span>
                    }
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${
                      ev.status === 'confirmed'   ? 'badge-fall'    :
                      ev.status === 'false_alarm' ? 'badge-warning' : 'badge-neutral'
                    }`}>{ev.status}</span>
                  </td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSelected(ev)} className="btn-icon h-7 w-7" aria-label={`View ${ev.id}`}>
                        <Eye size={13} />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} className="btn-icon h-7 w-7 text-slate-400 hover:text-red-500" aria-label={`Delete ${ev.id}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                      className="btn-secondary text-xs py-1 px-2 disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const n = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                return (
                  <button key={n} onClick={() => setPage(n)}
                    className={`text-xs w-7 h-7 rounded-lg font-medium transition-colors
                      ${n === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {n}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                      className="btn-secondary text-xs py-1 px-2 disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <EventDetailModal event={selected} onClose={() => setSelected(null)} />
    </>
  )
}
