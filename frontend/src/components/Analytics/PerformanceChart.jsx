import React, { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { analyticsApi } from '../../services/api'
import { format, parseISO } from 'date-fns'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-card-md text-xs space-y-0.5">
      <p className="font-semibold text-slate-600 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.stroke }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function PerformanceChart() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)
  const [hours,   setHours]   = useState(24)

  useEffect(() => {
    setLoading(true)
    analyticsApi.performanceSeries({ hours })
      .then(({ data }) => setData(data.map(d => ({
        ...d, time: format(parseISO(d.timestamp), 'HH:mm')
      }))))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [hours])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">System Performance</h3>
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
          {[6, 24, 48].map(h => (
            <button key={h} onClick={() => setHours(h)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all duration-150
                ${hours === h ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {h}h
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="h-52 skeleton rounded-lg" /> : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={data} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 0" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 10 }}
                   axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<Tip />} cursor={{ stroke: '#E2E8F0', strokeWidth: 1 }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748B', paddingTop: 8 }} iconType="circle" iconSize={7} />
            <Line type="monotone" dataKey="fps"    name="FPS"      stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="cpu"    name="CPU %"    stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
            <Line type="monotone" dataKey="memory" name="Memory %" stroke="#F59E0B" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
