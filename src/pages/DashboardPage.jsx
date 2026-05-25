import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Download, RefreshCw } from 'lucide-react'
import { useTransactions, useAllTransactions, useBudgets } from '@/hooks'
import {
  BalanceSummary, MonthlyChart, CategoryChart,
  RecentTransactions, AIInsights
} from '@/components/dashboard'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Modal, Button, Card } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { generateInsights, getMonthsRange } from '@/utils'
import { getCategoryById } from '@/constants/categories'
import { exportToCSV } from '@/utils/exportUtils'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user } = useAuth()
  const now = new Date()
  const [showAddModal, setShowAddModal] = useState(false)
  const [addLoading, setAddLoading]     = useState(false)

  const {
    transactions, income, expense, loading,
    addTransaction, refetch
  } = useTransactions({ year: now.getFullYear(), month: now.getMonth() })

  const { transactions: allTxns } = useAllTransactions()
  const { budgets } = useBudgets()

  // Monthly trend data (last 6 months)
  const monthlyChartData = useMemo(() => {
    const months = getMonthsRange(6)
    return months.map(({ year, month, label }) => {
      const filtered = allTxns.filter(t => {
        const d = new Date(t.date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      return {
        label,
        income:  filtered.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0),
        expense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      }
    })
  }, [allTxns])

  // Category pie data
  const categoryData = useMemo(() => {
    const map = {}
    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map)
      .map(([id, value]) => {
        const cat = getCategoryById(id)
        return { name: cat?.label || id, value, color: cat?.color || '#a3b18a' }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [transactions])

  // AI insights
  const insights = useMemo(() => generateInsights(allTxns, budgets), [allTxns, budgets])

  const handleAddTransaction = async (data) => {
    setAddLoading(true)
    const { error } = await addTransaction(data)
    setAddLoading(false)
    if (!error) setShowAddModal(false)
  }

  const handleExport = () => {
    if (!transactions.length) { toast.error('No transactions this month'); return }
    exportToCSV(transactions, `evermore-${now.getFullYear()}-${now.getMonth() + 1}`)
    toast.success('Exported to CSV!')
  }

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${name} 🌿`}
        subtitle={now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>
              Export
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
              Add Transaction
            </Button>
          </div>
        }
      />

      {/* Balance Summary */}
      <BalanceSummary income={income} expense={expense} loading={loading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MonthlyChart data={monthlyChartData} />
        </div>
        <div>
          {categoryData.length > 0
            ? <CategoryChart data={categoryData} />
            : (
              <Card className="h-full flex items-center justify-center">
                <p className="text-sm text-[var(--text-muted)] text-center">No expense data this month</p>
              </Card>
            )
          }
        </div>
      </div>

      {/* Insights + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AIInsights insights={insights} />
        <RecentTransactions transactions={transactions} loading={loading} />
      </div>

      {/* Quick Add FAB (mobile) */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowAddModal(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-gradient-sage shadow-soft-md flex items-center justify-center text-white z-40"
      >
        <Plus size={24} />
      </motion.button>

      {/* Add Transaction Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Transaction"
        size="md"
      >
        <TransactionForm onSubmit={handleAddTransaction} loading={addLoading} />
      </Modal>
    </div>
  )
}
