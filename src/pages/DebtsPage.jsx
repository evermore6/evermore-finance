import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useDebts } from '@/hooks'
import { DebtForm, DebtCard } from '@/components/debts'
import { Modal, Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency } from '@/utils'
import { CreditCard } from 'lucide-react'

const TABS = [
  { id: 'payable',    label: 'Debts',       desc: 'Money you owe' },
  { id: 'receivable', label: 'Receivables', desc: 'Money owed to you' },
]

export default function DebtsPage() {
  const { payables, receivables, loading, addDebt, updateDebt, deleteDebt } = useDebts()
  const [tab, setTab]             = useState('payable')
  const [showAdd, setShowAdd]     = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [savingLoading, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const list = tab === 'payable' ? payables : receivables

  const totalOwed    = payables.filter(d => d.status !== 'paid').reduce((s, d) => s + d.amount, 0)
  const totalOwedYou = receivables.filter(d => d.status !== 'paid').reduce((s, d) => s + d.amount, 0)

  const handleAdd = async (data) => {
    setSaving(true)
    const { error } = await addDebt({ ...data, debt_type: tab })
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Debts & Receivables"
        subtitle="Track money you owe and money owed to you"
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
            Add
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">You owe</p>
          <p className="font-display text-xl font-semibold amount-expense">{formatCurrency(totalOwed)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{payables.filter(d => d.status !== 'paid').length} pending</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Owed to you</p>
          <p className="font-display text-xl font-semibold amount-income">{formatCurrency(totalOwedYou)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{receivables.filter(d => d.status !== 'paid').length} pending</p>
        </Card>
      </div>

      {/* Tabs */}
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

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={CreditCard}
            title={tab === 'payable' ? 'No debts tracked' : 'No receivables tracked'}
            description={tab === 'payable' ? 'Track money you owe to others.' : 'Track money others owe you.'}
            action={
              <Button variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>
                Add {tab === 'payable' ? 'Debt' : 'Receivable'}
              </Button>
            }
          />
        </Card>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map(debt => (
            <DebtCard
              key={debt.id}
              debt={debt}
              onEdit={d => setEditItem(d)}
              onDelete={id => setDeleteConfirm(id)}
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
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Add ${tab === 'payable' ? 'Debt' : 'Receivable'}`} size="md">
        <DebtForm onSubmit={handleAdd} debtType={tab} loading={savingLoading} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Entry" size="md">
        {editItem && <DebtForm onSubmit={handleEdit} defaultValues={editItem} debtType={editItem.debt_type} loading={savingLoading} />}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Entry" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Are you sure you want to delete this entry?</p>
      </Modal>
    </div>
  )
}
