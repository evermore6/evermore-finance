import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Edit2, Trash2, Plus, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import { Button, ProgressBar, Badge } from '@/components/ui'
import { formatCurrency, formatDate, daysUntil } from '@/utils'
import { EXPENSE_CATEGORIES } from '@/constants/categories'
import { useCustomCategories } from '@/hooks'
import { useBudgetItems } from '@/hooks'

// ═══════════════════════════════════════════════════════════════
// BUDGET COMPONENTS
// ═══════════════════════════════════════════════════════════════

export function BudgetForm({ onSubmit, defaultValues, loading }) {
  const now = new Date()
  const { categories: customCats } = useCustomCategories()
  const allExpenseCats = [
    ...EXPENSE_CATEGORIES,
    ...customCats.filter(c => c.type === 'expense').map(c => ({ id: c.id, label: c.name, icon: c.icon })),
  ]

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      category: 'food_beverage',
      amount: '',
      year:  now.getFullYear(),
      month: now.getMonth(),
      notes: '',
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(d => onSubmit({
      ...d,
      amount: parseFloat(d.amount),
      year:   parseInt(d.year),
      month:  parseInt(d.month),
    }))} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Category</label>
        <select
          className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] focus:outline-none focus:border-sage-400"
          {...register('category', { required: true })}
        >
          {allExpenseCats.map(c => (
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

      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
          Notes <span className="text-[var(--text-muted)] font-normal">(opsional)</span>
        </label>
        <textarea
          placeholder="Catatan umum untuk budget ini…"
          rows={2}
          className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] placeholder:text-warmgray-400 resize-none focus:outline-none focus:border-sage-400"
          {...register('notes')}
        />
      </div>

      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        {defaultValues?.id ? 'Update Budget' : 'Set Budget'}
      </Button>
    </form>
  )
}

