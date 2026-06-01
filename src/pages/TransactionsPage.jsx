import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, X, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { useTransactions, useWallets, useSavingsGoals, useCustomCategories } from '@/hooks'
import { QuickAddModal } from '@/components/transactions/QuickAddModal'
import { TransactionList } from '@/components/transactions/TransactionList'
import { Modal, Button, Card, Toggle, Textarea } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, RECURRING_FREQUENCIES } from '@/constants/categories'
import { formatCurrency } from '@/utils'
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils'
import toast from 'react-hot-toast'

// ── Edit Transaction Form (inline, simpler than QuickAdd) ─
function EditTransactionForm({ transaction, wallets, customCategories, onSubmit, loading }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      type:           transaction.type,
      category:       transaction.category,
      amount:         String(transaction.amount),
      date:           transaction.date?.split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
      payment_method: transaction.payment_method || 'cash',
      description:    transaction.description || '',
      wallet_id:      transaction.wallet_id || '',
      is_recurring:   transaction.is_recurring || false,
      frequency:      transaction.frequency || 'monthly',
    },
  })

  const type        = watch('type')
  const isRecurring = watch('is_recurring')

  const baseCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const customCats = (customCategories || []).filter(c => c.type === type)
  const allCategories = [
    ...baseCategories,
    ...customCats.map(c => ({ id: c.id, label: c.name, icon: c.icon })),
  ]

  const onFormSubmit = (data) => {
    const { frequency, ...fields } = data
    onSubmit({
      ...fields,
      amount:   parseFloat(data.amount),
      frequency,
      transaction_subtype: transaction.transaction_subtype || 'regular',
    })
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      {/* Type toggle */}
      <div className="flex rounded-xl overflow-hidden border border-warmgray-200 dark:border-warmgray-700 p-1 gap-1 bg-warmgray-50 dark:bg-warmgray-900/40">
        {['expense', 'income'].map(t => (
          <button key={t} type="button" onClick={() => setValue('type', t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize
              ${type === t
                ? t === 'expense'
                  ? 'bg-peach-200 dark:bg-peach-900/40 text-peach-800 dark:text-peach-300'
                  : 'bg-sage-200 dark:bg-sage-900/40 text-sage-800 dark:text-sage-300'
                : 'text-warmgray-500'
              }`}
          >
            {t === 'expense' ? '💸 Expense' : '💰 Income'}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Nominal</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500 font-medium">Rp</span>
          <input
            type="number" step="1" min="0" placeholder="0"
            className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xl font-mono font-semibold
              bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)]
              focus:outline-none focus:ring-1 transition-all
              ${errors.amount ? 'border-red-400 focus:ring-red-200' : 'border-warmgray-200 dark:border-warmgray-700 focus:border-sage-400 focus:ring-sage-300'}`}
            {...register('amount', { required: 'Wajib diisi', min: { value: 1, message: 'Harus > 0' } })}
          />
        </div>
        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
      </div>

      {/* Date + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Tanggal</label>
          <input type="date"
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
            {...register('date', { required: true })} />
        </div>
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Kategori</label>
          <select
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
            {...register('category', { required: true })}>
            {allCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Metode Bayar</label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(m => (
            <button key={m.id} type="button" onClick={() => setValue('payment_method', m.id)}
              className={`py-2 px-1 rounded-xl text-center text-xs transition-all border
                ${watch('payment_method') === m.id
                  ? 'bg-sage-100 dark:bg-sage-900/30 border-sage-300 text-sage-700 font-medium'
                  : 'bg-warmgray-50 dark:bg-warmgray-900/40 border-warmgray-200 dark:border-warmgray-700 text-warmgray-500'
                }`}>
              <div className="text-base">{m.icon}</div>
              <div className="truncate">{m.label.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet */}
      {wallets?.length > 0 && (
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
            {type === 'expense' ? 'Bayar dari' : 'Masuk ke'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setValue('wallet_id', '')}
              className={`py-2 px-2 rounded-xl text-xs transition-all border text-center
                ${!watch('wallet_id') ? 'border-warmgray-400 bg-warmgray-100 dark:bg-warmgray-800 text-warmgray-700 font-medium' : 'border-warmgray-200 dark:border-warmgray-700 text-warmgray-400'}`}>
              <div className="text-base mb-0.5">🚫</div>
              <div>Skip</div>
            </button>
            {wallets.map(w => (
              <button key={w.id} type="button" onClick={() => setValue('wallet_id', w.id)}
                className={`py-2 px-2 rounded-xl text-center text-xs transition-all border
                  ${watch('wallet_id') === w.id
                    ? 'border-sage-300 bg-sage-50 dark:bg-sage-900/20 text-sage-700 font-medium ring-1 ring-sage-300'
                    : 'border-warmgray-200 dark:border-warmgray-700 text-warmgray-500'
                  }`}>
                <div className="text-base mb-0.5">{w.icon}</div>
                <div className="truncate font-medium">{w.name}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Textarea label="Keterangan" placeholder="Untuk apa?" rows={2} {...register('description')} />

      {/* Recurring */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-cream-50 dark:bg-warmgray-900/30 border border-warmgray-100 dark:border-warmgray-800">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Recurring</p>
          <p className="text-xs text-[var(--text-muted)]">Otomatis tambah berkala</p>
        </div>
        <Toggle checked={isRecurring} onChange={v => setValue('is_recurring', v)} />
      </div>
      {isRecurring && (
        <select
          className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
          {...register('frequency')}>
          {RECURRING_FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      )}

      <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
        Update Transaksi
      </Button>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────
export default function TransactionsPage() {
  const now = new Date()
  const [viewDate, setViewDate]   = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [search,   setSearch]     = useState('')
  const [typeFilter, setType]     = useState('')
  const [catFilter,  setCat]      = useState('')
  const [showAdd,    setShowAdd]  = useState(false)
  const [editItem,   setEditItem] = useState(null)
  const [addLoading, setAddLoading] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [showExport,  setShowExport]  = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { transactions, income, expense, loading, addTransaction, updateTransaction, deleteTransaction } =
    useTransactions({ ...viewDate, filters: { type: typeFilter, search } })
  const { wallets, applyBalanceDelta } = useWallets()
  const { goals }                      = useSavingsGoals()
  const { categories: customCats }     = useCustomCategories()

  const displayed = useMemo(() => {
    if (!catFilter) return transactions
    return transactions.filter(t => t.category === catFilter)
  }, [transactions, catFilter])

  const handleAdd = async (data) => {
    setAddLoading(true)
    const { error } = await addTransaction(data, applyBalanceDelta)
    setAddLoading(false)
    if (!error) setShowAdd(false)
  }

  const handleEdit = async (data) => {
    setEditLoading(true)
    const { error } = await updateTransaction(editItem.id, data, editItem, applyBalanceDelta)
    setEditLoading(false)
    if (!error) setEditItem(null)
  }

  const handleDelete = async (id) => {
    await deleteTransaction(id, applyBalanceDelta)
    setDeleteConfirm(null)
  }

  const navigateMonth = (dir) => {
    setViewDate(prev => {
      let m = prev.month + dir, y = prev.year
      if (m > 11) { m = 0; y++ }
      if (m < 0)  { m = 11; y-- }
      return { year: y, month: m }
    })
  }

  const monthLabel = new Date(viewDate.year, viewDate.month, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  const catOptions = typeFilter === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleExport = async (format) => {
    if (!displayed.length) { toast.error('No transactions to export'); return }
    setShowExport(false)
    const fn = `evermore-${viewDate.year}-${viewDate.month + 1}`
    if (format === 'csv')   { exportToCSV(displayed, fn); toast.success('Exported CSV!') }
    if (format === 'excel') { await exportToExcel(displayed, fn); toast.success('Exported Excel!') }
    if (format === 'pdf')   { await exportToPDF(displayed, monthLabel, fn); toast.success('Exported PDF!') }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        subtitle={`${displayed.length} transaksi`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button variant="secondary" size="sm" icon={Download} onClick={() => setShowExport(v => !v)}>Export</Button>
              {showExport && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-10 z-30 glass-card rounded-xl p-2 w-36 shadow-glass-md">
                  {['csv','excel','pdf'].map(f => (
                    <button key={f} onClick={() => handleExport(f)}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20 text-[var(--text-primary)] uppercase font-medium tracking-wide transition-colors">
                      {f}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>Add</Button>
          </div>
        }
      />

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigateMonth(-1)} className="p-2 rounded-xl hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-500 hover:text-sage-600 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-display font-semibold text-[var(--text-primary)]">{monthLabel}</p>
          <div className="flex items-center gap-3 justify-center mt-1">
            <span className="text-xs amount-income font-medium">+{formatCurrency(income)}</span>
            <span className="text-xs text-[var(--text-muted)]">·</span>
            <span className="text-xs amount-expense font-medium">-{formatCurrency(expense)}</span>
          </div>
        </div>
        <button onClick={() => navigateMonth(1)}
          disabled={viewDate.year === now.getFullYear() && viewDate.month === now.getMonth()}
          className="p-2 rounded-xl hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-500 hover:text-sage-600 transition-colors disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warmgray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="w-full pl-8 pr-8 py-2 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm placeholder:text-warmgray-400 focus:outline-none focus:border-sage-400" />
          {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warmgray-400"><X size={13} /></button>}
        </div>
        <div className="flex rounded-xl border border-warmgray-200 dark:border-warmgray-700 overflow-hidden bg-white/60 dark:bg-warmgray-900/40">
          {['', 'income', 'expense'].map(t => (
            <button key={t} onClick={() => { setType(t); setCat('') }}
              className={`px-3 py-2 text-xs font-medium transition-all capitalize ${typeFilter === t ? 'bg-sage-400 text-white' : 'text-warmgray-500 hover:text-warmgray-700 dark:hover:text-warmgray-300'}`}>
              {t || 'All'}
            </button>
          ))}
        </div>
        <select value={catFilter} onChange={e => setCat(e.target.value)}
          className="px-3 py-2 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-xs focus:outline-none focus:border-sage-400 text-[var(--text-primary)]">
          <option value="">All categories</option>
          {catOptions.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
      </div>

      {/* List */}
      <Card padding={false} className="overflow-hidden">
        <div className="p-2">
          <TransactionList
            transactions={displayed}
            loading={loading}
            onEdit={t => setEditItem(t)}
            onDelete={id => setDeleteConfirm(id)}
          />
        </div>
      </Card>

      {/* FAB mobile */}
      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-gradient-sage shadow-soft-md flex items-center justify-center text-white z-40">
        <Plus size={24} />
      </motion.button>

      {/* Add Modal */}
      <QuickAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        wallets={wallets}
        savingGoals={goals}
        customCategories={customCats}
        onSubmit={handleAdd}
        loading={addLoading}
      />

      {/* ── Edit Modal ────────────────────────────────────── */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Transaksi"
        size="md"
      >
        {editItem && (
          <EditTransactionForm
            transaction={editItem}
            wallets={wallets}
            customCategories={customCats}
            onSubmit={handleEdit}
            loading={editLoading}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Hapus Transaksi" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Menghapus transaksi juga akan membalikkan saldo wallet terkait.</p>
      </Modal>
    </div>
  )
}
