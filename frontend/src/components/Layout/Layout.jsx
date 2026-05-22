import React from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useWebSocket } from '../../hooks/useWebSocket'

export default function Layout({ children }) {
  useWebSocket(true)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F8FA]">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  )
}
