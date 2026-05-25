import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Edit2, Trash2, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import { Input, Textarea, Select, Button, Badge, ProgressBar } from '@/components/ui'
import { formatCurrency, formatDate, daysUntil } from '@/utils'
import { DEBT_STATUSES } from '@/constants/categories'

const today = format(new Date(), 'yyyy-MM-dd')

// ── Debt Form ─────────────────────────────────────────────
export function DebtForm({ onSubmit, defaultValues, debtType = 'payable', loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      person_name: '',
      amount:      '',
      due_date:    '',
      status:      'pending',
      notes:       '',
      debt_type:   debtType,
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(d => onSubmit({ ...d, amount: parseFloat(d.amount) }))} className="space-y-4">
      <Input
        label={debtType === 'payable' ? 'Creditor (lent to you)' : 'Debtor (you lent to)'}
        placeholder="Name / person"
        icon={User}
        error={errors.person_name?.message}
        {...register('person_name', { required: 'Person name is required' })}
      />

      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Amount</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500 font-medium">Rp</span>
          <input
            type="number" min="0" placeholder="0"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300 ${errors.amount ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
            {...register('amount', { required: 'Amount is required', min: { value: 1, message: 'Must be > 0' } })}
          />
        </div>
        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Due Date</label>
          <input
            type="date"
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
            {...register('due_date')}
          />
        </div>
        <Select
          label="Status"
          options={DEBT_STATUSES}
          wrapperClass=""
          {...register('status')}
        />
      </div>

      <Textarea label="Notes" placeholder="Optional notes..." rows={2} {...register('notes')} />

      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        {defaultValues?.id ? 'Update' : `Add ${debtType === 'payable' ? 'Debt' : 'Receivable'}`}
      </Button>
    </form>
  )
}

// ── Debt Card ─────────────────────────────────────────────
export function DebtCard({ debt, onEdit, onDelete }) {
  const days = debt.due_date ? daysUntil(debt.due_date) : null
  const isOverdue = days !== null && days < 0 && debt.status !== 'paid'

  const statusVariant = {
    pending: 'pending',
    paid:    'paid',
    overdue: 'overdue',
    partial: 'warning',
  }[debt.status] || 'default'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-gradient-sage flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {debt.person_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="font-medium text-sm text-[var(--text-primary)]">{debt.person_name}</p>
            {debt.due_date && (
              <p className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-[var(--text-muted)]'}`}>
                <Calendar size={10} />
                {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d left`}
              </p>
            )}
          </div>
        </div>
        <Badge variant={statusVariant}>{debt.status}</Badge>
      </div>

      <p className="font-display text-xl font-semibold text-[var(--text-primary)] mb-1">
        {formatCurrency(debt.amount)}
      </p>

      {debt.notes && (
        <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">{debt.notes}</p>
      )}

      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[var(--border)] opacity-60 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(debt)} className="flex items-center gap-1 text-xs text-warmgray-500 hover:text-sage-600 px-2 py-1 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-colors">
          <Edit2 size={12} /> Edit
        </button>
        <button onClick={() => onDelete(debt.id)} className="flex items-center gap-1 text-xs text-warmgray-500 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </motion.div>
  )
}
