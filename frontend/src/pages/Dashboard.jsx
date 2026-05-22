import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ClipboardList, AlertTriangle, Clock, Timer,
  UploadCloud, Monitor, BarChart3
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import StatCard from '../components/Dashboard/StatCard'
import AlertFeed from '../components/Dashboard/AlertFeed'
import RecentEventsTable from '../components/Dashboard/RecentEventsTable'
import SystemHealthBar from '../components/Dashboard/SystemHealthBar'

export default function Dashboard() {
  const navigate      = useNavigate()
  const summary       = useAppStore((s) => s.summary)
  const eventsLoading = useAppStore((s) => s.eventsLoading)
  const fetchSummary  = useAppStore((s) => s.fetchSummary)

  useEffect(() => {
    const id = setInterval(fetchSummary, 30_000)
    return () => clearInterval(id)
  }, [fetchSummary])

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Live monitoring overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/upload')} className="btn-secondary">
            <UploadCloud size={14} /> Upload Video
          </button>
          <button onClick={() => navigate('/monitor')} className="btn-primary">
            <Monitor size={14} /> Live Monitor
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Events"
          value={summary.total_events}
          trendLabel={`${summary.total_non_falls ?? 0} no-fall events`}
          Icon={ClipboardList}
          loading={eventsLoading}
        />
        <StatCard
          title="Falls Detected"
          value={summary.total_falls}
          trendLabel={summary.today_falls > 0 ? `+${summary.today_falls} today` : 'None today'}
          Icon={AlertTriangle}
          loading={eventsLoading}
        />
        <StatCard
          title="Today's Events"
          value={summary.today_events}
          trendLabel="Last 24 hours"
          Icon={Clock}
          loading={eventsLoading}
        />
        <StatCard
          title="System Uptime"
          value={`${summary.uptime_hours}h`}
          trendLabel={`Avg confidence ${summary.avg_confidence?.toFixed(1) ?? 0}%`}
          Icon={Timer}
          loading={eventsLoading}
        />
      </div>

      {/* Middle row: alert feed + health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="h-72">
          <AlertFeed />
        </div>
        <div className="lg:col-span-2">
          <SystemHealthBar />
        </div>
      </div>

      {/* Recent events table */}
      <RecentEventsTable />

      {/* Quick nav row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'View All Events',  sub: `${summary.total_events} total`, Icon: ClipboardList, path: '/events'    },
          { label: 'Analytics',        sub: 'Charts & reports',              Icon: BarChart3,     path: '/analytics' },
          { label: 'Upload & Analyze', sub: 'Offline detection',             Icon: UploadCloud,   path: '/upload'    },
        ].map(({ label, sub, Icon, path }) => (
          <motion.button
            key={path} whileHover={{ y: -1 }} onClick={() => navigate(path)}
            className="card flex items-center gap-3 text-left transition-colors duration-150 w-full hover:shadow-md"
          >
            <div className="w-9 h-9 bg-[#EFF6FF] rounded-lg flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-[#2563EB]" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#111827]">{label}</p>
              <p className="text-xs text-[#9CA3AF]">{sub}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
