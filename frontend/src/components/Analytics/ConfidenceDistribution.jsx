import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { analyticsApi } from '../../services/api'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-card-md text-xs">
      <p className="font-semibold text-slate-700">{label}%</p>
      <p className="text-slate-600 font-medium">{payload[0].value} events</p>
    </div>
  )
}

const barColor = (bucket) => {
  const low = parseInt(bucket)
  if (low >= 70) return '#EF4444'
  if (low >= 40) return '#F59E0B'
  return '#10B981'
}

export default function ConfidenceDistribution() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    analyticsApi.confidenceDist()
      .then(({ data }) => setData(data))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">Confidence Distribution</h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Safe</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Elevated</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Fall</span>
        </div>
      </div>

      {loading ? <div className="h-52 skeleton rounded-lg" /> : (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={data} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 0" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="bucket" tick={{ fill: '#94A3B8', fontSize: 10 }}
                   axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false}
                   tickLine={false} allowDecimals={false} />
            <Tooltip content={<Tip />} cursor={{ fill: '#F8FAFC' }} />
            <Bar dataKey="count" radius={[3,3,0,0]}>
              {data.map(entry => (
                <Cell key={entry.bucket} fill={barColor(entry.bucket)} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
