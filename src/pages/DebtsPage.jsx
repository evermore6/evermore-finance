import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, CreditCard, CheckCircle2 } from 'lucide-react'
import { useDebts, useWallets, useTransactions } from '@/hooks'
import { DebtForm, DebtCard } from '@/components/debts'
import { DebtPaymentModal } from '@/components/debts/DebtPaymentModal'
import { Modal, Button, Card, EmptyState, Skeleton, Badge } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency, formatDate } from '@/utils'
import { transactionService } from '@/services/transactionService'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'payable',    label: 'Hutang',    desc: 'Kamu yang bayar' },
  { id: 'receivable', label: 'Piutang',   desc: 'Kamu yang terima' },
]

export default function DebtsPage() {
  const { user } = useAuth()
  const now = new Date()
  const { payables, receivables, loading, addDebt, updateDebt, deleteDebt, payDebt } = useDebts()
  const { wallets, applyBalanceDelta } = useWallets()

  const [tab,           setTab]           = useState('payable')
  const [showAdd,       setShowAdd]       = useState(false)
  const [editItem,      setEditItem]      = useState(null)
  const [payItem,       setPayItem]       = useState(null)  // debt yang mau dibayar
  const [savingLoading, setSaving]        = useState(false)
  const [payLoading,    setPayLoading]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const list = tab === 'payable' ? payables : receivables

  // Summary
  const totalOwed      = payables.filter(d => d.status !== 'paid').reduce((s,d) => s + (d.amount - (d.paid_amount||0)), 0)
  const totalOwedYou   = receivables.filter(d => d.status !== 'paid').reduce((s,d) => s + (d.amount - (d.paid_amount||0)), 0)
  const paidPayables   = payables.filter(d => d.status === 'paid').length
  const paidReceivable = receivables.filter(d => d.status === 'paid').length

  const handleAdd = async (data) => {
    setSaving(true)
    const { error } = await addDebt({ ...data, debt_type: tab, paid_amount: 0 })
    setSaving(false)
    if (!error) setShowAdd(false)
  }

  const handleEdit = async (data) => {
    setSaving(true)
    const { error } = await updateDebt(editItem.id, data)
    setSaving(false)
    if (!error) setEditItem(null)
  }

  const handleDelete = async (id) => {
    await deleteDebt(id)
    setDeleteConfirm(null)
  }

  // ── Handle payment ──────────────────────────────────────
  const handlePayment = async (payData) => {
    setPayLoading(true)
    try {
      const debt = payItem
      const isPayable    = debt.debt_type === 'payable'
      const isReceivable = debt.debt_type === 'receivable'
      const today = new Date().toISOString().split('T')[0]

      const actualAmount = payData.pay_mode === 'full'
        ? (debt.amount - (debt.paid_amount || 0))
        : payData.pay_amount

      // 1. Update debt paid_amount
      const { error: debtErr, data: updatedDebt, walletDelta } = await payDebt({
        ...payData,
        actualAmount,
      })
      if (debtErr) throw debtErr

      // 2. Update wallet balance lokal
      if (payData.wallet_id && walletDelta !== undefined) {
        applyBalanceDelta(payData.wallet_id, walletDelta)
      }

      // 3. Catat sebagai transaksi otomatis
      const txnPayload = {
        user_id:             user.id,
        type:                isPayable ? 'expense' : 'income',
        transaction_subtype: 'regular',
        category:            isPayable ? 'transfer' : 'transfer',
        amount:              actualAmount,
        wallet_id:           payData.wallet_id || null,
        date:                today,
        description:         payData.description ||
          (isPayable
            ? `Bayar hutang ke ${debt.person_name}`
            : `Terima pembayaran dari ${debt.person_name}`),
      }
      await transactionService.create(txnPayload)

      // 4. Kalau ada admin fee → catat juga sebagai expense admin_fee
      if (payData.admin_fee > 0 && payData.wallet_id) {
        await transactionService.create({
          user_id:             user.id,
          type:                'expense',
          transaction_subtype: 'regular',
          category:            'admin_fee',
          amount:              payData.admin_fee,
          wallet_id:           payData.wallet_id,
          date:                today,
          description:         `Biaya admin transfer ke ${debt.person_name}`,
        })
        // Kurangi wallet untuk admin fee
        applyBalanceDelta(payData.wallet_id, -payData.admin_fee)
        await import('@/services/walletService').then(m =>
          m.walletService.adjustBalance(payData.wallet_id, -payData.admin_fee)
        )
      }

      toast.success(
        payData.pay_mode === 'full'
          ? (isPayable ? '✅ Hutang lunas!' : '✅ Piutang diterima!')
          : `💰 ${formatCurrency(actualAmount)} tercatat`
      )
      setPayItem(null)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setPayLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hutang & Piutang"
        subtitle="Lacak uang yang kamu pinjam dan pinjamkan"
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
            Tambah
          </Button>
        }
      />

      {/* ── Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Sisa hutangmu</p>
          <p className="font-display text-xl font-semibold amount-expense">{formatCurrency(totalOwed)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {payables.filter(d => d.status !== 'paid').length} belum lunas
            {paidPayables > 0 && ` · ${paidPayables} lunas`}
          </p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Piutangmu</p>
          <p className="font-display text-xl font-semibold amount-income">{formatCurrency(totalOwedYou)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {receivables.filter(d => d.status !== 'paid').length} belum diterima
            {paidReceivable > 0 && ` · ${paidReceivable} lunas`}
          </p>
        </Card>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="flex rounded-xl border border-warmgray-200 dark:border-warmgray-700 overflow-hidden bg-white/40 dark:bg-warmgray-900/30 p-1 gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id
                ? 'bg-sage-400 text-white shadow-soft'
                : 'text-warmgray-500 hover:text-warmgray-700 dark:hover:text-warmgray-300'
              }`}
          >
            {t.label}
            <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5
              ${tab === t.id ? 'bg-white/20' : 'bg-warmgray-200 dark:bg-warmgray-700 text-warmgray-500'}`}>
              {t.id === 'payable' ? payables.length : receivables.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Debt List ─────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={CreditCard}
            title={tab === 'payable' ? 'Tidak ada hutang' : 'Tidak ada piutang'}
            description={tab === 'payable' ? 'Tambahkan hutang yang perlu kamu bayar.' : 'Tambahkan piutang yang perlu ditagih.'}
            action={
              <Button variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>
                Tambah {tab === 'payable' ? 'Hutang' : 'Piutang'}
              </Button>
            }
          />
        </Card>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map(debt => (
            <DebtCardWithPay
              key={debt.id}
              debt={debt}
              onEdit={d => setEditItem(d)}
              onDelete={id => setDeleteConfirm(id)}
              onPay={d => setPayItem(d)}
            />
          ))}
        </motion.div>
      )}

      {/* FAB mobile */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-gradient-sage shadow-soft-md flex items-center justify-center text-white z-40"
      >
        <Plus size={24} />
      </motion.button>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)}
        title={`Tambah ${tab === 'payable' ? 'Hutang' : 'Piutang'}`} size="md">
        <DebtForm onSubmit={handleAdd} debtType={tab} loading={savingLoading} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit" size="md">
        {editItem && <DebtForm onSubmit={handleEdit} defaultValues={editItem} debtType={editItem.debt_type} loading={savingLoading} />}
      </Modal>

      {/* Payment Modal */}
      <DebtPaymentModal
        open={!!payItem}
        onClose={() => setPayItem(null)}
        debt={payItem}
        wallets={wallets}
        onSubmit={handlePayment}
        loading={payLoading}
      />

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Hapus" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Hapus data ini?</p>
      </Modal>
    </div>
  )
}

