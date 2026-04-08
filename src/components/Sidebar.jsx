import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  CreditCard,
  Download,
  FolderOpen,
  Clock,
  BookOpen,
  BarChart2,
  X,
} from 'lucide-react'

const sections = [
  { items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { items: [{ id: 'clients', label: 'Clients', icon: Users }] },
  {
    label: 'Finance',
    items: [
      { id: 'invoices', label: 'Invoices', icon: FileText },
      { id: 'bills', label: 'Bills', icon: ClipboardList },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'exports', label: 'Exports', icon: Download },
    ],
  },
  {
    label: 'Work',
    items: [
      { id: 'projects', label: 'Projects', icon: FolderOpen },
      { id: 'time-tracking', label: 'Time Tracking', icon: Clock },
    ],
  },
  {
    label: 'Reports',
    items: [
      { id: 'accounting', label: 'Accounting', icon: BookOpen },
      { id: 'reports', label: 'Reports', icon: BarChart2 },
    ],
  },
]

export default function Sidebar({
  activePage,
  setActivePage,
  mobileOpen,
  setMobileOpen,
}) {
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-200 md:static',
          mobileOpen ? 'w-64' : 'w-0 md:w-16 lg:w-64',
          'overflow-hidden',
        ].join(' ')}
        style={{ background: '#1a2332', minHeight: '100vh' }}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-sm font-semibold text-white">
            N
          </div>
          <span className="hidden text-[15px] font-medium text-white lg:block">Numeris</span>
          {mobileOpen && (
            <button
              type="button"
              className="ml-auto text-white/50 hover:text-white md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {sections.map((section, si) => (
            <div key={si} className="mb-1">
              {section.label && (
                <p className="hidden px-4 py-2 text-[10px] uppercase tracking-widest text-white/35 lg:block">
                  {section.label}
                </p>
              )}
              {!section.label && si > 0 && <div className="h-2" />}
              {section.items.map((item) => {
                const Icon = item.icon
                const active = activePage === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActivePage(item.id)
                      setMobileOpen(false)
                    }}
                    className={[
                      'flex w-full items-center gap-3 border-l-[3px] px-4 py-2.5 text-left transition-colors',
                      active
                        ? 'border-blue-500 text-white'
                        : 'border-transparent text-white/60 hover:bg-white/5 hover:text-white',
                    ].join(' ')}
                    style={active ? { background: 'rgba(59,130,246,0.12)' } : {}}
                  >
                    <Icon size={16} className="shrink-0" aria-hidden />
                    <span className="hidden text-[13px] lg:block">{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-medium text-white">
              H
            </div>
            <span className="hidden text-[13px] text-white/80 lg:block">Hollie M.</span>
          </div>
        </div>
      </aside>
    </>
  )
}
