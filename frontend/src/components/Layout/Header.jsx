import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, AlertTriangle, Shield, Wifi, WifiOff } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { formatRelative } from '../../utils/formatters'

export default function Header() {
  const systemStatus  = useAppStore((s) => s.systemStatus)
  const backendOnline = useAppStore((s) => s.backendOnline)
  const alertFeed     = useAppStore((s) => s.alertFeed)
  const [notifOpen, setNotifOpen] = useState(false)
  const unread = alertFeed.length

  return (
    <header className="flex-shrink-0 h-14 flex items-center justify-end px-8 bg-transparent">
      <div className="flex items-center gap-3">
        {/* Backend status */}
        <div className="flex items-center gap-1.5">
          {backendOnline
            ? <Wifi size={13} className="text-emerald-500" />
            : <WifiOff size={13} className="text-red-400" />
          }
          <span className="text-xs text-[#9CA3AF]">
            {backendOnline ? 'Connected' : 'Offline'}
          </span>
        </div>

        {/* System status pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium
          ${systemStatus === 'alert'  ? 'bg-red-50 border-red-200 text-red-700'
          : systemStatus === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
          : 'bg-[#F3F4F6] border-[#E5E7EB] text-[#6B7280]'}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
            ${systemStatus === 'alert'  ? 'bg-red-500 animate-pulse'
            : systemStatus === 'active' ? 'bg-emerald-500 animate-pulse'
            : 'bg-[#D1D5DB]'}`}
          />
          {systemStatus === 'alert'  ? 'Fall Alert'
           : systemStatus === 'active' ? 'Monitoring' : 'Idle'}
        </div>

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(o => !o)}
            className="btn-icon relative"
            aria-label="Notifications"
          >
            <Bell size={16} strokeWidth={2} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {Math.min(unread, 9)}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-10 w-76 bg-white border border-[#E5E7EB] rounded-xl z-50 overflow-hidden"
                style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
              >
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F3F4F6]">
                  <span className="text-xs font-semibold text-[#374151]">Recent Alerts</span>
                  <button onClick={() => setNotifOpen(false)} className="btn-icon h-6 w-6">
                    <X size={13} />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#F3F4F6]">
                  {alertFeed.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 py-8">
                      <Shield size={22} className="text-[#D1D5DB]" />
                      <p className="text-xs text-[#9CA3AF]">No alerts yet</p>
                    </div>
                  ) : alertFeed.slice(0, 8).map((a, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#F9FAFB]">
                      <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#111827] leading-snug">
                          Fall detected — {a.confidence?.toFixed(1)}% confidence
                        </p>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">{formatRelative(a.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
