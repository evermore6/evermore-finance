import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, Target,
  PiggyBank, Settings, LogOut, Leaf, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useState } from 'react'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight   },
  { to: '/debts',        label: 'Debts',        icon: CreditCard       },
  { to: '/budgets',      label: 'Budgets',      icon: Target           },
  { to: '/savings',      label: 'Savings',      icon: PiggyBank        },
  { to: '/settings',     label: 'Settings',     icon: Settings         },
]

export function Sidebar() {
  const { user, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const avatar = user?.user_metadata?.avatar_url
  const name   = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="hidden md:flex flex-col h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--bg-card)] backdrop-blur-xl z-20 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-9 h-9 rounded-xl bg-gradient-sage flex items-center justify-center flex-shrink-0 shadow-soft">
          <Leaf size={18} className="text-white" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-hidden"
          >
            <span className="font-display font-semibold text-[var(--text-primary)] text-lg leading-tight whitespace-nowrap">
              Evermore
            </span>
            <p className="text-[10px] text-[var(--text-muted)] -mt-0.5">Finance Tracker</p>
          </motion.div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto p-1.5 rounded-lg hover:bg-warmgray-100 dark:hover:bg-warmgray-800 text-warmgray-500 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
               ${isActive ? 'nav-item-active font-semibold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-sage-50 dark:hover:bg-sage-900/15'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-colors ${isActive ? 'text-sage-600 dark:text-sage-300' : 'text-warmgray-400 group-hover:text-sage-500'}`}
                />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="px-3 pb-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-sage-50 dark:hover:bg-sage-900/15 transition-all"
        >
          <span className="text-base flex-shrink-0">{isDark ? '☀️' : '🌙'}</span>
          {!collapsed && <span className="whitespace-nowrap">{isDark ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
      </div>

      {/* User & Sign Out */}
      <div className="border-t border-[var(--border)] px-3 py-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          {avatar ? (
            <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-sage flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
            </motion.div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-warmgray-400 hover:text-red-500 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
