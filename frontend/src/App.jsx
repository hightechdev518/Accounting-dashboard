import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import LoadingSpinner from './components/LoadingSpinner'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import {
  AccountingView,
  BillsView,
  ClientsView,
  ExportsView,
  FinanceInvoicesView,
  PaymentsView,
  ProjectsView,
  ReportsView,
  TimeTrackingView,
} from './pages/FeatureViews'

function pageLabel(id) {
  return id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function MainShell() {
  const { user, logout } = useAuth()
  const [activePage, setActivePage] = useState('dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)

  function renderPage() {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />
      case 'clients':
        return <ClientsView />
      case 'invoices':
        return <FinanceInvoicesView />
      case 'bills':
        return <BillsView />
      case 'payments':
        return <PaymentsView />
      case 'exports':
        return <ExportsView />
      case 'projects':
        return <ProjectsView />
      case 'time-tracking':
        return <TimeTrackingView />
      case 'accounting':
        return <AccountingView />
      case 'reports':
        return <ReportsView />
      default:
        return (
          <div className="p-8 text-sm text-gray-400">
            {pageLabel(activePage)} — coming soon
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        userName={user?.name ?? 'Thomas'}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          activePage={activePage}
          setMobileOpen={setMobileOpen}
          onLogout={logout}
        />
        <main className="flex-1 overflow-y-auto">{renderPage()}</main>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner label="Loading session…" />
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return <MainShell />
}
