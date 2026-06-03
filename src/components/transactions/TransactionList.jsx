import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Trash2, RefreshCw } from 'lucide-react'
import { getCategoryById } from '@/constants/categories'
import { formatDate } from '@/utils'
import { Badge, EmptyState, Skeleton } from '@/components/ui'
import { ArrowLeftRight } from 'lucide-react'

// ── Transaction Item ──────────────────────────────────────
export function TransactionItem({ transaction: t, onEdit, onDelete, customCategories = [] }) {
  // Resolve category — cek built-in dulu, fallback ke custom
  const cat = getCategoryById(t.category, customCategories)
    ?? { id: t.category, label: t.category?.replace(/_/g, ' '), icon: '📦', color: '#a0a0a0' }

  const sub = t.transaction_subtype || 'regular'
  const isInternal = sub === 'transfer' || sub === 'topup' // perpindahan wallet

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 group transition-all duration-200"
    >
      {/* Category Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
        style={{ background: `${cat.color}22` }}
      >
        {cat.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">
            {t.description || cat.label}
          </p>
          {t.is_recurring && <RefreshCw size={11} className="text-warmgray-400 flex-shrink-0" />}
          {isInternal && <span className="text-[10px] text-warmgray-400 bg-warmgray-100 dark:bg-warmgray-800 px-1.5 py-0.5 rounded-md flex-shrink-0">internal</span>}
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          {formatDate(t.date, 'short')} · {cat.label}
          {t.payment_method && ` · ${t.payment_method.replace('_', ' ')}`}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-mono font-semibold ${isInternal ? 'text-warmgray-400' : t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
          {isInternal ? '↔' : t.type === 'income' ? '+' : '-'}
          {t.amount.toLocaleString('id-ID')}
        </p>
      </div>

      {/* Actions (hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex-shrink-0">
        <button
          onClick={() => onEdit(t)}
          className="p-1.5 rounded-lg hover:bg-sage-100 dark:hover:bg-sage-900/30 text-warmgray-400 hover:text-sage-600 transition-colors"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={() => onDelete(t.id)}
          className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-warmgray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Transaction List ──────────────────────────────────────
export function TransactionList({ transactions, onEdit, onDelete, loading, customCategories = [] }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (!transactions?.length) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="Belum ada transaksi"
        description="Tambahkan transaksi pertamamu."
      />
    )
  }

  // Group by date
  const grouped = transactions.reduce((acc, t) => {
    const key = (t.date || '').split('T')[0]
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  return (
    <AnimatePresence mode="popLayout">
      {Object.entries(grouped).map(([date, items]) => (
        <motion.div key={date} layout className="mb-1">
          <p className="text-xs font-medium text-[var(--text-muted)] px-3.5 py-2 uppercase tracking-wide">
            {formatDate(date, 'medium')}
          </p>
          {items.map(t => (
            <TransactionItem
              key={t.id}
              transaction={t}
              onEdit={onEdit}
              onDelete={onDelete}
              customCategories={customCategories}
            />
          ))}
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
