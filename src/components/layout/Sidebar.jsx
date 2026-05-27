import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Target,
  PiggyBank,
  Settings,
  LogOut,
  Leaf,
  PanelLeftClose,
  Wallet,
  PanelLeftOpen,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";
import toast from "react-hot-toast";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/wallets", label: "Wallets", icon: Wallet },
  { to: "/debts", label: "Debts", icon: CreditCard },
  { to: "/budgets", label: "Budgets", icon: Target },
  { to: "/savings", label: "Savings", icon: PiggyBank },
  { to: "/settings", label: "Settings", icon: Settings },
];

// Tooltip shown on icon-only mode
function NavTooltip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div
      className="relative flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50
                       px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap
                       bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-lg"
          >
            {label}
            {/* Arrow */}
            <span
              className="absolute right-full top-1/2 -translate-y-1/2
                             border-4 border-transparent border-r-[var(--text-primary)]"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  const avatar = user?.user_metadata?.avatar_url;
  const name =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="hidden md:flex flex-col h-screen sticky top-0 border-r border-[var(--border)]
                 bg-[var(--bg-card)] backdrop-blur-xl z-20 overflow-hidden flex-shrink-0"
    >
      {/* ── Logo / Collapse Toggle ───────────────────────── */}
      <div
        className={`flex items-center border-b border-[var(--border)] flex-shrink-0
                      ${collapsed ? "justify-center px-3 py-4" : "gap-3 px-4 py-5"}`}
      >
        {/* Logo icon — when collapsed it's the ONLY thing here, click to expand */}
        <motion.button
          onClick={() => collapsed && setCollapsed(false)}
          whileHover={collapsed ? { scale: 1.08 } : {}}
          whileTap={{ scale: 0.94 }}
          title={collapsed ? "Expand sidebar" : undefined}
          className={`w-9 h-9 rounded-xl bg-gradient-sage flex items-center justify-center
                      flex-shrink-0 shadow-soft transition-shadow
                      ${collapsed ? "cursor-pointer hover:shadow-soft-md ring-0 hover:ring-2 hover:ring-sage-300" : "cursor-default"}`}
        >
          <Leaf size={18} className="text-white" />
        </motion.button>

        {/* Brand text — only when expanded */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex-1 min-w-0"
            >
              <span
                className="font-display font-semibold text-[var(--text-primary)] text-lg
                               leading-tight whitespace-nowrap block"
              >
                Evermore
              </span>
              <p className="text-[10px] text-[var(--text-muted)] -mt-0.5 whitespace-nowrap">
                Finance Tracker
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse button — only visible when expanded */}
        <AnimatePresence>
          {!collapsed && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCollapsed(true)}
              title="Collapse sidebar"
              className="ml-auto p-1.5 rounded-lg hover:bg-warmgray-100 dark:hover:bg-warmgray-800
                         text-warmgray-400 hover:text-warmgray-600 transition-colors flex-shrink-0"
            >
              <PanelLeftClose size={16} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Nav Items ────────────────────────────────────── */}
      <nav
        className={`flex-1 py-4 overflow-y-auto space-y-1 ${collapsed ? "px-2" : "px-3"}`}
      >
        {NAV.map(({ to, label, icon: Icon }) =>
          collapsed ? (
            // Icon-only mode with tooltip
            <NavTooltip key={to} label={label}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center justify-center w-10 h-10 rounded-xl mx-auto
                   transition-all duration-200
                   ${
                     isActive
                       ? "bg-sage-100 dark:bg-sage-900/30 text-sage-600 dark:text-sage-300 shadow-inner-soft"
                       : "text-warmgray-400 hover:text-sage-500 hover:bg-sage-50 dark:hover:bg-sage-900/20"
                   }`
                }
              >
                {({ isActive }) => (
                  <Icon
                    size={18}
                    className={`flex-shrink-0 transition-colors ${isActive ? "text-sage-600 dark:text-sage-300" : ""}`}
                  />
                )}
              </NavLink>
            </NavTooltip>
          ) : (
            // Full label mode
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                 transition-all duration-200 group
                 ${
                   isActive
                     ? "nav-item-active font-semibold"
                     : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-sage-50 dark:hover:bg-sage-900/15"
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={`flex-shrink-0 transition-colors
                      ${isActive ? "text-sage-600 dark:text-sage-300" : "text-warmgray-400 group-hover:text-sage-500"}`}
                  />
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.05 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                </>
              )}
            </NavLink>
          ),
        )}
      </nav>

      {/* ── Theme Toggle ─────────────────────────────────── */}
      <div className={`pb-2 ${collapsed ? "px-2" : "px-3"}`}>
        {collapsed ? (
          <NavTooltip label={isDark ? "Light Mode" : "Dark Mode"}>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-xl mx-auto
                         text-warmgray-400 hover:text-sage-500 hover:bg-sage-50
                         dark:hover:bg-sage-900/20 transition-all"
            >
              <span className="text-base leading-none">
                {isDark ? "☀️" : "🌙"}
              </span>
            </button>
          </NavTooltip>
        ) : (
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                       text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                       hover:bg-sage-50 dark:hover:bg-sage-900/15 transition-all"
          >
            <span className="text-base flex-shrink-0">
              {isDark ? "☀️" : "🌙"}
            </span>
            <span className="whitespace-nowrap">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          </button>
        )}
      </div>

      {/* ── User & Sign Out ───────────────────────────────── */}
      <div
        className={`border-t border-[var(--border)] py-3 ${collapsed ? "px-2" : "px-3"}`}
      >
        {collapsed ? (
          // Collapsed: just avatar with tooltip
          <NavTooltip label={`${name} · Sign out`}>
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center w-10 h-10 mx-auto
                         rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20
                         transition-colors group"
              title="Sign out"
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-transparent
                                group-hover:ring-red-300 transition-all"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full bg-gradient-sage flex items-center
                                justify-center text-white text-xs font-bold
                                group-hover:opacity-70 transition-opacity"
                >
                  {initials}
                </div>
              )}
            </button>
          </NavTooltip>
        ) : (
          // Expanded: full user row
          <div className="flex items-center gap-3">
            {avatar ? (
              <img
                src={avatar}
                alt={name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full bg-gradient-sage flex items-center
                              justify-center text-white text-xs font-bold flex-shrink-0"
              >
                {initials}
              </div>
            )}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {name}
              </p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {user?.email}
              </p>
            </motion.div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20
                         text-warmgray-400 hover:text-red-500 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
