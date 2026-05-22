import React from 'react'
import { motion } from 'framer-motion'

export default function StatCard({
  title, value, subtitle, Icon,
  trend = null,
  trendLabel = '',
  loading = false,
}) {
  return (
    <div className="card flex flex-col gap-3">
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[#6B7280]">{title}</p>
        {Icon && (
          <div className="w-9 h-9 rounded-lg bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-[#2563EB]" strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-9 w-20 rounded" />
          <div className="skeleton h-3.5 w-28 rounded" />
        </div>
      ) : (
        <motion.p
          key={value}
          initial={{ opacity: 0.6, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[34px] font-bold text-[#111827] leading-none"
        >
          {value ?? '—'}
        </motion.p>
      )}

      {/* Delta / subtitle */}
      {!loading && (trendLabel || subtitle) && (
        <p className="text-[12px] text-[#9CA3AF]">
          {trendLabel || subtitle}
        </p>
      )}
    </div>
  )
}
