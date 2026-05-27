import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { ChevronLeft } from 'lucide-react'
import { format } from 'date-fns'
import { Modal, Button, Toggle, Textarea } from '@/components/ui'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS, RECURRING_FREQUENCIES } from '@/constants/categories'
import { formatCurrency } from '@/utils'

const today = format(new Date(), 'yyyy-MM-dd')

// ── Tipe aksi ─────────────────────────────────────────────
const TRANSACTION_TYPES = [
  {
    id:    'expense',
    label: 'Expense',
    emoji: '💸',
    desc:  'Catat pengeluaran',
    color: 'bg-peach-50 dark:bg-peach-900/20 border-peach-200 dark:border-peach-800 text-peach-700 dark:text-peach-300',
    active:'bg-peach-200 dark:bg-peach-900/40 border-peach-400 dark:border-peach-600',
  },
  {
    id:    'income',
    label: 'Income',
    emoji: '💰',
    desc:  'Catat pemasukan',
    color: 'bg-sage-50 dark:bg-sage-900/20 border-sage-200 dark:border-sage-800 text-sage-700 dark:text-sage-300',
    active:'bg-sage-200 dark:bg-sage-900/40 border-sage-400 dark:border-sage-600',
  },
  {
    id:    'transfer',
    label: 'Transfer',
    emoji: '↔️',
    desc:  'Antar bank / wallet',
    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    active:'bg-blue-200 dark:bg-blue-900/40 border-blue-400 dark:border-blue-600',
  },
  {
    id:    'topup',
    label: 'Top Up',
    emoji: '📱',
    desc:  'Isi saldo e-wallet',
    color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    active:'bg-purple-200 dark:bg-purple-900/40 border-purple-400 dark:border-purple-600',
  },
  {
    id:    'saving',
    label: 'Saving',
    emoji: '🐷',
    desc:  'Sisihkan ke tujuan',
    color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    active:'bg-amber-200 dark:bg-amber-900/40 border-amber-400 dark:border-amber-600',
  },
]

