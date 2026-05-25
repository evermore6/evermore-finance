import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Edit2, Trash2, Plus, Target } from 'lucide-react'
import { format } from 'date-fns'
import { Button, ProgressBar, Badge } from '@/components/ui'
import { formatCurrency, formatDate, daysUntil } from '@/utils'
import { EXPENSE_CATEGORIES } from '@/constants/categories'

// ═══════════════════════════════════════════════════
// BUDGET COMPONENTS
// ═══════════════════════════════════════════════════

export function BudgetForm({ onSubmit, defaultValues, loading }) {
  const now = new Date()
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      category: 'food_beverage',
      amount:   '',
      year:     now.getFullYear(),
      month:    now.getMonth(),
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(d => onSubmit({ ...d, amount: parseFloat(d.amount), year: parseInt(d.year), month: parseInt(d.month) }))} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Category</label>
        <select
          className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] focus:outline-none focus:border-sage-400"
          {...register('category', { required: true })}
        >
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Budget Amount</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500 font-medium">Rp</span>
          <input
            type="number" min="0" placeholder="0"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)] focus:outline-none focus:border-sage-400 ${errors.amount ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
            {...register('amount', { required: 'Amount is required', min: { value: 1, message: 'Must be > 0' } })}
          />
        </div>
        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
      </div>

      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        {defaultValues?.id ? 'Update Budget' : 'Set Budget'}
      </Button>
    </form>
  )
}

export function BudgetCard({ budget, spent = 0, onEdit, onDelete }) {
  const cat = EXPENSE_CATEGORIES.find(c => c.id === budget.category)
  const pct = Math.min((spent / budget.amount) * 100, 100)
  const remaining = budget.amount - spent
  const variant = pct >= 100 ? 'overdue' : pct >= 80 ? 'warning' : 'paid'

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ background: `${cat?.color}22` }}>
            {cat?.icon || '📦'}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{cat?.label || budget.category}</p>
            <p className="text-xs text-[var(--text-muted)]">{pct.toFixed(0)}% used</p>
          </div>
        </div>
        <Badge variant={variant}>{pct >= 100 ? 'Over!' : pct >= 80 ? 'Warning' : 'OK'}</Badge>
      </div>

      <ProgressBar value={spent} max={budget.amount} className="mb-3" />

      <div className="flex justify-between text-xs text-[var(--text-muted)]">
        <span>Spent: <span className="font-medium text-[var(--text-primary)]">{formatCurrency(spent)}</span></span>
        <span>Left: <span className={`font-medium ${remaining < 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>{formatCurrency(Math.abs(remaining))}</span></span>
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-1">Budget: {formatCurrency(budget.amount)}</p>

      <div className="flex items-center justify-end gap-1.5 pt-2 mt-2 border-t border-[var(--border)] opacity-60 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(budget)} className="flex items-center gap-1 text-xs text-warmgray-500 hover:text-sage-600 px-2 py-1 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-colors">
          <Edit2 size={12} /> Edit
        </button>
        <button onClick={() => onDelete(budget.id)} className="flex items-center gap-1 text-xs text-warmgray-500 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════
// SAVINGS COMPONENTS
// ═══════════════════════════════════════════════════

export function SavingsForm({ onSubmit, defaultValues, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name:           '',
      target_amount:  '',
      current_amount: '0',
      deadline:       '',
      icon:           '🎯',
      notes:          '',
      ...defaultValues,
    },
  })

  const GOAL_ICONS = ['🎯','🏠','✈️','🎓','🚗','💍','💻','📱','🌴','💪','🐾','🎁']

  return (
    <form onSubmit={handleSubmit(d => onSubmit({ ...d, target_amount: parseFloat(d.target_amount), current_amount: parseFloat(d.current_amount || 0) }))} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Goal Name</label>
        <input
          placeholder="e.g. Emergency Fund, Vacation..."
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300 ${errors.name ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
          {...register('name', { required: 'Goal name is required' })}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-2">Icon</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map(icon => (
            <label key={icon} className="cursor-pointer">
              <input type="radio" value={icon} className="sr-only" {...register('icon')} />
              <span className="text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-colors">{icon}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Target</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warmgray-500">Rp</span>
            <input type="number" min="0" placeholder="0" className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm font-mono bg-white/60 dark:bg-warmgray-900/40 focus:outline-none focus:border-sage-400 ${errors.target_amount ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
              {...register('target_amount', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })} />
          </div>
          {errors.target_amount && <p className="text-xs text-red-500 mt-1">{errors.target_amount.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Current</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warmgray-500">Rp</span>
            <input type="number" min="0" placeholder="0" className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 text-sm font-mono bg-white/60 dark:bg-warmgray-900/40 focus:outline-none focus:border-sage-400"
              {...register('current_amount')} />
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Deadline (optional)</label>
        <input type="date" className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400" {...register('deadline')} />
      </div>

      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        {defaultValues?.id ? 'Update Goal' : 'Create Goal'}
      </Button>
    </form>
  )
}

export function SavingsCard({ goal, onEdit, onDelete, onContribute }) {
  const pct = Math.min((goal.current_amount / goal.target_amount) * 100, 100)
  const remaining = goal.target_amount - goal.current_amount
  const days = goal.deadline ? daysUntil(goal.deadline) : null
  const isComplete = pct >= 100

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-warm dark:bg-gradient-dusk flex items-center justify-center text-xl">
            {goal.icon || '🎯'}
          </div>
          <div>
            <p className="font-medium text-sm text-[var(--text-primary)]">{goal.name}</p>
            {days !== null && !isComplete && (
              <p className={`text-xs ${days < 0 ? 'text-red-500' : days < 30 ? 'text-amber-500' : 'text-[var(--text-muted)]'}`}>
                {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
              </p>
            )}
            {isComplete && <Badge variant="paid">Completed! 🎉</Badge>}
          </div>
        </div>
        <span className="font-mono text-sm font-semibold text-sage-600 dark:text-sage-300">{pct.toFixed(0)}%</span>
      </div>

      <ProgressBar value={goal.current_amount} max={goal.target_amount} className="mb-3" />

      <div className="flex justify-between text-xs mb-3">
        <span className="text-[var(--text-muted)]">Saved: <span className="text-[var(--text-primary)] font-medium">{formatCurrency(goal.current_amount)}</span></span>
        <span className="text-[var(--text-muted)]">Target: <span className="text-[var(--text-primary)] font-medium">{formatCurrency(goal.target_amount)}</span></span>
      </div>

      {!isComplete && (
        <p className="text-xs text-[var(--text-muted)] mb-3">
          {formatCurrency(remaining)} remaining
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        {!isComplete && (
          <button onClick={() => onContribute(goal)} className="flex items-center gap-1 text-xs text-sage-600 dark:text-sage-300 font-medium px-2.5 py-1.5 rounded-lg bg-sage-50 dark:bg-sage-900/20 hover:bg-sage-100 dark:hover:bg-sage-900/30 transition-colors">
            <Plus size={12} /> Add Funds
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto opacity-60 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(goal)} className="flex items-center gap-1 text-xs text-warmgray-500 hover:text-sage-600 px-2 py-1 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-colors">
            <Edit2 size={12} /> Edit
          </button>
          <button onClick={() => onDelete(goal.id)} className="flex items-center gap-1 text-xs text-warmgray-500 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>
    </motion.div>
  )
}
