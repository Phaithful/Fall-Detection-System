import React from 'react'
import { useSearchParams } from 'react-router-dom'
import EventsTable from '../components/Events/EventsTable'

export default function Events() {
  const [searchParams] = useSearchParams()
  const initialId = searchParams.get('id')

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="page-title">Event History</h2>
        <p className="page-subtitle">Filterable log of all detected events — click any row for full detail</p>
      </div>
      <EventsTable initialId={initialId ? parseInt(initialId) : null} />
    </div>
  )
}
