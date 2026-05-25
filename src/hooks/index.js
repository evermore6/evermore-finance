import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { transactionService } from '@/services/transactionService'
import { debtService, budgetService, savingsService } from '@/services/index'
import toast from 'react-hot-toast'

// ── useTransactions ───────────────────────────────────────
export function useTransactions({ year, month, filters = {} } = {}) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const now = new Date()
  const y = year  ?? now.getFullYear()
  const m = month ?? now.getMonth()

  const fetchTransactions = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await transactionService.getMonthly(user.id, y, m)
      if (error) throw error
      let result = data || []
      if (filters.type)   result = result.filter(t => t.type === filters.type)
      if (filters.search) result = result.filter(t =>
        t.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        t.category?.toLowerCase().includes(filters.search.toLowerCase())
      )
      setTransactions(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [user, y, m, filters.type, filters.search])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // Process recurring on mount
  useEffect(() => {
    if (user) transactionService.processRecurring(user.id)
  }, [user])

  const addTransaction = async (data) => {
    try {
      // Strip fields that don't exist in the transactions table
      // 'frequency' lives only in recurring_templates, never in transactions
      const { frequency, ...txnFields } = data
      const payload = { ...txnFields, user_id: user.id }

      // If recurring, create the recurring_template first
      if (data.is_recurring) {
        const { data: template } = await transactionService.createRecurringTemplate({
          user_id:        user.id,
          type:           data.type,
          category:       data.category,
          amount:         data.amount,
          payment_method: data.payment_method,
          description:    data.description,
          frequency:      frequency || 'monthly',
          next_due:       computeNextDue(data.date, frequency || 'monthly'),
          is_active:      true,
        })
        if (template) payload.recurring_id = template.id
      }

      const { data: txn, error } = await transactionService.create(payload)
      if (error) throw error
      setTransactions(prev => [txn, ...prev])
      toast.success('Transaction added!')
      return { data: txn }
    } catch (e) {
      toast.error(e.message)
      return { error: e }
    }
  }

  const updateTransaction = async (id, data) => {
    try {
      // Strip non-DB fields on update too
      const { frequency, ...updateFields } = data
      const { data: txn, error } = await transactionService.update(id, updateFields)
      if (error) throw error
      setTransactions(prev => prev.map(t => t.id === id ? txn : t))
      toast.success('Transaction updated!')
      return { data: txn }
    } catch (e) {
      toast.error(e.message)
      return { error: e }
    }
  }

  const deleteTransaction = async (id) => {
    try {
      const { error } = await transactionService.delete(id)
      if (error) throw error
      setTransactions(prev => prev.filter(t => t.id !== id))
      toast.success('Transaction deleted')
    } catch (e) {
      toast.error(e.message)
    }
  }

  const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return { transactions, loading, error, income, expense, balance: income - expense, addTransaction, updateTransaction, deleteTransaction, refetch: fetchTransactions }
}

// ── useAllTransactions ────────────────────────────────────
export function useAllTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchAll = async () => {
      setLoading(true)
      const { data } = await transactionService.getAll({ userId: user.id, limit: 500 })
      setTransactions(data || [])
      setLoading(false)
    }
    fetchAll()
  }, [user])

  return { transactions, loading }
}