// ── DebtCard extended dengan tombol bayar ─────────────────
function DebtCardWithPay({ debt, onEdit, onDelete, onPay }) {
  const remaining = debt.amount - (debt.paid_amount || 0)
  const progress  = ((debt.paid_amount || 0) / debt.amount) * 100
  const isLunas   = debt.status === 'paid'

  const { Edit2, Trash2, Calendar } = require('lucide-react')
  const { daysUntil } = require('@/utils')

  const days      = debt.due_date ? daysUntil(debt.due_date) : null
  const isOverdue = days !== null && days < 0 && !isLunas

  const statusVariant = {
    pending:  'pending',
    paid:     'paid',
    overdue:  'overdue',
    partial:  'warning',
  }[debt.status] || 'default'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 group"
    >
      {/* Header */}
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
                {isOverdue ? `${Math.abs(days)}h overdue` : days === 0 ? 'Hari ini' : `${days}h lagi`}
              </p>
            )}
          </div>
        </div>
        <Badge variant={statusVariant}>{debt.status}</Badge>
      </div>

      {/* Amount + Progress */}
      <p className="font-display text-xl font-semibold text-[var(--text-primary)] mb-1">
        {formatCurrency(debt.amount)}
      </p>

      {/* Progress bar kalau ada partial payment */}
      {(debt.paid_amount || 0) > 0 && (
        <div className="mb-2">
          <div className="h-1.5 rounded-full bg-warmgray-100 dark:bg-warmgray-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-sage-400 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
            <span>Terbayar {formatCurrency(debt.paid_amount || 0)}</span>
            {!isLunas && <span>Sisa {formatCurrency(remaining)}</span>}
          </div>
        </div>
      )}

      {debt.notes && (
        <p className="text-xs text-[var(--text-muted)] mb-3 line-clamp-2">{debt.notes}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] mt-2">
        {/* Tombol Bayar / Terima */}
        {!isLunas && (
          <button
            onClick={() => onPay(debt)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
              ${debt.debt_type === 'payable'
                ? 'bg-peach-100 dark:bg-peach-900/30 text-peach-700 dark:text-peach-300 hover:bg-peach-200 dark:hover:bg-peach-900/40'
                : 'bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 hover:bg-sage-200 dark:hover:bg-sage-900/40'
              }`}
          >
            {debt.debt_type === 'payable' ? '💸 Bayar' : '💰 Terima'}
          </button>
        )}

        {isLunas && (
          <div className="flex items-center gap-1 text-xs text-sage-600 dark:text-sage-300 font-medium">
            <CheckCircle2 size={13} />
            Lunas
          </div>
        )}

        {/* Edit / Delete */}
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity ml-auto">
          <button onClick={() => onEdit(debt)} className="flex items-center gap-1 text-xs text-warmgray-500 hover:text-sage-600 px-2 py-1 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20 transition-colors">
            <Edit2 size={12} /> Edit
          </button>
          <button onClick={() => onDelete(debt.id)} className="flex items-center gap-1 text-xs text-warmgray-500 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={12} /> Hapus
          </button>
        </div>
      </div>
    </motion.div>
  )
}
