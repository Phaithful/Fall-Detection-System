import React from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import { useWebSocket } from '../../hooks/useWebSocket'

export default function Layout({ children }) {
  useWebSocket(true)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
