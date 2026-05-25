import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, RECURRING_FREQUENCIES } from '@/constants/categories'
import { Input, Select, Textarea, Toggle, Button } from '@/components/ui'

const today = format(new Date(), 'yyyy-MM-dd')

export function TransactionForm({ onSubmit, defaultValues, loading }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date:           today,
      type:           'expense',
      category:       'food_beverage',
      amount:         '',
      payment_method: 'cash',
      description:    '',
      is_recurring:   false,
      frequency:      'monthly',
      ...defaultValues,
    },
  })

  const type        = watch('type')
  const isRecurring = watch('is_recurring')

  // Reset category when type changes
  useEffect(() => {
    if (type === 'expense') setValue('category', 'food_beverage')
    else setValue('category', 'salary')
  }, [type, setValue])

  useEffect(() => {
    if (defaultValues) reset({ date: today, ...defaultValues })
  }, [defaultValues, reset])

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const onFormSubmit = (data) => {
    onSubmit({ ...data, amount: parseFloat(data.amount) })
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Type Toggle */}
      <div className="flex rounded-xl overflow-hidden border border-warmgray-200 dark:border-warmgray-700 p-1 gap-1 bg-warmgray-50 dark:bg-warmgray-900/40">
        {['expense', 'income'].map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setValue('type', t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize
              ${type === t
                ? t === 'expense'
                  ? 'bg-peach-200 dark:bg-peach-900/40 text-peach-800 dark:text-peach-300'
                  : 'bg-sage-200 dark:bg-sage-900/40 text-sage-800 dark:text-sage-300'
                : 'text-warmgray-500 hover:text-warmgray-700 dark:hover:text-warmgray-300'
              }`}
          >
            {t === 'expense' ? '💸 Expense' : '💰 Income'}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500 font-medium">Rp</span>
          <input
            type="number"
            step="1"
            min="0"
            placeholder="0"
            className={`
              w-full pl-10 pr-4 py-3 rounded-xl border text-lg font-mono font-medium
              bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)]
              transition-all duration-200 focus:outline-none focus:ring-1
              ${errors.amount
                ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                : 'border-warmgray-200 dark:border-warmgray-700 focus:border-sage-400 focus:ring-sage-300'
              }
            `}
            {...register('amount', {
              required: 'Amount is required',
              min: { value: 1, message: 'Amount must be > 0' },
            })}
          />
        </div>
        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
      </div>

      {/* Date + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Date</label>
          <input
            type="date"
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300"
            {...register('date', { required: true })}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Category</label>
          <select
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300"
            {...register('category', { required: true })}
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Payment Method</label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setValue('payment_method', m.id)}
              className={`py-2 px-1 rounded-xl text-center text-xs transition-all border
                ${watch('payment_method') === m.id
                  ? 'bg-sage-100 dark:bg-sage-900/30 border-sage-300 dark:border-sage-700 text-sage-700 dark:text-sage-300 font-medium'
                  : 'bg-warmgray-50 dark:bg-warmgray-900/40 border-warmgray-200 dark:border-warmgray-700 text-warmgray-500 hover:border-sage-200'
                }`}
            >
              <div className="text-base">{m.icon}</div>
              <div className="truncate">{m.label.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <Textarea
        label="Description"
        placeholder="What was this for?"
        rows={2}
        {...register('description')}
      />

      {/* Recurring Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-cream-50 dark:bg-warmgray-900/30 border border-warmgray-100 dark:border-warmgray-800">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Recurring</p>
          <p className="text-xs text-[var(--text-muted)]">Auto-add this transaction periodically</p>
        </div>
        <Toggle
          checked={isRecurring}
          onChange={(v) => setValue('is_recurring', v)}
        />
      </div>

      {isRecurring && (
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Frequency</label>
          <select
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] focus:outline-none focus:border-sage-400"
            {...register('frequency')}
          >
            {RECURRING_FREQUENCIES.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
        {defaultValues?.id ? 'Update Transaction' : 'Add Transaction'}
      </Button>
    </form>
  )
}
