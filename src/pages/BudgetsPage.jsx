import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, ChevronLeft, ChevronRight, Target } from 'lucide-react'
import { useBudgets, useTransactions } from '@/hooks'
import { BudgetForm, BudgetCard } from '@/components/budgets-savings'
import { Modal, Button, Card, EmptyState, Skeleton } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency } from '@/utils'
import { EXPENSE_CATEGORIES } from '@/constants/categories'

export default function BudgetsPage() {
  const now = new Date()
  const [viewDate, setViewDate] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [showAdd, setShowAdd]     = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [savingLoading, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { budgets, loading: budgetsLoading, upsertBudget, deleteBudget } = useBudgets(viewDate.year, viewDate.month)
  const { transactions, loading: txnLoading } = useTransactions({ ...viewDate })

  const loading = budgetsLoading || txnLoading

  // Calculate spent per category this month
  const spentByCategory = useMemo(() => {
    const map = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return map
  }, [transactions])

  // Overall stats
  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent    = budgets.reduce((s, b) => s + (spentByCategory[b.category] || 0), 0)
  const overBudget    = budgets.filter(b => (spentByCategory[b.category] || 0) >= b.amount).length

  const handleAdd = async (data) => {
    setSaving(true)
    const { error } = await upsertBudget({ ...data, year: viewDate.year, month: viewDate.month })
    setSaving(false)
    if (!error) setShowAdd(false)
  }

  const handleEdit = async (data) => {
    setSaving(true)
    const { error } = await upsertBudget({ ...data, id: editItem.id, year: viewDate.year, month: viewDate.month })
    setSaving(false)
    if (!error) setEditItem(null)
  }

  const navigateMonth = (dir) => {
    setViewDate(prev => {
      let m = prev.month + dir
      let y = prev.year
      if (m > 11) { m = 0; y++ }
      if (m < 0)  { m = 11; y-- }
      return { year: y, month: m }
    })
  }

  const monthLabel = new Date(viewDate.year, viewDate.month, 1)
    .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  // Only show categories not yet budgeted in the "add" form
  const budgetedCats = new Set(budgets.map(b => b.category))
  const availableCats = EXPENSE_CATEGORIES.filter(c => !budgetedCats.has(c.id))

  return (
    <div className="space-y-5">
      <PageHeader
        title="Budgets"
        subtitle="Set spending limits per category"
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)} disabled={availableCats.length === 0}>
            Add Budget
          </Button>
        }
      />

      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigateMonth(-1)} className="p-2 rounded-xl hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-500 hover:text-sage-600 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-display font-semibold text-[var(--text-primary)]">{monthLabel}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{budgets.length} categories budgeted</p>
        </div>
        <button onClick={() => navigateMonth(1)} className="p-2 rounded-xl hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-500 hover:text-sage-600 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="text-center p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Budgeted</p>
            <p className="font-display text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(totalBudgeted)}</p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Spent</p>
            <p className={`font-display text-lg font-semibold ${totalSpent > totalBudgeted ? 'amount-expense' : 'text-[var(--text-primary)]'}`}>
              {formatCurrency(totalSpent)}
            </p>
          </Card>
          <Card className="text-center p-4">
            <p className="text-xs text-[var(--text-muted)] mb-1">Over limit</p>
            <p className={`font-display text-lg font-semibold ${overBudget > 0 ? 'amount-expense' : 'amount-income'}`}>
              {overBudget}
            </p>
          </Card>
        </div>
      )}

      {/* Budget Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No budgets set"
            description="Set monthly spending limits per category to stay on track."
            action={<Button variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Set First Budget</Button>}
          />
        </Card>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              spent={spentByCategory[budget.category] || 0}
              onEdit={b => setEditItem(b)}
              onDelete={id => setDeleteConfirm(id)}
            />
          ))}
        </motion.div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Set Budget" size="sm">
        <BudgetForm
          onSubmit={handleAdd}
          loading={savingLoading}
          defaultValues={{ year: viewDate.year, month: viewDate.month }}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Budget" size="sm">
        {editItem && <BudgetForm onSubmit={handleEdit} defaultValues={editItem} loading={savingLoading} />}
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Budget" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => { await deleteBudget(deleteConfirm); setDeleteConfirm(null) }}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Remove this budget limit?</p>
      </Modal>
    </div>
  )
}
