import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header, BottomNav } from './Header'

const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/transactions': 'Transactions',
  '/debts':        'Debts & Receivables',
  '/budgets':      'Budgets',
  '/savings':      'Savings Goals',
  '/settings':     'Settings',
}

export function AppLayout() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] || 'Evermore'

  return (
    <div className="flex min-h-screen gradient-bg">
      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <Header title={title} />

        {/* Page content */}
        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-6xl w-full mx-auto page-enter">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      <BottomNav />
    </div>
  )
}
