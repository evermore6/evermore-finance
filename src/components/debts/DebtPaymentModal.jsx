import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { CheckCircle, Wallet } from 'lucide-react'
import { Modal, Button, Badge, ProgressBar } from '@/components/ui'
import { formatCurrency } from '@/utils'

// Cek apakah dua wallet beda bank (butuh admin fee)
function isDifferentBank(fromWallet, toWallet) {
  if (!fromWallet || !toWallet) return false
  // Kalau keduanya tipe bank dan nama berbeda → beda bank → ada admin fee
  if (fromWallet.type === 'bank' && toWallet.type === 'bank') {
    return fromWallet.name.toLowerCase() !== toWallet.name.toLowerCase()
  }
  // Bank ke ewallet atau sebaliknya → biasanya ada admin fee
  if (fromWallet.type !== toWallet.type) return true
  return false
}

export function DebtPaymentModal({ open, onClose, debt, wallets, onSubmit, loading }) {
  const [payMode, setPayMode] = useState('partial') // 'partial' | 'full'

  const remaining = debt ? (debt.amount - (debt.paid_amount || 0)) : 0
  const progress  = debt ? ((debt.paid_amount || 0) / debt.amount) * 100 : 0

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      pay_amount:   '',
      wallet_id:    '',
      admin_fee:    '0',
      description:  '',
      category:     'debt_payment',
    }
  })

  const selectedWalletId = watch('wallet_id')
  const payAmount        = parseFloat(watch('pay_amount') || 0)
  const adminFee         = parseFloat(watch('admin_fee') || 0)
  const selectedWallet   = wallets?.find(w => w.id === selectedWalletId)

  // Tampilkan admin fee kalau wallet tipe bank (kemungkinan transfer antar bank)
  const showAdminFee = selectedWallet?.type === 'bank' || selectedWallet?.type === 'ewallet'

  const handleClose = () => {
    reset()
    setPayMode('partial')
    onClose()
  }

  const onFormSubmit = (data) => {
    const amount = payMode === 'full'
      ? remaining
      : parseFloat(data.pay_amount)

    onSubmit({
      debt_id:     debt.id,
      pay_amount:  amount,
      pay_mode:    payMode,
      wallet_id:   data.wallet_id,
      admin_fee:   parseFloat(data.admin_fee || 0),
      description: data.description,
    })
  }

  if (!debt) return null

  const isPayable    = debt.debt_type === 'payable'    // kamu yang bayar → expense
  const isReceivable = debt.debt_type === 'receivable' // kamu yang terima → income

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isPayable ? '💸 Bayar Hutang' : '💰 Terima Pembayaran'}
      size="md"
    >
      <div className="space-y-5">

        {/* ── Debt Info Card ─────────────────────────────── */}
        <div className="p-4 rounded-2xl bg-cream-50 dark:bg-warmgray-900/40 border border-[var(--border)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-sage flex items-center justify-center text-white font-bold text-sm">
                {debt.person_name?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--text-primary)]">{debt.person_name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {isPayable ? 'Hutangmu' : 'Piutangmu'}
                </p>
              </div>
            </div>
            <Badge variant={debt.status === 'paid' ? 'paid' : debt.status === 'partial' ? 'warning' : 'pending'}>
              {debt.status}
            </Badge>
          </div>

          {/* Progress bar */}
          <div>
            <ProgressBar value={debt.paid_amount || 0} max={debt.amount} className="mb-2" />
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">
                Sudah {isPayable ? 'dibayar' : 'diterima'}:{' '}
                <span className="font-medium text-[var(--text-primary)]">{formatCurrency(debt.paid_amount || 0)}</span>
              </span>
              <span className="text-[var(--text-muted)]">
                Sisa:{' '}
                <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(remaining)}</span>
              </span>
            </div>
          </div>

          {remaining <= 0 && (
            <div className="flex items-center gap-2 text-sage-600 dark:text-sage-300">
              <CheckCircle size={16} />
              <p className="text-sm font-medium">Sudah lunas!</p>
            </div>
          )}
        </div>

        {remaining > 0 && (
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">

            {/* ── Mode: Sebagian / Lunas ──────────────────── */}
            <div>
              <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-2">
                Jenis Pembayaran
              </label>
              <div className="flex gap-2">
                {[
                  { id: 'partial', label: '💳 Bayar Sebagian', desc: 'Input nominal tertentu' },
                  { id: 'full',    label: '✅ Lunas Sekarang', desc: formatCurrency(remaining) },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPayMode(mode.id)}
                    className={`flex-1 p-3 rounded-xl border-2 text-left transition-all
                      ${payMode === mode.id
                        ? 'border-sage-400 bg-sage-50 dark:bg-sage-900/20'
                        : 'border-warmgray-200 dark:border-warmgray-700 hover:border-sage-200'
                      }`}
                  >
                    <p className={`text-sm font-medium ${payMode === mode.id ? 'text-sage-700 dark:text-sage-300' : 'text-[var(--text-primary)]'}`}>
                      {mode.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{mode.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Nominal (hanya untuk partial) ──────────── */}
            {payMode === 'partial' && (
              <div>
                <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
                  Nominal Pembayaran
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500 font-medium">Rp</span>
                  <input
                    type="number" min="1" step="1"
                    placeholder="0"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border text-xl font-mono font-semibold
                      bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)]
                      focus:outline-none focus:ring-1 transition-all
                      ${errors.pay_amount
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-200'
                        : 'border-warmgray-200 dark:border-warmgray-700 focus:border-sage-400 focus:ring-sage-300'
                      }`}
                    {...register('pay_amount', {
                      required: 'Masukkan nominal',
                      min:      { value: 1, message: 'Harus > 0' },
                      max:      { value: remaining, message: `Maksimal ${formatCurrency(remaining)}` },
                    })}
                  />
                </div>
                {errors.pay_amount && (
                  <p className="text-xs text-red-500 mt-1">{errors.pay_amount.message}</p>
                )}
              </div>
            )}

            {/* ── Pilih Wallet ────────────────────────────── */}
            <div>
              <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Wallet size={14} />
                  {isPayable ? 'Bayar dari wallet' : 'Terima ke wallet'}
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {wallets?.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setValue('wallet_id', w.id)}
                    className={`py-2.5 px-2 rounded-xl text-center text-xs transition-all border
                      ${selectedWalletId === w.id
                        ? 'border-sage-300 dark:border-sage-700 bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300 font-medium ring-1 ring-sage-300'
                        : 'border-warmgray-200 dark:border-warmgray-700 bg-warmgray-50/50 dark:bg-warmgray-900/30 text-warmgray-500 hover:border-sage-200'
                      }`}
                  >
                    <div className="text-base mb-0.5">{w.icon}</div>
                    <div className="truncate font-medium">{w.name}</div>
                    <div className="text-[10px] mt-0.5 opacity-60 font-mono">
                      {formatCurrency(w.balance)}
                    </div>
                  </button>
                ))}
              </div>
              {errors.wallet_id && (
                <p className="text-xs text-red-500 mt-1">{errors.wallet_id.message}</p>
              )}
            </div>

            {/* ── Admin Fee (kalau bank/ewallet) ──────────── */}
            {showAdminFee && (
              <div>
                <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
                  Biaya Admin
                  <span className="ml-1.5 text-xs font-normal text-[var(--text-muted)]">(opsional, kalau transfer beda bank)</span>
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

            {/* ── Kategori ─────────────────────────────────── */}
            <div>
              <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
                Kategori Transaksi
              </label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400 text-[var(--text-primary)]"
                {...register('category')}
              >
                {isPayable ? (
                  <>
                    <option value="debt_payment">🤝 Debt Payment</option>
                    <option value="transfer">↔️ Transfer</option>
                    <option value="misc">📦 Misc</option>
                  </>
                ) : (
                  <>
                    <option value="debt_payment">🤝 Debt Payment</option>
                    <option value="receivable_paid">💰 Receivable Paid</option>
                    <option value="transfer">↔️ Transfer</option>
                    <option value="misc">📦 Misc</option>
                  </>
                )}
              </select>
            </div>

            {/* ── Keterangan ──────────────────────────────── */}
            <div>
              <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
                Keterangan <span className="text-[var(--text-muted)] font-normal">(opsional)</span>
              </label>
              <input
                type="text"
                placeholder={isPayable ? 'Bayar hutang ke...' : 'Terima pembayaran dari...'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
                {...register('description')}
              />
            </div>

            {/* ── Ringkasan sebelum submit ─────────────────── */}
            {selectedWallet && (payMode === 'full' || payAmount > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border text-xs space-y-1 ${
                  isPayable
                    ? 'bg-peach-50 dark:bg-peach-900/15 border-peach-200 dark:border-peach-800'
                    : 'bg-sage-50 dark:bg-sage-900/15 border-sage-200 dark:border-sage-800'
                }`}
              >
                <p className={`font-semibold ${isPayable ? 'text-peach-700 dark:text-peach-300' : 'text-sage-700 dark:text-sage-300'}`}>
                  Ringkasan
                </p>
                <p className="text-[var(--text-secondary)]">
                  {isPayable ? '💸 Keluar dari' : '💰 Masuk ke'}{' '}
                  <strong>{selectedWallet.icon} {selectedWallet.name}</strong>:{' '}
                  <strong>
                    {formatCurrency((payMode === 'full' ? remaining : payAmount) + adminFee)}
                  </strong>
                  {adminFee > 0 && (
                    <span className="text-[var(--text-muted)]">
                      {' '}(termasuk admin {formatCurrency(adminFee)})
                    </span>
                  )}
                </p>
                {payMode === 'partial' && payAmount > 0 && (
                  <p className="text-[var(--text-muted)]">
                    Sisa setelah bayar:{' '}
                    <strong className="text-[var(--text-primary)]">
                      {formatCurrency(Math.max(remaining - payAmount, 0))}
                    </strong>
                  </p>
                )}
                {adminFee > 0 && (
                  <p className="text-[var(--text-muted)]">
                    Biaya admin otomatis tercatat sebagai expense kategori "Admin Fee"
                  </p>
                )}
              </motion.div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              size="lg"
              loading={loading}
              disabled={!selectedWalletId}
            >
              {isPayable ? '💸 Konfirmasi Bayar' : '💰 Konfirmasi Terima'}
            </Button>
          </form>
        )}
      </div>
    </Modal>
  )
}
