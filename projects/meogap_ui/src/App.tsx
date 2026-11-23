import { useEffect, useState } from 'react'
import { getHealth, type Health } from './api/client'

type View = 'explore' | 'requests'

const UNKNOWN_HEALTH: Health = { status: 'unknown', service: 'unknown', version: 'unknown' }

export default function App() {
  const [view, setView] = useState<View>('explore')
  const [health, setHealth] = useState<Health>(UNKNOWN_HEALTH)

  useEffect(() => {
    let active = true
    getHealth()
      .then((value) => {
        if (active) setHealth(value)
      })
      .catch(() => {
        if (active) setHealth({ status: 'unreachable', service: 'unknown', version: 'unknown' })
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Modular Earth Observation</p>
          <h1>MEOGAP</h1>
        </div>
        <p className={`status status-${health.status}`}>
          API: {health.status} · {health.service} {health.version}
        </p>
      </header>

      <nav className="tabs" aria-label="Main views">
        <button
          type="button"
          className={view === 'explore' ? 'tab tab-active' : 'tab'}
          onClick={() => setView('explore')}
        >
          Explore
        </button>
        <button
          type="button"
          className={view === 'requests' ? 'tab tab-active' : 'tab'}
          onClick={() => setView('requests')}
        >
          Requests
        </button>
      </nav>

      {view === 'explore' ? (
        <section className="panel">
          <h2>Explore</h2>
          <p>
            The application shell is ready. Catalogue display and map context are awaiting the
            Product, Request and Result contract decisions.
          </p>
        </section>
      ) : (
        <section className="panel">
          <h2>Requests</h2>
          <p>No requests yet. Analysis requests will appear in this view.</p>
        </section>
      )}
    </main>
  )
}
