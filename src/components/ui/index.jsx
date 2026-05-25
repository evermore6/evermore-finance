import { forwardRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

// ── Button ────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  loading = false, icon: Icon, className = '', ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-body font-medium rounded-xl transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

  const variants = {
    primary:  'bg-sage-400 hover:bg-sage-500 text-white shadow-soft hover:shadow-soft-md',
    secondary:'bg-cream-100 dark:bg-warmgray-800 hover:bg-cream-200 dark:hover:bg-warmgray-700 text-sage-700 dark:text-sage-300 border border-sage-200 dark:border-warmgray-600',
    ghost:    'hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-600 dark:text-warmgray-300',
    danger:   'bg-red-500 hover:bg-red-600 text-white',
    outline:  'border border-sage-300 dark:border-sage-700 hover:bg-sage-50 dark:hover:bg-sage-900/20 text-sage-700 dark:text-sage-300',
  }

  const sizes = {
    sm:   'px-3 py-1.5 text-xs',
    md:   'px-4 py-2 text-sm',
    lg:   'px-6 py-3 text-base',
    xl:   'px-8 py-4 text-lg',
    icon: 'p-2',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      ) : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, className = '', hover = false, padding = true, ...props }) {
  return (
    <div
      className={`glass-card rounded-2xl ${padding ? 'p-5' : ''} ${hover ? 'cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default:  'bg-warmgray-100 dark:bg-warmgray-800 text-warmgray-600 dark:text-warmgray-300',
    income:   'bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300',
    expense:  'bg-peach-100 dark:bg-peach-900/30 text-peach-700 dark:text-peach-300',
    pending:  'badge-pending',
    paid:     'badge-paid',
    overdue:  'badge-overdue',
    warning:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    info:     'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}

// ── Progress Bar ──────────────────────────────────────────
export function ProgressBar({ value, max = 100, showLabel = false, className = '' }) {
  const pct     = Math.min((value / max) * 100, 100)
  const variant = pct >= 100 ? 'danger' : pct >= 80 ? 'warning' : ''
  return (
    <div className={`progress-bar ${className}`}>
      <motion.div
        className={`progress-fill ${variant}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────
// Uses forwardRef so react-hook-form's register() ref reaches the native <input>
export const Input = forwardRef(function Input(
  { label, error, hint, icon: Icon, suffix, className = '', wrapperClass = '', ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClass}`}>
      {label && (
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-warmgray-400">
            <Icon size={16} />
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-xl border border-warmgray-200 dark:border-warmgray-700
            bg-white/60 dark:bg-warmgray-900/40
            text-sm text-[var(--text-primary)] placeholder:text-warmgray-400
            transition-all duration-200
            focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300
            ${Icon ? 'pl-9' : 'px-3.5'} ${suffix ? 'pr-12' : 'pr-3.5'} py-2.5
            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : ''}
            ${className}
          `}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-warmgray-400 font-medium">
            {suffix}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-warmgray-400">{hint}</p>}
    </div>
  )
})

// ── Select ────────────────────────────────────────────────
// Uses forwardRef so react-hook-form's register() ref reaches the native <select>
export const Select = forwardRef(function Select(
  { label, error, options = [], className = '', wrapperClass = '', ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClass}`}>
      {label && (
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full rounded-xl border border-warmgray-200 dark:border-warmgray-700
          bg-white/60 dark:bg-warmgray-900/40
          text-sm text-[var(--text-primary)]
          px-3.5 py-2.5 transition-all duration-200
          focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300
          ${error ? 'border-red-400' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value ?? opt.id} value={opt.value ?? opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

// ── Textarea ──────────────────────────────────────────────
// Uses forwardRef so react-hook-form's register() ref reaches the native <textarea>
export const Textarea = forwardRef(function Textarea(
  { label, error, className = '', wrapperClass = '', ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClass}`}>
      {label && (
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`
          w-full rounded-xl border border-warmgray-200 dark:border-warmgray-700
          bg-white/60 dark:bg-warmgray-900/40
          text-sm text-[var(--text-primary)] placeholder:text-warmgray-400
          px-3.5 py-2.5 resize-none transition-all duration-200
          focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300
          ${error ? 'border-red-400' : ''}
          ${className}
        `}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})

// ── Toggle ────────────────────────────────────────────────
export function Toggle({ checked, onChange, label, size = 'md' }) {
  const sizes = { sm: 'w-8 h-4', md: 'w-11 h-6' }
  const knob  = { sm: 'w-3 h-3', md: 'w-5 h-5' }
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 ${sizes[size]} ${checked ? 'bg-sage-400' : 'bg-warmgray-300 dark:bg-warmgray-600'}`}
      >
        <span
          className={`inline-block rounded-full bg-white shadow transition-transform duration-200 ${knob[size]} ${checked ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0.5'}`}
        />
      </button>
      {label && <span className="text-sm text-warmgray-600 dark:text-warmgray-300">{label}</span>}
    </label>
  )
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const sizes = {
    sm:    'max-w-sm',
    md:    'max-w-md',
    lg:    'max-w-lg',
    xl:    'max-w-xl',
    '2xl': 'max-w-2xl',
  }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={`relative w-full ${sizes[size]} bg-[var(--bg-primary)] rounded-2xl shadow-2xl overflow-hidden`}
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: 20,  scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-warmgray-100 dark:hover:bg-warmgray-800 transition-colors text-warmgray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--border)] bg-cream-50/50 dark:bg-warmgray-900/30">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ── Empty State ───────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-sage-50 dark:bg-sage-900/20 flex items-center justify-center mb-4">
          <Icon size={28} className="text-sage-400" />
        </div>
      )}
      <h3 className="font-display font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`shimmer rounded-xl ${className}`} />
}

// ── Amount Display ────────────────────────────────────────
export function AmountText({ amount, type, className = '' }) {
  const cls    = type === 'income' ? 'amount-income' : 'amount-expense'
  const prefix = type === 'income' ? '+' : '-'
  return (
    <span className={`font-mono font-medium ${cls} ${className}`}>
      {prefix}{Math.abs(amount).toLocaleString('id-ID')}
    </span>
  )
}
