import React from 'react'
import { motion } from 'framer-motion'
import { Ruler, Target, Zap, Activity, Video, Shield } from 'lucide-react'
import { useDetectionStore } from '../../store/useDetectionStore'

function Metric({ Icon, label, value, unit = '', status = 'normal' }) {
  const statusColors = {
    normal:  'text-slate-800',
    caution: 'text-amber-600',
    alert:   'text-red-600',
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-slate-400" strokeWidth={2} />
        <span className="text-xs text-slate-600">{label}</span>
      </div>
      <motion.span
        key={value}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        className={`text-xs font-semibold font-mono ${statusColors[status]}`}
      >
        {value}{unit}
      </motion.span>
    </div>
  )
}

export default function MetricsPanel() {
  const bodyAngle  = useDetectionStore((s) => s.bodyAngle)
  const comY       = useDetectionStore((s) => s.comY)
  const velocity   = useDetectionStore((s) => s.velocity)
  const confidence = useDetectionStore((s) => s.confidence)
  const fps        = useDetectionStore((s) => s.fps)

  const angleStatus = bodyAngle > 70 ? 'alert' : bodyAngle > 45 ? 'caution' : 'normal'
  const confStatus  = confidence > 70 ? 'alert' : confidence > 40 ? 'caution' : 'normal'
  const velStatus   = velocity > 0.08 ? 'caution' : 'normal'

  return (
    <div>
      <Metric Icon={Ruler}    label="Body Angle"   value={bodyAngle.toFixed(1)}  unit="°"    status={angleStatus} />
      <Metric Icon={Target}   label="CoM Position" value={comY.toFixed(3)}       unit=" y"   />
      <Metric Icon={Zap}      label="Velocity"     value={velocity.toFixed(4)}   unit=" u/s" status={velStatus} />
      <Metric Icon={Activity} label="Confidence"   value={`${confidence.toFixed(1)}%`}        status={confStatus} />
      <Metric Icon={Video}    label="Live FPS"     value={fps}                   unit=" fps" />
      <Metric Icon={Shield}   label="Status"
              value={confidence > 70 ? 'ALERT' : confidence > 40 ? 'CAUTION' : 'SAFE'}
              status={confStatus} />
    </div>
  )
}
