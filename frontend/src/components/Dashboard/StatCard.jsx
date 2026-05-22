import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Compact stat card with icon, value, label, and optional trend indicator.
 */
export default function StatCard({
  title, value, subtitle, Icon,
  iconColor = 'text-blue-600', iconBg = 'bg-blue-50',
  trend = null,     // 'up' | 'down' | 'neutral'
  trendLabel = '',
  loading = false,
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'

  return (
    <div className="card flex flex-col gap-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {Icon && <Icon size={18} className={iconColor} strokeWidth={2} />}
        </div>
        {trend && trendLabel && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={13} strokeWidth={2} />
            {trendLabel}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <div className="space-y-1.5">
          <div className="skeleton h-7 w-16 rounded" />
          <div className="skeleton h-3.5 w-24 rounded" />
        </div>
      ) : (
        <div>
          <motion.p
            key={value}
            initial={{ opacity: 0.6, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-semibold text-slate-900 leading-none"
          >
            {value ?? '—'}
          </motion.p>
          <p className="text-xs text-slate-500 mt-1">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      )}
    </div>
  )
}
