import { Bell, HelpCircle, Menu } from 'lucide-react'

function pageTitle(activePage) {
  return activePage
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function Topbar({ activePage, setMobileOpen }) {
  const title = pageTitle(activePage)

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3.5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="text-gray-500 hover:text-gray-800 md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <h1 className="truncate text-[18px] font-medium text-gray-900">{title}</h1>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          aria-label="Notifications"
        >
          <Bell size={15} />
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          aria-label="Help"
        >
          <HelpCircle size={15} />
        </button>
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          Upgrade Plan
        </button>
      </div>
    </header>
  )
}
