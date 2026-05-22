import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard'
import Monitor from './pages/Monitor'
import Upload from './pages/Upload'
import Events from './pages/Events'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import { useAppStore } from './store/useAppStore'

/**
 * Root application component.
 * Mounts the persistent Layout shell and sets up top-level routing.
 */
export default function App() {
  const fetchInitialData = useAppStore((s) => s.fetchInitialData)

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  return (
    <Layout>
      <Routes>
        <Route path="/"          element={<Dashboard />} />
        <Route path="/monitor"   element={<Monitor />} />
        <Route path="/upload"    element={<Upload />} />
        <Route path="/events"    element={<Events />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings"  element={<Settings />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
