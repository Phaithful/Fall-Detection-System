import React, { useEffect, useState } from 'react'
import { analyticsApi } from '../../services/api'
import { DAY_LABELS } from '../../utils/formatters'

export default function TimeHeatmap() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(false)
  const [maxCount, setMaxCount] = useState(1)

  useEffect(() => {
    setLoading(true)
    analyticsApi.heatmap({ days: 30 })
      .then(({ data }) => { setData(data); setMaxCount(Math.max(1, ...data.map(d => d.count))) })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  const cellAt = (h, d) => data.find(x => x.hour === h && x.day === d)

  const cellColor = (count) => {
    if (!count) return '#F8FAFC'
    const t = count / maxCount
    if (t < 0.2)  return '#DBEAFE'
    if (t < 0.45) return '#93C5FD'
    if (t < 0.7)  return '#FCA5A5'
    return '#EF4444'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">Time-of-Day Heatmap</h3>
        <span className="text-xs text-slate-400">last 30 days</span>
      </div>

      {loading ? <div className="h-52 skeleton rounded-lg" /> : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Day labels */}
            <div className="flex ml-9 mb-1.5">
              {DAY_LABELS.map(d => (
                <div key={d} className="flex-1 text-center text-[10px] font-medium text-slate-400">{d}</div>
              ))}
            </div>

            {/* Hour rows */}
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex items-center mb-[3px]">
                <span className="w-8 text-[9px] text-slate-400 text-right pr-1.5 font-mono flex-shrink-0">
                  {h.toString().padStart(2,'0')}h
                </span>
                {DAY_LABELS.map((_, d) => {
                  const c = cellAt(h, d)?.count || 0
                  return (
                    <div key={d} className="flex-1 h-3.5 mx-[2px] rounded-sm cursor-default"
                         style={{ backgroundColor: cellColor(c) }}
                         title={`${DAY_LABELS[d]} ${h}:00 — ${c} fall${c !== 1 ? 's' : ''}`} />
                  )
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-1.5 mt-3 ml-9 text-[10px] text-slate-400">
              <span>None</span>
              {['#DBEAFE','#93C5FD','#FCA5A5','#EF4444'].map(c => (
                <div key={c} className="w-5 h-3 rounded-sm" style={{ backgroundColor: c }} />
              ))}
              <span>High</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