// ── Budget Items Panel ─────────────────────────────────────
function BudgetItemsPanel({ budgetId, budgetAmount, userId }) {
  const { items, loading, totalAllocated, totalChecked, addItem, toggleItem, deleteItem } = useBudgetItems(budgetId)
  const [newName,   setNewName]   = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [adding,    setAdding]    = useState(false)

  const unallocated = budgetAmount - totalAllocated

  const handleAdd = async () => {
    if (!newName.trim()) return
    await addItem({ name: newName.trim(), amount: parseFloat(newAmount) || 0, is_checked: false })
    setNewName('')
    setNewAmount('')
    setAdding(false)
  }

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
          Breakdown {items.length > 0 ? `(${items.length})` : ''}
        </p>
        {unallocated > 0 && items.length > 0 && (
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            unallocated {formatCurrency(unallocated)}
          </span>
        )}
      </div>

      {/* Item list */}
      <AnimatePresence>
        {items.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 group"
          >
            {/* Checkbox */}
            <button
              onClick={() => toggleItem(item.id, item.is_checked)}
              className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all
                ${item.is_checked
                  ? 'bg-sage-400 border-sage-400'
                  : 'border-warmgray-300 dark:border-warmgray-600 hover:border-sage-400'
                }`}
            >
              {item.is_checked && <Check size={10} className="text-white" />}
            </button>

            {/* Name */}
            <span className={`flex-1 text-xs transition-all ${item.is_checked ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
              {item.name}
            </span>

            {/* Amount */}
            {item.amount > 0 && (
              <span className={`text-xs font-mono font-medium flex-shrink-0 ${item.is_checked ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                {formatCurrency(item.amount)}
              </span>
            )}

            {/* Delete (hover) */}
            <button
              onClick={() => deleteItem(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-warmgray-400 hover:text-red-500"
            >
              <X size={11} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Add new item */}
      {adding ? (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-2"
        >
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
            placeholder="Nama item…"
            className="flex-1 px-2.5 py-1.5 rounded-lg border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-xs focus:outline-none focus:border-sage-400"
          />
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-warmgray-400">Rp</span>
            <input
              type="number" min="0"
              value={newAmount}
              onChange={e => setNewAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="0"
              className="w-24 pl-6 pr-2 py-1.5 rounded-lg border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-xs font-mono focus:outline-none focus:border-sage-400"
            />
          </div>
          <button onClick={handleAdd} className="p-1.5 rounded-lg bg-sage-400 hover:bg-sage-500 text-white transition-colors flex-shrink-0">
            <Check size={12} />
          </button>
          <button onClick={() => setAdding(false)} className="p-1.5 rounded-lg hover:bg-warmgray-100 dark:hover:bg-warmgray-800 text-warmgray-400 transition-colors flex-shrink-0">
            <X size={12} />
          </button>
        </motion.div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-sage-600 dark:hover:text-sage-300 transition-colors mt-1 group"
        >
          <Plus size={11} className="group-hover:scale-110 transition-transform" />
          Tambah item
        </button>
      )}

      {/* Summary kalau ada items */}
      {items.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] mt-2">
          <span className="text-[10px] text-[var(--text-muted)]">
            {items.filter(i => i.is_checked).length}/{items.length} selesai
          </span>
          {totalAllocated > 0 && (
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              allocated {formatCurrency(totalAllocated)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Budget Card ────────────────────────────────────────────
export function BudgetCard({ budget, spent = 0, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const cat = EXPENSE_CATEGORIES.find(c => c.id === budget.category)
  const pct = Math.min((spent / budget.amount) * 100, 100)
  const remaining = budget.amount - spent
  // Over hanya kalau MELEBIHI (> 100%), bukan tepat 100%
  const isOver    = pct > 100
  const isWarning = pct >= 80 && pct <= 100
  const variant   = isOver ? 'overdue' : isWarning ? 'warning' : 'paid'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 group"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
            style={{ background: `${cat?.color || '#a3b18a'}22` }}>
            {cat?.icon || '📦'}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{cat?.label || budget.category}</p>
            <p className="text-xs text-[var(--text-muted)]">{Math.min(pct, 100).toFixed(0)}% terpakai</p>
          </div>
        </div>
        <Badge variant={variant}>{isOver ? 'Over!' : isWarning ? 'Warning' : 'OK'}</Badge>
      </div>

      {/* Progress */}
      <ProgressBar value={spent} max={budget.amount} className="mb-3" />

      {/* Numbers */}
      <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
        <span>Dipakai: <span className="font-medium text-[var(--text-primary)]">{formatCurrency(spent)}</span></span>
        <span className={remaining < 0 ? 'text-red-500 font-medium' : remaining === 0 ? 'text-sage-600 dark:text-sage-300 font-medium' : ''}>
          {remaining < 0
            ? `Lebih ${formatCurrency(Math.abs(remaining))}`
            : remaining === 0
              ? 'Tepat terpenuhi ✓'
              : `Sisa ${formatCurrency(remaining)}`}
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)]">Budget: {formatCurrency(budget.amount)}</p>

      {/* Notes */}
      {budget.notes && (
        <p className="text-xs text-[var(--text-muted)] mt-2 italic line-clamp-2">"{budget.notes}"</p>
      )}

      {/* Budget Items Toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-sage-600 dark:hover:text-sage-300 transition-colors mt-3 w-full"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span>{expanded ? 'Sembunyikan' : 'Lihat'} breakdown</span>
      </button>

      {/* Budget Items Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <BudgetItemsPanel
              budgetId={budget.id}
              budgetAmount={budget.amount}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-3 mt-2 border-t border-[var(--border)] opacity-60 group-hover:opacity-100 transition-opacity">
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

// ═══════════════════════════════════════════════════════════════
// SAVINGS COMPONENTS
// ═══════════════════════════════════════════════════════════════

export function SavingsForm({ onSubmit, defaultValues, loading }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
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
    <form onSubmit={handleSubmit(d => onSubmit({
      ...d,
      target_amount:  parseFloat(d.target_amount),
      current_amount: parseFloat(d.current_amount || 0),
    }))} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Goal Name</label>
        <input
          placeholder="e.g. Emergency Fund, Vacation…"
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300 ${errors.name ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
          {...register('name', { required: 'Goal name is required' })}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Icon</label>
        <div className="flex flex-wrap gap-2">
          {GOAL_ICONS.map(icon => (
            <label key={icon} className="cursor-pointer">
              <input type="radio" value={icon} className="sr-only" {...register('icon')} />
              <span className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-colors ${watch('icon') === icon ? 'bg-sage-100 dark:bg-sage-900/30 ring-2 ring-sage-300' : ''}`}>
                {icon}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Target</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warmgray-500">Rp</span>
            <input type="number" min="0" placeholder="0"
              className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm font-mono bg-white/60 dark:bg-warmgray-900/40 focus:outline-none focus:border-sage-400 ${errors.target_amount ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
              {...register('target_amount', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })} />
          </div>
          {errors.target_amount && <p className="text-xs text-red-500 mt-1">{errors.target_amount.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Current</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-warmgray-500">Rp</span>
            <input type="number" min="0" placeholder="0"
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 text-sm font-mono bg-white/60 dark:bg-warmgray-900/40 focus:outline-none focus:border-sage-400"
              {...register('current_amount')} />
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Deadline <span className="text-[var(--text-muted)] font-normal">(opsional)</span></label>
        <input type="date"
          className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
          {...register('deadline')} />
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
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 group">
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

      <div className="flex justify-between text-xs mb-1">
        <span className="text-[var(--text-muted)]">Tersimpan: <span className="text-[var(--text-primary)] font-medium">{formatCurrency(goal.current_amount)}</span></span>
        <span className="text-[var(--text-muted)]">Target: <span className="text-[var(--text-primary)] font-medium">{formatCurrency(goal.target_amount)}</span></span>
      </div>
      {!isComplete && <p className="text-xs text-[var(--text-muted)] mb-3">Sisa {formatCurrency(remaining)}</p>}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
        {!isComplete && (
          <button onClick={() => onContribute(goal)}
            className="flex items-center gap-1 text-xs text-sage-600 dark:text-sage-300 font-medium px-2.5 py-1.5 rounded-lg bg-sage-50 dark:bg-sage-900/20 hover:bg-sage-100 dark:hover:bg-sage-900/30 transition-colors">
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
