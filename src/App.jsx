import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'

function pageLabel(id) {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar activePage={activePage} setMobileOpen={setMobileOpen} />
        <main className="flex-1 overflow-y-auto">
          {activePage === 'dashboard' ? (
            <Dashboard />
          ) : (
            <div className="p-8 text-sm text-gray-400">
              {pageLabel(activePage)} — coming soon
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
