import React from 'react'
import { motion } from 'framer-motion'

export default function ConfidenceMeter({ confidence = 0, size = 156 }) {
  const r        = size / 2 - 14
  const circ     = Math.PI * r           // half-circle arc length
  const filled   = (confidence / 100) * circ
  const cx = size / 2
  const cy = size / 2

  const color = confidence >= 70 ? '#DC2626' : confidence >= 40 ? '#D97706' : '#059669'
  const bg    = confidence >= 70 ? '#FEF2F2' : confidence >= 40 ? '#FFFBEB' : '#ECFDF5'
  const label = confidence >= 70 ? 'High Risk' : confidence >= 40 ? 'Elevated' : 'Normal'

  return (
    <div className="flex flex-col items-center select-none">
      <div style={{ width: size, height: size / 2 + 28 }} className="relative">
        <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}
             aria-label={`Confidence: ${confidence.toFixed(1)}%`}>
          {/* Track */}
          <path
            d={`M 14 ${cy} A ${r} ${r} 0 0 1 ${size - 14} ${cy}`}
            fill="none" stroke="#E2E8F0" strokeWidth="8" strokeLinecap="round"
          />
          {/* Fill */}
          <motion.path
            d={`M 14 ${cy} A ${r} ${r} 0 0 1 ${size - 14} ${cy}`}
            fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`}
            animate={{ strokeDashoffset: circ - filled }}
            initial={{ strokeDashoffset: circ }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          {/* Value */}
          <text x={cx} y={cy - 4} textAnchor="middle" fill={color}
                fontSize="20" fontWeight="700" fontFamily="Inter, system-ui, sans-serif">
            {confidence.toFixed(0)}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="#94A3B8"
                fontSize="10" fontFamily="Inter, system-ui, sans-serif">
            {label}
          </text>
        </svg>
      </div>
      {/* Scale ticks */}
      <div className="flex justify-between w-full text-[10px] text-slate-400 px-1 -mt-1">
        <span>0%</span>
        <span className="text-amber-500">40%</span>
        <span className="text-red-500">70%</span>
        <span>100%</span>
      </div>
    </div>
  )
}
