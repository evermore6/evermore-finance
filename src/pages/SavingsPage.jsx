import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, PiggyBank } from 'lucide-react'
import { useSavingsGoals } from '@/hooks'
import { SavingsForm, SavingsCard } from '@/components/budgets-savings'
import { Modal, Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency } from '@/utils'

export default function SavingsPage() {
  const { goals, loading, addGoal, updateGoal, addContribution, deleteGoal } = useSavingsGoals()
  const [showAdd, setShowAdd]         = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [contributeItem, setContrib]  = useState(null)
  const [contribAmount, setContribAmount] = useState('')
  const [savingLoading, setSaving]    = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const handleAdd = async (data) => {
    setSaving(true)
    const { error } = await addGoal(data)
    setSaving(false)
    if (!error) setShowAdd(false)
  }

  const handleEdit = async (data) => {
    setSaving(true)
    const { error } = await updateGoal(editItem.id, data)
    setSaving(false)
    if (!error) setEditItem(null)
  }

  const handleContribute = async () => {
    const amount = parseFloat(contribAmount)
    if (!amount || amount <= 0) return
    setSaving(true)
    await addContribution(contributeItem.id, amount)
    setSaving(false)
    setContrib(null)
    setContribAmount('')
  }

  const totalSaved  = goals.reduce((s, g) => s + (g.current_amount || 0), 0)
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0)
  const completed   = goals.filter(g => g.current_amount >= g.target_amount).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Savings Goals"
        subtitle="Track progress towards your financial dreams"
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
            New Goal
          </Button>
        }
      />

      {/* Summary */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Total Saved</p>
            <p className="font-display text-lg font-semibold amount-income">{formatCurrency(totalSaved)}</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Total Target</p>
            <p className="font-display text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(totalTarget)}</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Completed</p>
            <p className="font-display text-lg font-semibold text-[var(--text-primary)]">{completed} / {goals.length}</p>
          </Card>
        </div>
      )}

      {/* Goals Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={PiggyBank}
            title="No savings goals yet"
            description="Create a goal to track your savings progress — travel, emergency fund, gadgets, anything!"
            action={<Button variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Create First Goal</Button>}
          />
        </Card>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map(goal => (
            <SavingsCard
              key={goal.id}
              goal={goal}
              onEdit={g => setEditItem(g)}
              onDelete={id => setDeleteConfirm(id)}
              onContribute={g => { setContrib(g); setContribAmount('') }}
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
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Savings Goal" size="md">
        <SavingsForm onSubmit={handleAdd} loading={savingLoading} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Goal" size="md">
        {editItem && <SavingsForm onSubmit={handleEdit} defaultValues={editItem} loading={savingLoading} />}
      </Modal>

      {/* Contribute Modal */}
      <Modal
        open={!!contributeItem}
        onClose={() => setContrib(null)}
        title={`Add to: ${contributeItem?.name}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setContrib(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleContribute} loading={savingLoading}>Add Funds</Button>
          </>
        }
      >
        {contributeItem && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Current: <strong>{formatCurrency(contributeItem.current_amount)}</strong> of <strong>{formatCurrency(contributeItem.target_amount)}</strong>
            </p>
            <div>
              <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Amount to add</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500">Rp</span>
                <input
                  type="number"
                  min="1"
                  value={contribAmount}
                  onChange={e => setContribAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-lg font-mono focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Goal" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => { await deleteGoal(deleteConfirm); setDeleteConfirm(null) }}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Delete this savings goal? Progress will be lost.</p>
      </Modal>
    </div>
  )
}
