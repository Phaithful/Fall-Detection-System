import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Monitor, UploadCloud, ClipboardList,
  BarChart3, Settings, Eye
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'MONITOR',
    items: [
      { path: '/',        label: 'Dashboard',    Icon: LayoutDashboard },
      { path: '/monitor', label: 'Live Monitor', Icon: Monitor, badge: 'Live' },
    ],
  },
  {
    label: 'ANALYZE',
    items: [
      { path: '/upload',    label: 'Upload & Analyze', Icon: UploadCloud },
      { path: '/events',    label: 'Event History',    Icon: ClipboardList },
      { path: '/analytics', label: 'Analytics',        Icon: BarChart3 },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/settings', label: 'Settings', Icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside
      style={{ width: 220 }}
      className="flex-shrink-0 flex flex-col bg-white border-r border-[#E5E7EB] h-full"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-[#E5E7EB]">
        <div className="flex-shrink-0 w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
          <Eye size={16} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#111827] leading-none">Guardian Eye</p>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">Fall Detection</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label} className="mb-5">
            <p className="px-3 mb-1.5 text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-widest select-none">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ path, label: itemLabel, Icon, badge }) => {
                const active = path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(path)
                return (
                  <NavLink
                    key={path}
                    to={path}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-100
                      ${active
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                        : 'text-[#374151] hover:bg-[#F9FAFB] hover:text-[#111827]'
                      }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={active ? 2.5 : 2}
                      className={`flex-shrink-0 ${active ? 'text-[#2563EB]' : 'text-[#6B7280]'}`}
                    />
                    <span className="flex-1 whitespace-nowrap overflow-hidden">{itemLabel}</span>
                    {badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#22C55E] text-white rounded-full leading-tight">
                        {badge}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
