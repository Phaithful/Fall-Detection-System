import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { analyticsApi } from '../../services/api'

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-card-md text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.fill }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function FallFrequencyChart() {
  const [data,   setData]   = useState([])
  const [period, setPeriod] = useState('daily')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    analyticsApi.fallsOverTime({ period, days: period === 'daily' ? 30 : period === 'weekly' ? 90 : 365 })
      .then(({ data }) => setData(data))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [period])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="section-title mb-0">Fall Frequency</h3>
        <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all duration-150
                ${period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {p[0].toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="h-52 skeleton rounded-lg" /> : (
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={data} margin={{ top: 2, right: 2, left: -22, bottom: 0 }}
                    barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 0" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="period" tick={{ fill: '#94A3B8', fontSize: 10 }}
                   axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false}
                   tickLine={false} allowDecimals={false} />
            <Tooltip content={<Tip />} cursor={{ fill: '#F8FAFC' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748B', paddingTop: 8 }} iconType="circle" iconSize={7} />
            <Bar dataKey="falls"     name="Falls"    fill="#EF4444" fillOpacity={0.85} radius={[3,3,0,0]} />
            <Bar dataKey="non_falls" name="No Falls" fill="#3B82F6" fillOpacity={0.75} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
