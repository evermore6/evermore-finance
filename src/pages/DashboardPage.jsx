import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTransactions, useAllTransactions, useBudgets, useWallets, useSavingsGoals, useCustomCategories } from '@/hooks'
import { BalanceSummary, MonthlyChart, CategoryChart, RecentTransactions, AIInsights } from '@/components/dashboard'
import { WalletSummary } from '@/components/wallets'
import { QuickAddModal } from '@/components/transactions/QuickAddModal'
import { Button, Card } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { generateInsights, getMonthsRange } from '@/utils'
import { getCategoryById } from '@/constants/categories'
import { exportToCSV } from '@/utils/exportUtils'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const now        = new Date()
  const [showAdd, setShowAdd]       = useState(false)
  const [addLoading, setAddLoading] = useState(false)

  const { transactions, income, expense, loading, addTransaction } =
    useTransactions({ year: now.getFullYear(), month: now.getMonth() })

  const { transactions: allTxns } = useAllTransactions()
  const { budgets }                = useBudgets()
  const { goals }                  = useSavingsGoals()
  const { categories: customCats } = useCustomCategories()
  const { wallets, totalBalance, loading: walletsLoading, applyBalanceDelta } = useWallets()

  const monthlyChartData = useMemo(() => {
    return getMonthsRange(6).map(({ year, month, label }) => {
      const f = allTxns.filter(t => {
        const d = new Date(t.date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      // Exclude transfer & topup — bukan pemasukan/pengeluaran nyata
      const isRealExpense = t => t.type === 'expense' && t.transaction_subtype !== 'transfer' && t.transaction_subtype !== 'topup'
      const isRealIncome  = t => t.type === 'income'  && t.transaction_subtype !== 'transfer' && t.transaction_subtype !== 'topup'
      return {
        label,
        income:  f.filter(isRealIncome).reduce((s,t) => s + t.amount, 0),
        expense: f.filter(isRealExpense).reduce((s,t) => s + t.amount, 0),
      }
    })
  }, [allTxns])

  const categoryData = useMemo(() => {
    const map = {}
    transactions
      .filter(t =>
        t.type === 'expense' &&
        t.transaction_subtype !== 'transfer' &&
        t.transaction_subtype !== 'topup' &&
        t.category !== 'transfer'  // exclude kategori transfer dari pie chart
      )
      .forEach(t => {
        map[t.category] = (map[t.category] || 0) + t.amount
      })
    return Object.entries(map)
      .map(([id, value]) => { const cat = getCategoryById(id); return { name: cat?.label || id, value, color: cat?.color || '#a3b18a' } })
      .sort((a,b) => b.value - a.value).slice(0, 6)
  }, [transactions])

  const insights = useMemo(() => generateInsights(allTxns, budgets), [allTxns, budgets])

  const handleAdd = async (data) => {
    setAddLoading(true)
    const { error } = await addTransaction(data, applyBalanceDelta)
    setAddLoading(false)
    if (!error) setShowAdd(false)
  }

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'there'
  const h = now.getHours()
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${name} 🌿`}
        subtitle={now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={Download}
              onClick={() => { if (!transactions.length) { toast.error('No transactions'); return } exportToCSV(transactions, `evermore-${now.getFullYear()}-${now.getMonth()+1}`); toast.success('Exported!') }}>
              Export
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
              Add
            </Button>
          </div>
        }
      />

      <BalanceSummary income={income} expense={expense} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><MonthlyChart data={monthlyChartData} /></div>
        <div>
          {categoryData.length > 0
            ? <CategoryChart data={categoryData} />
            : <Card className="h-full flex items-center justify-center"><p className="text-sm text-[var(--text-muted)] text-center">No expense data</p></Card>
          }
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WalletSummary wallets={wallets} totalBalance={totalBalance} loading={walletsLoading} onNavigate={() => navigate('/wallets')} />
        <AIInsights insights={insights} />
      </div>

      <RecentTransactions transactions={transactions} loading={loading} />

      {/* FAB mobile */}
      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-gradient-sage shadow-soft-md flex items-center justify-center text-white z-40">
        <Plus size={24} />
      </motion.button>

      <QuickAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        wallets={wallets}
        savingGoals={goals}
        customCategories={customCats}
        onSubmit={handleAdd}
        loading={addLoading}
      />
    </div>
  )
}
