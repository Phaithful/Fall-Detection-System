import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Monitor, UploadCloud, ClipboardList,
  BarChart3, Settings, Eye, ChevronLeft, ChevronRight,
  Activity, AlertTriangle
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'

const NAV = [
  { path: '/',          label: 'Dashboard',       Icon: LayoutDashboard },
  { path: '/monitor',   label: 'Live Monitor',    Icon: Monitor         },
  { path: '/upload',    label: 'Upload & Analyze', Icon: UploadCloud    },
  { path: '/events',    label: 'Event History',   Icon: ClipboardList   },
  { path: '/analytics', label: 'Analytics',       Icon: BarChart3       },
  { path: '/settings',  label: 'Settings',        Icon: Settings        },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const systemStatus = useAppStore((s) => s.systemStatus)
  const summary      = useAppStore((s) => s.summary)
  const location     = useLocation()

  return (
    <motion.aside
      animate={{ width: collapsed ? 56 : 220 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex-shrink-0 flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-3 py-3.5 border-b border-slate-100">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Eye size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-semibold text-slate-900 whitespace-nowrap leading-none">
                Guardian Eye
              </p>
              <p className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5">Fall Detection</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ path, label, Icon }) => {
          const active = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
          return (
            <NavLink
              key={path} to={path}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors duration-100 group
                ${active
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2}
                className={`flex-shrink-0 ${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          )
        })}
      </nav>

      {/* System status mini panel */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mx-2 mb-2 p-3 bg-slate-50 rounded-lg border border-slate-100"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                systemStatus === 'alert' ? 'bg-red-500 animate-pulse' :
                systemStatus === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`} />
              <span className="text-[11px] font-medium text-slate-600 capitalize">{systemStatus}</span>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <MiniStat label="Falls" value={summary.total_falls} />
              <MiniStat label="Today" value={summary.today_events} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-center h-8 mx-2 mb-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors duration-150"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight size={14} strokeWidth={2} />
          : <ChevronLeft  size={14} strokeWidth={2} />
        }
      </button>
    </motion.aside>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-slate-800">{value ?? 0}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  )
}
