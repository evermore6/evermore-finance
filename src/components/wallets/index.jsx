import { forwardRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Edit2, Trash2, ArrowLeftRight, Plus, Wallet } from 'lucide-react'
import { Button, Modal, Badge, Skeleton, EmptyState } from '@/components/ui'
import { formatCurrency, formatCompact } from '@/utils'

// ── Konstanta ikon & warna wallet ─────────────────────────
export const WALLET_TYPES = [
  { id: 'cash',       label: 'Cash',       icon: '💵' },
  { id: 'bank',       label: 'Bank',       icon: '🏦' },
  { id: 'ewallet',    label: 'E-Wallet',   icon: '📱' },
  { id: 'investment', label: 'Investasi',  icon: '📈' },
]

export const WALLET_ICONS = ['💵','🏦','📱','💳','💰','🏧','🛍️','🟢','🔵','⚡']
export const WALLET_COLORS = [
  '#7d9464','#e06a3a','#1a5fac','#00aa5b','#ee4d2d',
  '#9b59b6','#e67e22','#2ecc71','#3498db','#e74c3c',
]

// ── Wallet Summary Card (untuk Dashboard) ─────────────────
export function WalletSummary({ wallets = [], totalBalance, loading, onNavigate }) {
  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-display font-semibold text-[var(--text-primary)]">My Wallets</h3>
        <button
          onClick={onNavigate}
          className="text-xs text-sage-600 dark:text-sage-300 hover:underline font-medium"
        >
          Manage →
        </button>
      </div>

      {/* Total */}
      <div className="mb-4">
        <p className="text-xs text-[var(--text-muted)] mb-0.5">Total Balance</p>
        <p className="font-display text-2xl font-semibold text-[var(--text-primary)]">
          {formatCurrency(totalBalance)}
        </p>
      </div>

      {/* Wallet list */}
      <div className="space-y-2">
        {wallets.map((w, i) => {
          const pct = totalBalance > 0 ? (w.balance / totalBalance) * 100 : 0
          return (
            <motion.div
              key={w.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
            >
              {/* Icon bubble */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                style={{ background: `${w.color}22` }}
              >
                {w.icon}
              </div>

              {/* Name + bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--text-primary)]">{w.name}</span>
                  <span className={`text-xs font-mono font-semibold ${w.balance < 0 ? 'text-red-500' : 'amount-income'}`}>
                    {formatCompact(Math.abs(w.balance))}
                  </span>
                </div>
                {/* Proportion bar */}
                <div className="h-1 rounded-full bg-warmgray-100 dark:bg-warmgray-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: w.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, 1)}%` }}
                    transition={{ duration: 0.6, delay: i * 0.06 }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Wallet Card (untuk halaman Wallets) ───────────────────
export function WalletCard({ wallet: w, onEdit, onDelete, txnCount = 0 }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: `${w.color}22`, border: `1.5px solid ${w.color}44` }}
          >
            {w.icon}
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--text-primary)]">{w.name}</p>
            <Badge variant="default" className="text-[10px] mt-0.5 capitalize">{w.type}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(w)} className="p-1.5 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-400 hover:text-sage-600 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => onDelete(w.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-warmgray-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <p className={`font-display text-2xl font-semibold mb-1 ${w.balance < 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
        {formatCurrency(w.balance)}
      </p>
      <p className="text-xs text-[var(--text-muted)]">{txnCount} transaksi tercatat</p>
      {w.type === 'investment' && (
        <p className="text-[10px] text-amber-500 mt-1">📈 Saldo diupdate manual</p>
      )}
    </motion.div>
  )
}

// ── Wallet Form ───────────────────────────────────────────
export function WalletForm({ onSubmit, defaultValues, loading }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name:    '',
      type:    'bank',
      icon:    '🏦',
      color:   '#7d9464',
      balance: '0',
      ...defaultValues,
    },
  })

  const selectedColor = watch('color')
  const selectedIcon  = watch('icon')

  return (
    <form onSubmit={handleSubmit(d => onSubmit({ ...d, balance: parseFloat(d.balance || 0) }))} className="space-y-4">
      {/* Name */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Wallet Name</label>
        <input
          placeholder="e.g. BNI, Cash, GoPay"
          className={`w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)] focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300 ${errors.name ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
          {...register('name', { required: 'Wallet name is required' })}
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      {/* Type */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Type</label>
        <div className="flex gap-2">
          {WALLET_TYPES.map(t => (
            <button
              key={t.id} type="button"
              onClick={() => setValue('type', t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium border transition-all
                ${watch('type') === t.id
                  ? 'bg-sage-100 dark:bg-sage-900/30 border-sage-300 dark:border-sage-700 text-sage-700 dark:text-sage-300'
                  : 'border-warmgray-200 dark:border-warmgray-700 text-warmgray-500 hover:border-sage-200 bg-white/40 dark:bg-warmgray-900/20'
                }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Icon</label>
        <div className="flex flex-wrap gap-2">
          {WALLET_ICONS.map(icon => (
            <button
              key={icon} type="button"
              onClick={() => setValue('icon', icon)}
              className={`w-9 h-9 rounded-xl text-xl flex items-center justify-center transition-all
                ${selectedIcon === icon
                  ? 'bg-sage-100 dark:bg-sage-900/30 ring-2 ring-sage-400'
                  : 'hover:bg-warmgray-50 dark:hover:bg-warmgray-800'
                }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Color</label>
        <div className="flex flex-wrap gap-2">
          {WALLET_COLORS.map(color => (
            <button
              key={color} type="button"
              onClick={() => setValue('color', color)}
              className={`w-7 h-7 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-warmgray-400 scale-110' : 'hover:scale-105'}`}
              style={{ background: color }}
            />
          ))}
        </div>
      </div>

      {/* Initial Balance */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
          {defaultValues?.id ? 'Current Balance' : 'Initial Balance'}
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500 font-medium">Rp</span>
          <input
            type="number" min="0" placeholder="0"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm font-mono focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300"
            {...register('balance')}
          />
        </div>
        {!defaultValues?.id && (
          <p className="text-xs text-[var(--text-muted)] mt-1">Isi saldo kamu saat ini di wallet ini</p>
        )}
      </div>

      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        {defaultValues?.id ? 'Update Wallet' : 'Add Wallet'}
      </Button>
    </form>
  )
}

// ── Transfer Modal ────────────────────────────────────────
export function TransferModal({ open, onClose, wallets, onTransfer, loading }) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: { from_wallet_id: '', to_wallet_id: '', amount: '', admin_fee: '0' }
  })

  const fromId     = watch('from_wallet_id')
  const toId       = watch('to_wallet_id')
  const amount     = parseFloat(watch('amount') || 0)
  const adminFee   = parseFloat(watch('admin_fee') || 0)
  const fromWallet = wallets?.find(w => w.id === fromId)
  const toWallet   = wallets?.find(w => w.id === toId)

  // Cek apakah sesama bank → tidak perlu admin fee
  const sameName     = fromWallet && toWallet && fromWallet.name === toWallet.name
  const showAdminFee = !sameName && (fromWallet?.type === 'bank' || fromWallet?.type === 'ewallet')

  const handleClose = () => { reset(); onClose() }

  const onSubmit = (data) => {
    if (data.from_wallet_id === data.to_wallet_id) return
    onTransfer(
      data.from_wallet_id,
      data.to_wallet_id,
      parseFloat(data.amount),
      parseFloat(data.admin_fee || 0)
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Transfer Antar Wallet" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Dari wallet</label>
          <select
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
            {...register('from_wallet_id', { required: true })}
          >
            <option value="">Pilih wallet asal…</option>
            {wallets?.map(w => (
              <option key={w.id} value={w.id}>{w.icon} {w.name} — {formatCurrency(w.balance)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Ke wallet</label>
          <select
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
            {...register('to_wallet_id', { required: true })}
          >
            <option value="">Pilih wallet tujuan…</option>
            {wallets?.filter(w => w.id !== fromId).map(w => (
              <option key={w.id} value={w.id}>{w.icon} {w.name} — {formatCurrency(w.balance)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Jumlah</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500">Rp</span>
            <input
              type="number" min="1" placeholder="0"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-lg font-mono bg-white/60 dark:bg-warmgray-900/40 focus:outline-none focus:border-sage-400 ${errors.amount ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
              {...register('amount', {
                required: 'Masukkan jumlah',
                min: { value: 1, message: 'Harus > 0' },
                validate: v => !fromWallet || parseFloat(v) <= fromWallet.balance || `Saldo ${fromWallet.name} tidak cukup`
              })}
            />
          </div>
          {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
        </div>

        {showAdminFee && (
          <div>
            <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
              Biaya Admin <span className="text-xs font-normal text-[var(--text-muted)]">(beda bank, opsional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500">Rp</span>
              <input
                type="number" min="0" defaultValue="0"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm font-mono focus:outline-none focus:border-sage-400"
                {...register('admin_fee')}
              />
            </div>
          </div>
        )}

        {/* Preview */}
        {fromWallet && toWallet && amount > 0 && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 text-xs space-y-1">
            <p className="font-medium text-blue-700 dark:text-blue-300">Ringkasan</p>
            <p className="text-blue-600 dark:text-blue-400">
              {fromWallet.icon} {fromWallet.name} berkurang <strong>{formatCurrency(amount + adminFee)}</strong>
              {adminFee > 0 && <span className="text-blue-400"> (termasuk admin {formatCurrency(adminFee)})</span>}
            </p>
            <p className="text-blue-600 dark:text-blue-400">
              {toWallet.icon} {toWallet.name} bertambah <strong>{formatCurrency(amount)}</strong>
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={handleClose}>Batal</Button>
          <Button type="submit" variant="primary" className="flex-1" loading={loading}>Transfer</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Wallet Picker (inline untuk TransactionForm) ──────────
export const WalletPicker = forwardRef(function WalletPicker(
  { wallets = [], value, onChange },
  ref
) {
  if (!wallets.length) return null
  return (
    <div>
      <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
        Wallet <span className="text-[var(--text-muted)] font-normal">(sumber dana)</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {wallets.map(w => (
          <button
            key={w.id}
            type="button"
            onClick={() => onChange(w.id)}
            className={`py-2 px-2 rounded-xl text-center text-xs transition-all border
              ${value === w.id
                ? 'border-sage-300 dark:border-sage-700 bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300 font-medium ring-1 ring-sage-300'
                : 'border-warmgray-200 dark:border-warmgray-700 bg-warmgray-50/50 dark:bg-warmgray-900/30 text-warmgray-500 hover:border-sage-200'
              }`}
          >
            <div className="text-base mb-0.5">{w.icon}</div>
            <div className="truncate font-medium">{w.name}</div>
            <div className="text-[10px] mt-0.5 opacity-70 font-mono">{formatCompact(w.balance)}</div>
          </button>
        ))}
      </div>
    </div>
  )
})
