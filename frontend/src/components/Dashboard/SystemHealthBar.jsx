import React from 'react'
import { motion } from 'framer-motion'
import { Cpu, HardDrive, Gauge, Zap } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

function HealthRow({ icon: Icon, label, value, max = 100, unit = '%', warn = 70, danger = 85 }) {
  const pct   = Math.min(100, Math.max(0, (value / max) * 100))
  const color = pct >= danger ? 'bg-red-500' : pct >= warn ? 'bg-amber-400' : 'bg-emerald-500'
  const textColor = pct >= danger ? 'text-red-600' : pct >= warn ? 'text-amber-600' : 'text-emerald-600'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 w-32 flex-shrink-0">
        <Icon size={14} className="text-slate-400" strokeWidth={2} />
        <span className="text-xs text-slate-600">{label}</span>
      </div>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-xs font-mono font-medium w-14 text-right ${textColor}`}>
        {typeof value === 'number' ? value.toFixed(1) : '—'}{unit}
      </span>
    </div>
  )
}

export default function SystemHealthBar() {
  const health = useAppStore((s) => s.health)

  return (
    <div className="card">
      <h3 className="section-title">System Health</h3>
      <div className="space-y-3">
        <HealthRow icon={Cpu}      label="CPU Usage"  value={health.cpu}        warn={65} danger={85} />
        <HealthRow icon={HardDrive} label="Memory"    value={health.memory}     warn={70} danger={88} />
        <HealthRow icon={Gauge}    label="FPS"        value={health.fps}   max={30}
                   unit=" fps"    warn={40} danger={25} />
        <HealthRow icon={Zap}      label="Latency"    value={health.latency_ms} max={200}
                   unit=" ms"     warn={50} danger={120} />
      </div>
    </div>
  )
}
