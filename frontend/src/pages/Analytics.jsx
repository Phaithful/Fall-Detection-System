import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Printer, ClipboardList, AlertTriangle, Target, BarChart3, FileText, Cpu, HardDrive, Gauge, Zap } from 'lucide-react'
import { analyticsApi } from '../services/api'
import FallFrequencyChart from '../components/Analytics/FallFrequencyChart'
import ConfidenceDistribution from '../components/Analytics/ConfidenceDistribution'
import PerformanceChart from '../components/Analytics/PerformanceChart'
import TimeHeatmap from '../components/Analytics/TimeHeatmap'

export default function Analytics() {
  const [summary,     setSummary]  = useState(null)
  const [perfMetrics, setPerf]     = useState(null)
  const [loading,     setLoading]  = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      analyticsApi.summary(),
      analyticsApi.performance({ hours: 24 }),
    ])
      .then(([s, p]) => { setSummary(s.data); setPerf(p.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const summaryText = summary
    ? `Over the monitoring period, the system logged ${summary.total_events} total events, of which
       ${summary.total_falls} were classified as falls (${summary.false_alarm_rate?.toFixed(1)}% false alarm rate).
       Average detection confidence is ${summary.avg_confidence?.toFixed(1)}%.
       System has been operational for ${summary.uptime_hours?.toFixed(0)} hours.`
    : null

  const precision = summary && summary.total_falls > 0
    ? ((summary.total_falls - (summary.total_falls * summary.false_alarm_rate / 100)) / summary.total_falls * 100).toFixed(1)
    : 0

  const statCards = [
    { label: 'Total Events',   value: summary?.total_events ?? '—',                             Icon: ClipboardList, iconColor: 'text-blue-600',    iconBg: 'bg-blue-50' },
    { label: 'Falls Detected', value: summary?.total_falls ?? '—',                              Icon: AlertTriangle,  iconColor: 'text-red-600',     iconBg: 'bg-red-50' },
    { label: 'Precision',      value: precision !== '0.0' ? `${precision}%` : '—',              Icon: Target,         iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
    { label: 'Avg Confidence', value: summary ? `${summary.avg_confidence?.toFixed(1)}%` : '—', Icon: BarChart3,      iconColor: 'text-amber-600',   iconBg: 'bg-amber-50' },
  ]

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Analytics & Reports</h2>
          <p className="page-subtitle">Detection performance and system metrics</p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-secondary"
          aria-label="Print or export report"
        >
          <Printer size={14} /> Print Report
        </button>
      </div>

      {/* Detection stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map(({ label, value, Icon, iconColor, iconBg }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card flex items-center gap-3"
          >
            <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon size={16} className={iconColor} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-slate-800 leading-none">
                {loading ? <span className="skeleton inline-block w-10 h-5 rounded" /> : value}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FallFrequencyChart />
        <ConfidenceDistribution />
        <PerformanceChart />
        <TimeHeatmap />
      </div>

      {/* System performance (24h) */}
      {perfMetrics && (
        <div className="card">
          <h3 className="section-title">System Performance — Last 24h</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <PerfStat label="Avg FPS"     value={`${perfMetrics.avg_fps}`}           unit="fps" Icon={Zap} />
            <PerfStat label="Avg CPU"     value={`${perfMetrics.avg_cpu}`}            unit="%" Icon={Cpu} />
            <PerfStat label="Avg Memory"  value={`${perfMetrics.avg_memory}`}         unit="%" Icon={HardDrive} />
            <PerfStat label="Avg Latency" value={`${perfMetrics.avg_latency_ms}`}     unit="ms" Icon={Gauge} />
          </div>
        </div>
      )}

      {/* Auto-generated summary */}
      {summaryText && (
        <div className="card border-blue-100">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <FileText size={14} className="text-blue-600" />
            </div>
            <div>
              <h3 className="section-title mb-1">Performance Summary</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{summaryText}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PerfStat({ label, value, unit, Icon }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-slate-500" />
      </div>
      <div>
        <p className="text-base font-bold text-slate-800 leading-none">
          {value}<span className="text-xs font-normal text-slate-400 ml-0.5">{unit}</span>
        </p>
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  )
}
