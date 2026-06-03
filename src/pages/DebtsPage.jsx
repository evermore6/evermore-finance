import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, CreditCard, CheckCircle2, Edit2, Trash2, Calendar } from 'lucide-react'
import { useDebts, useWallets } from '@/hooks'
import { DebtForm } from '@/components/debts'
import { DebtPaymentModal } from '@/components/debts/DebtPaymentModal'
import { Modal, Button, Card, EmptyState, Skeleton, Badge, ProgressBar } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency, daysUntil } from '@/utils'
import { transactionService } from '@/services/transactionService'
import { walletService } from '@/services/walletService'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'payable',    label: 'Hutang',  desc: 'Kamu yang bayar' },
  { id: 'receivable', label: 'Piutang', desc: 'Kamu yang terima' },
]

// ── Debt Card ─────────────────────────────────────────────
function DebtCard({ debt, onEdit, onDelete, onPay }) {
  const remaining = debt.amount - (debt.paid_amount || 0)
  const isLunas   = debt.status === 'paid'
  const days      = debt.due_date ? daysUntil(debt.due_date) : null
  const isOverdue = days !== null && days < 0 && !isLunas
  const statusVariant = { pending:'pending', paid:'paid', overdue:'overdue', partial:'warning' }[debt.status] || 'default'

  return (
    <motion.div layout initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="glass-card rounded-2xl p-4 group">
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

      <p className="font-display text-xl font-semibold text-[var(--text-primary)] mb-2">{formatCurrency(debt.amount)}</p>

      {(debt.paid_amount || 0) > 0 && (
        <div className="mb-2">
          <ProgressBar value={debt.paid_amount || 0} max={debt.amount} />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
            <span>Terbayar {formatCurrency(debt.paid_amount || 0)}</span>
            {!isLunas && <span>Sisa {formatCurrency(remaining)}</span>}
          </div>
        </div>
      )}

      {debt.notes && <p className="text-xs text-[var(--text-muted)] mb-2 line-clamp-2 italic">"{debt.notes}"</p>}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] mt-1">
        {!isLunas ? (
          <button onClick={() => onPay(debt)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors
              ${debt.debt_type === 'payable'
                ? 'bg-peach-100 dark:bg-peach-900/30 text-peach-700 dark:text-peach-300 hover:bg-peach-200'
                : 'bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 hover:bg-sage-200'
              }`}>
            {debt.debt_type === 'payable' ? '💸 Bayar' : '💰 Terima'}
          </button>
        ) : (
          <div className="flex items-center gap-1 text-xs text-sage-600 dark:text-sage-300 font-medium">
            <CheckCircle2 size={13} /> Lunas
          </div>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
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

// ── Main Page ─────────────────────────────────────────────
export default function DebtsPage() {
  const { user }  = useAuth()
  const { payables, receivables, loading, addDebt, updateDebt, deleteDebt, payDebt } = useDebts()
  const { wallets, applyBalanceDelta } = useWallets()

  const [tab,            setTab]           = useState('payable')
  const [showAdd,        setShowAdd]       = useState(false)
  const [editItem,       setEditItem]      = useState(null)
  const [payItem,        setPayItem]       = useState(null)
  const [savingLoading,  setSaving]        = useState(false)
  const [payLoading,     setPayLoading]    = useState(false)
  const [deleteConfirm,  setDeleteConfirm] = useState(null)

  const list         = tab === 'payable' ? payables : receivables
  const totalOwed    = payables.filter(d => d.status !== 'paid').reduce((s,d) => s + (d.amount-(d.paid_amount||0)), 0)
  const totalOwedYou = receivables.filter(d => d.status !== 'paid').reduce((s,d) => s + (d.amount-(d.paid_amount||0)), 0)

  const handleAdd = async (data) => {
    setSaving(true)
    try {
      const { wallet_id, admin_fee = 0, ...debtFields } = data
      const today    = new Date().toISOString().split('T')[0]
      const isPayable = tab === 'payable'

      // 1. Simpan debt
      const { error: debtErr } = await addDebt({ ...debtFields, debt_type: tab, paid_amount: 0, wallet_id: wallet_id || null })
      if (debtErr) throw debtErr

      // 2. Wallet adjustment + catat transaksi (hanya kalau wallet dipilih)
      if (wallet_id) {
        const amount = parseFloat(debtFields.amount)
        // AP (hutang): kamu terima uang → +wallet
        // AR (piutang): kamu kasih uang → -wallet
        const delta = isPayable ? amount : -amount
        await walletService.adjustBalance(wallet_id, delta)
        applyBalanceDelta(wallet_id, delta)

        await transactionService.create({
          user_id: user.id,
          type: isPayable ? 'income' : 'expense',
          transaction_subtype: 'regular',
          category: 'debt_payment',
          amount,
          wallet_id,
          date: today,
          description: isPayable ? `Hutang dari ${debtFields.person_name}` : `Pinjam ke ${debtFields.person_name}`,
        })

        if (admin_fee > 0) {
          await walletService.adjustBalance(wallet_id, -admin_fee)
          applyBalanceDelta(wallet_id, -admin_fee)
          await transactionService.create({
            user_id: user.id, type: 'expense', transaction_subtype: 'regular',
            category: 'admin_fee', amount: admin_fee, wallet_id, date: today,
            description: `Biaya admin transfer ke ${debtFields.person_name}`,
          })
        }
      }
      setShowAdd(false)
    } catch (e) {
      toast.error(e.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
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

  // ── Payment: single source of truth untuk wallet adjustment ──
  const handlePayment = async (payData) => {
    setPayLoading(true)
    try {
      const debt      = payItem
      const isPayable = debt.debt_type === 'payable'
      const today     = new Date().toISOString().split('T')[0]
      const adminFee  = payData.admin_fee || 0

      // 1. Update paid_amount (payDebt hanya ubah DB, TIDAK adjust wallet)
      const { error: debtErr, actualAmount } = await payDebt({
        debt_id:    debt.id,
        pay_amount: payData.pay_amount,
        pay_mode:   payData.pay_mode,
      })
      if (debtErr) throw debtErr

      // 2. Adjust wallet (satu kali saja di sini)
      if (payData.wallet_id) {
        // Payable: bayar hutang → keluar → negatif
        // Receivable: terima piutang → masuk → positif
        const delta = isPayable ? -(actualAmount + adminFee) : actualAmount
        await walletService.adjustBalance(payData.wallet_id, delta)
        applyBalanceDelta(payData.wallet_id, delta)
      }

      // 3. Catat transaksi utama
      const category = payData.category || 'debt_payment'
      await transactionService.create({
        user_id: user.id,
        type: isPayable ? 'expense' : 'income',
        transaction_subtype: 'regular',
        category,
        amount: actualAmount,
        wallet_id: payData.wallet_id || null,
        date: today,
        debt_id: debt.id,
        description: payData.description || (isPayable ? `Bayar hutang ke ${debt.person_name}` : `Terima dari ${debt.person_name}`),
      })

      // 4. Admin fee terpisah
      if (adminFee > 0 && payData.wallet_id) {
        await walletService.adjustBalance(payData.wallet_id, -adminFee)
        applyBalanceDelta(payData.wallet_id, -adminFee)
        await transactionService.create({
          user_id: user.id, type: 'expense', transaction_subtype: 'regular',
          category: 'admin_fee', amount: adminFee,
          wallet_id: payData.wallet_id, date: today,
          description: `Biaya admin transfer ke ${debt.person_name}`,
        })
      }

      toast.success(payData.pay_mode === 'full'
        ? (isPayable ? '✅ Hutang lunas!' : '✅ Piutang diterima!')
        : `💰 ${formatCurrency(actualAmount)} tercatat`)
      setPayItem(null)
    } catch (e) {
      toast.error(e.message || 'Terjadi kesalahan')
    } finally {
      setPayLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hutang & Piutang"
        subtitle="Lacak uang yang kamu pinjam dan pinjamkan"
        action={<Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>Tambah</Button>}
      />

      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Sisa hutangmu</p>
          <p className="font-display text-xl font-semibold amount-expense">{formatCurrency(totalOwed)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{payables.filter(d=>d.status!=='paid').length} belum lunas</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Piutangmu</p>
          <p className="font-display text-xl font-semibold amount-income">{formatCurrency(totalOwedYou)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{receivables.filter(d=>d.status!=='paid').length} belum diterima</p>
        </Card>
      </div>

      <div className="flex rounded-xl border border-warmgray-200 dark:border-warmgray-700 overflow-hidden bg-white/40 dark:bg-warmgray-900/30 p-1 gap-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200
              ${tab === t.id ? 'bg-sage-400 text-white shadow-soft' : 'text-warmgray-500 hover:text-warmgray-700 dark:hover:text-warmgray-300'}`}>
            {t.label}
            <span className={`ml-2 text-xs rounded-full px-1.5 py-0.5 ${tab===t.id ? 'bg-white/20' : 'bg-warmgray-200 dark:bg-warmgray-700 text-warmgray-500'}`}>
              {t.id === 'payable' ? payables.length : receivables.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon={CreditCard}
            title={tab==='payable' ? 'Tidak ada hutang' : 'Tidak ada piutang'}
            description={tab==='payable' ? 'Tambahkan hutang yang perlu kamu bayar.' : 'Tambahkan piutang yang perlu ditagih.'}
            action={<Button variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Tambah {tab==='payable'?'Hutang':'Piutang'}</Button>}
          />
        </Card>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map(debt => (
            <DebtCard key={debt.id} debt={debt}
              onEdit={d => setEditItem(d)}
              onDelete={id => setDeleteConfirm(id)}
              onPay={d => setPayItem(d)} />
          ))}
        </motion.div>
      )}

      <motion.button whileTap={{ scale:0.93 }} onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-gradient-sage shadow-soft-md flex items-center justify-center text-white z-40">
        <Plus size={24} />
      </motion.button>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Tambah ${tab==='payable'?'Hutang':'Piutang'}`} size="md">
        <DebtForm onSubmit={handleAdd} debtType={tab} loading={savingLoading} wallets={wallets} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit" size="md">
        {editItem && <DebtForm onSubmit={handleEdit} defaultValues={editItem} debtType={editItem.debt_type} loading={savingLoading} wallets={wallets} />}
      </Modal>

      <DebtPaymentModal open={!!payItem} onClose={() => setPayItem(null)} debt={payItem} wallets={wallets} onSubmit={handlePayment} loading={payLoading} />

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Hapus" size="sm"
        footer={<><Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Batal</Button><Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Hapus</Button></>}>
        <p className="text-sm text-[var(--text-secondary)]">Hapus data ini?</p>
      </Modal>
    </div>
  )
}