// ── useDebts ──────────────────────────────────────────────
export function useDebts() {
  const { user } = useAuth()
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await debtService.getAll(user.id)
    setDebts(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const addDebt = async (data) => {
    const { data: d, error } = await debtService.create({ ...data, user_id: user.id })
    if (!error) { setDebts(p => [d, ...p]); toast.success('Added!') }
    else toast.error(error.message)
    return { data: d, error }
  }

  const updateDebt = async (id, data) => {
    const { data: d, error } = await debtService.update(id, data)
    if (!error) { setDebts(p => p.map(x => x.id === id ? d : x)); toast.success('Updated!') }
    else toast.error(error.message)
    return { data: d, error }
  }

  const deleteDebt = async (id) => {
    const { error } = await debtService.delete(id)
    if (!error) { setDebts(p => p.filter(x => x.id !== id)); toast.success('Deleted') }
    else toast.error(error.message)
  }

  const payables    = debts.filter(d => d.debt_type === 'payable')
  const receivables = debts.filter(d => d.debt_type === 'receivable')

  return { debts, payables, receivables, loading, addDebt, updateDebt, deleteDebt }
}

// ── useBudgets ────────────────────────────────────────────
export function useBudgets(year, month) {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const y = year  ?? now.getFullYear()
  const m = month ?? now.getMonth()

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await budgetService.getAll(user.id, y, m)
    setBudgets(data || [])
    setLoading(false)
  }, [user, y, m])

  useEffect(() => { fetch() }, [fetch])

  const upsertBudget = async (data) => {
    const { data: b, error } = await budgetService.upsert({ ...data, user_id: user.id })
    if (!error) { setBudgets(p => { const idx = p.findIndex(x => x.id === b.id); return idx >= 0 ? p.map(x => x.id === b.id ? b : x) : [b, ...p] }); toast.success('Budget saved!') }
    else toast.error(error.message)
    return { data: b, error }
  }

  const deleteBudget = async (id) => {
    const { error } = await budgetService.delete(id)
    if (!error) { setBudgets(p => p.filter(x => x.id !== id)); toast.success('Budget deleted') }
    else toast.error(error.message)
  }

  return { budgets, loading, upsertBudget, deleteBudget }
}

// ── useSavingsGoals ───────────────────────────────────────
export function useSavingsGoals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await savingsService.getAll(user.id)
    setGoals(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const addGoal = async (data) => {
    const { data: g, error } = await savingsService.create({ ...data, user_id: user.id })
    if (!error) { setGoals(p => [g, ...p]); toast.success('Goal created!') }
    else toast.error(error.message)
    return { data: g, error }
  }

  const updateGoal = async (id, data) => {
    const { data: g, error } = await savingsService.update(id, data)
    if (!error) { setGoals(p => p.map(x => x.id === id ? g : x)); toast.success('Updated!') }
    else toast.error(error.message)
    return { data: g, error }
  }

  const addContribution = async (id, amount) => {
    const { data: g, error } = await savingsService.addContribution(id, amount)
    if (!error) { setGoals(p => p.map(x => x.id === id ? g : x)); toast.success(`+${amount.toLocaleString('id-ID')} added!`) }
    else toast.error(error.message)
    return { data: g, error }
  }

  const deleteGoal = async (id) => {
    const { error } = await savingsService.delete(id)
    if (!error) { setGoals(p => p.filter(x => x.id !== id)); toast.success('Goal deleted') }
    else toast.error(error.message)
  }

  return { goals, loading, addGoal, updateGoal, addContribution, deleteGoal }
}

// ── useRecurringTemplates ─────────────────────────────────
export function useRecurringTemplates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetch = async () => {
      setLoading(true)
      const { data } = await transactionService.getRecurring(user.id)
      setTemplates(data || [])
      setLoading(false)
    }
    fetch()
  }, [user])

  const updateTemplate = async (id, data) => {
    const { data: t, error } = await transactionService.updateRecurringTemplate(id, data)
    if (!error) { setTemplates(p => p.map(x => x.id === id ? t : x)); toast.success('Updated!') }
    else toast.error(error.message)
  }

  const deleteTemplate = async (id) => {
    const { error } = await transactionService.deleteRecurringTemplate(id)
    if (!error) { setTemplates(p => p.filter(x => x.id !== id)); toast.success('Recurring deleted') }
    else toast.error(error.message)
  }

  return { templates, loading, updateTemplate, deleteTemplate }
}

// ── helpers ───────────────────────────────────────────────
function computeNextDue(from, frequency) {
  const d = new Date(from)
  if (frequency === 'weekly')  d.setDate(d.getDate() + 7)
  if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
  if (frequency === 'yearly')  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}