// ── Reusable Amount Input ─────────────────────────────────
function AmountInput({ register, errors, name = 'amount' }) {
  return (
    <div>
      <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Nominal</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500 font-medium">Rp</span>
        <input
          type="number" step="1" min="0" placeholder="0"
          className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xl font-mono font-semibold
            bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)]
            focus:outline-none focus:ring-1 transition-all
            ${errors[name]
              ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
              : 'border-warmgray-200 dark:border-warmgray-700 focus:border-sage-400 focus:ring-sage-300'
            }`}
          {...register(name, { required: 'Nominal wajib diisi', min: { value: 1, message: 'Harus > 0' } })}
        />
      </div>
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name].message}</p>}
    </div>
  )
}

function WalletSelect({ wallets, label, name, register, error, exclude }) {
  const opts = exclude ? wallets.filter(w => w.id !== exclude) : wallets
  return (
    <div>
      <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">{label}</label>
      <select
        className={`w-full px-3.5 py-2.5 rounded-xl border bg-white/60 dark:bg-warmgray-900/40 text-sm
          text-[var(--text-primary)] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300
          ${error ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
        {...register(name, { required: 'Pilih wallet' })}
      >
        <option value="">Pilih wallet…</option>
        {opts.map(w => (
          <option key={w.id} value={w.id}>
            {w.icon} {w.name} — {formatCurrency(w.balance)}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
  )
}

// ── FORM: Expense / Income ────────────────────────────────
function RegularForm({ type, wallets, customCategories, onSubmit, loading }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      date: today, category: type === 'expense' ? 'food_beverage' : 'salary',
      payment_method: 'cash', wallet_id: '', description: '',
      is_recurring: false, frequency: 'monthly',
    }
  })

  const isRecurring = watch('is_recurring')
  const baseCategories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
  const allCategories  = [
    ...baseCategories,
    ...customCategories.filter(c => c.type === type).map(c => ({ id: c.id, label: c.name, icon: c.icon })),
  ]

  const onSubmitForm = (data) => {
    const { frequency, ...fields } = data
    onSubmit({ ...fields, type, transaction_subtype: 'regular', amount: parseFloat(data.amount), frequency })
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <AmountInput register={register} errors={errors} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Tanggal</label>
          <input type="date" className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400" {...register('date', { required: true })} />
        </div>
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Kategori</label>
          <select className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400" {...register('category', { required: true })}>
            {allCategories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Metode Bayar</label>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_METHODS.map(m => (
            <button key={m.id} type="button" onClick={() => setValue('payment_method', m.id)}
              className={`py-2 px-1 rounded-xl text-center text-xs transition-all border
                ${watch('payment_method') === m.id
                  ? 'bg-sage-100 dark:bg-sage-900/30 border-sage-300 text-sage-700 dark:text-sage-300 font-medium'
                  : 'bg-warmgray-50 dark:bg-warmgray-900/40 border-warmgray-200 dark:border-warmgray-700 text-warmgray-500'
                }`}>
              <div className="text-base">{m.icon}</div>
              <div className="truncate">{m.label.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Wallet */}
      {wallets.length > 0 && (
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
            {type === 'expense' ? 'Bayar dari' : 'Masuk ke'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {wallets.map(w => (
              <button key={w.id} type="button" onClick={() => setValue('wallet_id', w.id)}
                className={`py-2 px-2 rounded-xl text-center text-xs transition-all border
                  ${watch('wallet_id') === w.id
                    ? 'border-sage-300 bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300 font-medium ring-1 ring-sage-300'
                    : 'border-warmgray-200 dark:border-warmgray-700 bg-warmgray-50/50 text-warmgray-500'
                  }`}>
                <div className="text-base mb-0.5">{w.icon}</div>
                <div className="truncate font-medium">{w.name}</div>
                <div className="text-[10px] mt-0.5 opacity-70 font-mono">{formatCurrency(w.balance)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <Textarea label="Keterangan" placeholder="Untuk apa?" rows={2} {...register('description')} />

      <div className="flex items-center justify-between p-3.5 rounded-xl bg-cream-50 dark:bg-warmgray-900/30 border border-warmgray-100 dark:border-warmgray-800">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Recurring</p>
          <p className="text-xs text-[var(--text-muted)]">Otomatis tambah berkala</p>
        </div>
        <Toggle checked={isRecurring} onChange={v => setValue('is_recurring', v)} />
      </div>
      {isRecurring && (
        <select className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400" {...register('frequency')}>
          {RECURRING_FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      )}

      <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
        Simpan {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
      </Button>
    </form>
  )
}

// ── FORM: Transfer & Topup ────────────────────────────────
function TransferForm({ mode, wallets, onSubmit, loading }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { from_wallet_id: '', to_wallet_id: '', amount: '', admin_fee: '0', description: '', date: today }
  })

  const fromId  = watch('from_wallet_id')
  const toId    = watch('to_wallet_id')
  const fromW   = wallets.find(w => w.id === fromId)
  const toW     = wallets.find(w => w.id === toId)

  // Admin fee: sembunyikan kalau nama sama (sesama bank), atau topup ShopeePay
  const sameName   = fromW && toW && fromW.name === toW.name
  const isShopee   = toW?.name?.toLowerCase().includes('shopee')
  const showAdminFee = !sameName && !isShopee

  // Filter wallet sesuai mode
  const sourceWallets = mode === 'topup'
    ? wallets.filter(w => w.type !== 'ewallet')
    : wallets
  const destWallets = mode === 'topup'
    ? wallets.filter(w => w.type === 'ewallet')
    : wallets.filter(w => w.id !== fromId)

  const title = mode === 'topup' ? 'Top Up E-Wallet' : 'Transfer Antar Wallet'

  const onSubmitForm = (d) => {
    onSubmit({
      from_wallet_id:      d.from_wallet_id,
      to_wallet_id:        d.to_wallet_id,
      amount:              parseFloat(d.amount),
      admin_fee:           parseFloat(d.admin_fee || 0),
      description:         d.description,
      date:                d.date,
      transaction_subtype: mode === 'topup' ? 'topup' : 'transfer',
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <AmountInput register={register} errors={errors} />

      <WalletSelect wallets={sourceWallets} label={mode === 'topup' ? 'Sumber dana (Bank / Cash)' : 'Dari wallet'} name="from_wallet_id" register={register} error={errors.from_wallet_id} />
      <WalletSelect wallets={destWallets} label={mode === 'topup' ? 'Top up ke (E-Wallet)' : 'Ke wallet'} name="to_wallet_id" register={register} error={errors.to_wallet_id} exclude={fromId} />

      {/* Admin Fee */}
      {showAdminFee && (
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
            Biaya Admin
            <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">(opsional, default 0)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500">Rp</span>
            <input type="number" min="0" defaultValue="0" placeholder="0"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm font-mono focus:outline-none focus:border-sage-400"
              {...register('admin_fee')} />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">Biaya admin akan ikut dikurangi dari wallet asal</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Tanggal</label>
          <input type="date" className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400" {...register('date')} />
        </div>
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Keterangan</label>
          <input type="text" placeholder="Opsional" className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400" {...register('description')} />
        </div>
      </div>

      {/* Preview ringkasan */}
      {fromW && toW && watch('amount') && (
        <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 space-y-1">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Ringkasan</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {fromW.icon} {fromW.name} berkurang <strong>{formatCurrency(parseFloat(watch('amount') || 0) + parseFloat(watch('admin_fee') || 0))}</strong>
            {parseFloat(watch('admin_fee')) > 0 && ` (termasuk admin Rp ${parseInt(watch('admin_fee')).toLocaleString('id-ID')})`}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {toW.icon} {toW.name} bertambah <strong>{formatCurrency(parseFloat(watch('amount') || 0))}</strong>
          </p>
        </div>
      )}

      <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
        {mode === 'topup' ? 'Top Up Sekarang' : 'Transfer Sekarang'}
      </Button>
    </form>
  )
}

// ── FORM: Saving Contribution ─────────────────────────────
function SavingForm({ wallets, savingGoals, onSubmit, loading }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { wallet_id: '', saving_goal_id: '', amount: '', description: '', date: today }
  })

  const selectedGoal = savingGoals.find(g => g.id === watch('saving_goal_id'))
  const remaining    = selectedGoal
    ? Math.max(selectedGoal.target_amount - selectedGoal.current_amount, 0)
    : null

  const onSubmitForm = (d) => {
    onSubmit({
      wallet_id:           d.wallet_id,
      saving_goal_id:      d.saving_goal_id,
      amount:              parseFloat(d.amount),
      description:         d.description || `Saving: ${selectedGoal?.name || ''}`,
      date:                d.date,
      transaction_subtype: 'saving_contribution',
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {/* Pilih Saving Goal */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Tujuan Saving</label>
        <select
          className={`w-full px-3.5 py-2.5 rounded-xl border bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400 ${errors.saving_goal_id ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
          {...register('saving_goal_id', { required: 'Pilih tujuan saving' })}
        >
          <option value="">Pilih tujuan saving…</option>
          {savingGoals.filter(g => g.current_amount < g.target_amount).map(g => (
            <option key={g.id} value={g.id}>
              {g.icon} {g.name} — sisa {formatCurrency(Math.max(g.target_amount - g.current_amount, 0))}
            </option>
          ))}
        </select>
        {errors.saving_goal_id && <p className="text-xs text-red-500 mt-1">{errors.saving_goal_id.message}</p>}
        {savingGoals.filter(g => g.current_amount < g.target_amount).length === 0 && (
          <p className="text-xs text-amber-500 mt-1">Semua saving goals sudah tercapai! Buat goal baru dulu.</p>
        )}
      </div>

      {/* Info goal */}
      {selectedGoal && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-lg">{selectedGoal.icon}</span>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{selectedGoal.name}</span>
          </div>
          <div className="h-1.5 rounded-full bg-amber-200 dark:bg-amber-800 overflow-hidden mb-1">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.min((selectedGoal.current_amount / selectedGoal.target_amount) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {formatCurrency(selectedGoal.current_amount)} / {formatCurrency(selectedGoal.target_amount)} — sisa {formatCurrency(remaining)}
          </p>
        </div>
      )}

      <AmountInput register={register} errors={errors} />

      {/* Wallet sumber */}
      <WalletSelect wallets={wallets} label="Sisihkan dari wallet" name="wallet_id" register={register} error={errors.wallet_id} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Tanggal</label>
          <input type="date" className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400" {...register('date')} />
        </div>
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Keterangan</label>
          <input type="text" placeholder="Opsional" className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400" {...register('description')} />
        </div>
      </div>

      <Button type="submit" variant="primary" className="w-full" size="lg" loading={loading}>
        Sisihkan Saving
      </Button>
    </form>
  )
}

// ── MAIN: QuickAddModal ───────────────────────────────────
export function QuickAddModal({ open, onClose, wallets, savingGoals, customCategories, onSubmit, loading }) {
  const [selectedType, setSelectedType] = useState(null)

  const handleClose = () => {
    setSelectedType(null)
    onClose()
  }

  const handleSubmit = async (data) => {
    await onSubmit(data)
    setSelectedType(null)
  }

  const selected = TRANSACTION_TYPES.find(t => t.id === selectedType)

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        selectedType ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedType(null)}
              className="p-1 rounded-lg hover:bg-warmgray-100 dark:hover:bg-warmgray-800 text-warmgray-500 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span>{selected?.emoji} {selected?.label}</span>
          </div>
        ) : 'Tambah Transaksi'
      }
      size="md"
    >
      <AnimatePresence mode="wait">
        {!selectedType ? (
          /* ── Type Selector ── */
          <motion.div
            key="selector"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="grid grid-cols-1 gap-2.5"
          >
            {TRANSACTION_TYPES.map((t, i) => (
              <motion.button
                key={t.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedType(t.id)}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left
                  transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${t.color}`}
              >
                <span className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl bg-white/50 dark:bg-black/10 flex-shrink-0">
                  {t.emoji}
                </span>
                <div>
                  <p className="font-semibold text-sm">{t.label}</p>
                  <p className="text-xs opacity-70">{t.desc}</p>
                </div>
                <span className="ml-auto opacity-40 text-lg">›</span>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          /* ── Specific Form ── */
          <motion.div
            key={selectedType}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {(selectedType === 'expense' || selectedType === 'income') && (
              <RegularForm
                type={selectedType}
                wallets={wallets}
                customCategories={customCategories}
                onSubmit={handleSubmit}
                loading={loading}
              />
            )}
            {selectedType === 'transfer' && (
              <TransferForm
                mode="transfer"
                wallets={wallets}
                onSubmit={handleSubmit}
                loading={loading}
              />
            )}
            {selectedType === 'topup' && (
              <TransferForm
                mode="topup"
                wallets={wallets}
                onSubmit={handleSubmit}
                loading={loading}
              />
            )}
            {selectedType === 'saving' && (
              <SavingForm
                wallets={wallets}
                savingGoals={savingGoals}
                onSubmit={handleSubmit}
                loading={loading}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
