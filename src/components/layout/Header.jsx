import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, CreditCard,
  Target, PiggyBank, Leaf
} from 'lucide-react'

// ── Mobile Header ────────────────────────────────────────
export function Header({ title }) {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3.5 bg-[var(--bg-card)] backdrop-blur-xl border-b border-[var(--border)]">
      <div className="w-7 h-7 rounded-lg bg-gradient-sage flex items-center justify-center">
        <Leaf size={14} className="text-white" />
      </div>
      <h1 className="font-display font-semibold text-[var(--text-primary)] text-lg">{title}</h1>
    </header>
  )
}

// ── Desktop Page Header ───────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

// ── Bottom Nav (Mobile) ───────────────────────────────────
const BOTTOM_NAV = [
  { to: '/dashboard',    label: 'Home',    icon: LayoutDashboard },
  { to: '/transactions', label: 'Txns',    icon: ArrowLeftRight  },
  { to: '/debts',        label: 'Debts',   icon: CreditCard      },
  { to: '/budgets',      label: 'Budget',  icon: Target          },
  { to: '/savings',      label: 'Savings', icon: PiggyBank       },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg-card)] backdrop-blur-xl border-t border-[var(--border)] safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {BOTTOM_NAV.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-0 ${
                active
                  ? 'text-sage-600 dark:text-sage-300'
                  : 'text-warmgray-400 dark:text-warmgray-500'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
