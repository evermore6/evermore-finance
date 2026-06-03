import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { transactionService } from '@/services/transactionService'
import { debtService, budgetService, savingsService, budgetItemService } from '@/services/index'
import { walletService, customCategoryService } from '@/services/walletService'
import toast from 'react-hot-toast'

// ═══════════════════════════════════════════════════════════
// _reverseAndDelete — hapus transaksi + balik semua efeknya
// Dipanggil dari deleteTransaction dan bisa dipakai standalone
// ═══════════════════════════════════════════════════════════
async function _reverseAndDelete(txn, applyBalanceDelta, setTransactions) {
  if (!txn) return
  const sub         = txn.transaction_subtype || 'regular'
  const idsToRemove = [txn.id]

  // ── Transfer & Topup: reverse kedua sisi ────────────────
  if ((sub === 'transfer' || sub === 'topup') && txn.transfer_id) {
    const { data: pairs } = await supabase
      .from('transactions')
      .select('*')
      .eq('transfer_id', txn.transfer_id)

    const outTxn = pairs?.find(t => t.type === 'expense')
    const inTxn  = pairs?.find(t => t.type === 'income')

    if (outTxn?.wallet_id) {
      // Kembalikan ke wallet asal: +amount (amount di outTxn sudah include admin_fee)
      await walletService.adjustBalance(outTxn.wallet_id, outTxn.amount)
      if (applyBalanceDelta) applyBalanceDelta(outTxn.wallet_id, outTxn.amount)
      idsToRemove.push(outTxn.id)
    }

    if (inTxn?.wallet_id) {
      // Tarik balik dari wallet tujuan
      await walletService.adjustBalance(inTxn.wallet_id, -inTxn.amount)
      if (applyBalanceDelta) applyBalanceDelta(inTxn.wallet_id, -inTxn.amount)
      idsToRemove.push(inTxn.id)
    }

    // Reverse admin_fee transaction kalau ada (linked via date + wallet + category)
    if (outTxn) {
      const { data: adminTxns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', outTxn.user_id)
        .eq('category', 'admin_fee')
        .eq('date', outTxn.date?.split('T')[0] ?? outTxn.date)
        .eq('wallet_id', outTxn.wallet_id)

      for (const at of (adminTxns || [])) {
        await walletService.adjustBalance(at.wallet_id, at.amount)
        if (applyBalanceDelta) applyBalanceDelta(at.wallet_id, at.amount)
        idsToRemove.push(at.id)
      }
    }

  // ── Saving Contribution ──────────────────────────────────
  } else if (sub === 'saving_contribution') {
    if (txn.wallet_id) {
      await walletService.adjustBalance(txn.wallet_id, txn.amount)
      if (applyBalanceDelta) applyBalanceDelta(txn.wallet_id, txn.amount)
    }
    if (txn.saving_goal_id) {
      const { data: goal } = await supabase
        .from('savings_goals').select('current_amount').eq('id', txn.saving_goal_id).single()
      if (goal) {
        const newAmt = Math.max((goal.current_amount || 0) - txn.amount, 0)
        await supabase.from('savings_goals').update({ current_amount: newAmt }).eq('id', txn.saving_goal_id)
      }
    }

  // ── Regular / Debt Payment (income atau expense biasa) ───
  } else {
    if (txn.wallet_id) {
      const delta = txn.type === 'income' ? -txn.amount : txn.amount
      await walletService.adjustBalance(txn.wallet_id, delta)
      if (applyBalanceDelta) applyBalanceDelta(txn.wallet_id, delta)
    }
    // Reverse debt paid_amount kalau ada debt_id
    if (txn.debt_id) {
      const { data: debt } = await supabase
        .from('debts').select('paid_amount').eq('id', txn.debt_id).single()
      if (debt) {
        const newPaid = Math.max((debt.paid_amount || 0) - txn.amount, 0)
        await supabase.from('debts').update({ paid_amount: newPaid }).eq('id', txn.debt_id)
      }
    }
  }

  // Hapus semua transaksi yang terlibat (deduplicate)
  const uniqueIds = [...new Set(idsToRemove)]
  for (const id of uniqueIds) {
    await transactionService.delete(id)
  }
  if (setTransactions) {
    setTransactions(prev => prev.filter(t => !uniqueIds.includes(t.id)))
  }
}

// ── useWallets ────────────────────────────────────────────
export function useWallets() {
  const { user }  = useAuth()
  const [wallets, setWallets]   = useState([])
  const [loading, setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await walletService.getAll(user.id)
    if (data && data.length === 0) {
      const { data: defaults } = await walletService.createDefaults(user.id)
      setWallets(defaults || [])
    } else {
      setWallets(data || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const applyBalanceDelta = (walletId, delta) => {
    setWallets(p => p.map(w =>
      w.id === walletId ? { ...w, balance: (w.balance || 0) + delta } : w
    ))
  }

  const addWallet = async (data) => {
    const { data: w, error } = await walletService.create({ ...data, user_id: user.id })
    if (!error) { setWallets(p => [...p, w]); toast.success('Wallet added!') }
    else toast.error(error.message)
    return { data: w, error }
  }

  const updateWallet = async (id, data) => {
    const { data: w, error } = await walletService.update(id, data)
    if (!error) { setWallets(p => p.map(x => x.id === id ? w : x)); toast.success('Wallet updated!') }
    else toast.error(error.message)
    return { data: w, error }
  }

  const deleteWallet = async (id) => {
    const { error } = await walletService.delete(id)
    if (!error) { setWallets(p => p.filter(x => x.id !== id)); toast.success('Wallet removed') }
    else toast.error(error.message)
  }

  const transferFunds = async (fromId, toId, amount, adminFee = 0) => {
    try {
      const { error } = await walletService.transfer(fromId, toId, amount, adminFee)
      if (error) throw error
      applyBalanceDelta(fromId, -(amount + adminFee))
      applyBalanceDelta(toId,    amount)
      toast.success('Transfer berhasil!')
      return { error: null }
    } catch (e) {
      toast.error(e.message || 'Transfer gagal')
      return { error: e }
    }
  }

  const totalBalance = wallets.filter(w => w.type !== 'investment').reduce((s, w) => s + (w.balance || 0), 0)
  const netWorth     = wallets.reduce((s, w) => s + (w.balance || 0), 0)

  return { wallets, loading, totalBalance, netWorth, addWallet, updateWallet, deleteWallet, applyBalanceDelta, transferFunds, refetch: fetch }
}

// ── useTransactions ───────────────────────────────────────
export function useTransactions({ year, month, filters = {} } = {}) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)

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
  useEffect(() => { if (user) transactionService.processRecurring(user.id) }, [user])

  const addTransaction = async (data, applyBalanceDelta) => {
    try {
      const sub = data.transaction_subtype || 'regular'

      // ── Transfer / Topup ──────────────────────────────
      if (sub === 'transfer' || sub === 'topup') {
        const { from_wallet_id, to_wallet_id, amount, admin_fee = 0, description, date } = data
        const { error: txErr } = await walletService.transfer(from_wallet_id, to_wallet_id, amount, admin_fee)
        if (txErr) throw txErr

        if (applyBalanceDelta) {
          applyBalanceDelta(from_wallet_id, -(amount + admin_fee))
          applyBalanceDelta(to_wallet_id,   amount)
        }

        const transferId = crypto.randomUUID()
        const batchRows = [
          {
            user_id: user.id, type: 'expense', transaction_subtype: sub,
            category: 'transfer', amount, admin_fee,
            wallet_id: from_wallet_id, to_wallet_id, transfer_id: transferId,
            description: description || (sub === 'topup' ? 'Top Up' : 'Transfer'), date,
          },
          {
            user_id: user.id, type: 'income', transaction_subtype: sub,
            category: 'transfer', amount,
            wallet_id: to_wallet_id, transfer_id: transferId,
            description: description || (sub === 'topup' ? 'Top Up diterima' : 'Transfer diterima'), date,
          },
        ]
        if (admin_fee > 0) {
          batchRows.push({
            user_id: user.id, type: 'expense', transaction_subtype: 'regular',
            category: 'admin_fee', amount: admin_fee,
            wallet_id: from_wallet_id,
            description: `Biaya admin ${sub === 'topup' ? 'top up' : 'transfer'}`, date,
          })
        }
        const { data: rows } = await transactionService.createBatch(batchRows)
        if (rows) setTransactions(prev => [...rows, ...prev])
        toast.success(sub === 'topup' ? 'Top Up berhasil!' : 'Transfer berhasil!')
        return { data: rows }
      }

      // ── Saving Contribution ───────────────────────────
      if (sub === 'saving_contribution') {
        const { wallet_id, saving_goal_id, amount, description, date } = data
        await walletService.adjustBalance(wallet_id, -amount)
        if (applyBalanceDelta) applyBalanceDelta(wallet_id, -amount)
        const { savingsService: ss } = await import('@/services/index')
        await ss.addContribution(saving_goal_id, amount)
        const txn = {
          user_id: user.id, type: 'expense', transaction_subtype: 'saving_contribution',
          category: 'transfer', amount, wallet_id, saving_goal_id,
          description: description || 'Saving contribution', date,
        }
        const { data: saved, error } = await transactionService.create(txn)
        if (error) throw error
        setTransactions(prev => [saved, ...prev])
        toast.success('Saving berhasil disisihkan! 🐷')
        return { data: saved }
      }

      // ── Regular ───────────────────────────────────────
      const { frequency, ...txnFields } = data
      const payload = { ...txnFields, user_id: user.id, transaction_subtype: 'regular' }

      if (data.is_recurring) {
        const { data: template } = await transactionService.createRecurringTemplate({
          user_id: user.id, type: data.type, category: data.category,
          amount: data.amount, payment_method: data.payment_method,
          description: data.description, frequency: frequency || 'monthly',
          next_due: computeNextDue(data.date, frequency || 'monthly'), is_active: true,
        })
        if (template) payload.recurring_id = template.id
      }

      const { data: txn, error } = await transactionService.create(payload)
      if (error) throw error

      if (data.wallet_id) {
        const delta = data.type === 'income' ? data.amount : -data.amount
        await walletService.adjustBalance(data.wallet_id, delta)
        if (applyBalanceDelta) applyBalanceDelta(data.wallet_id, delta)
      }
      setTransactions(prev => [txn, ...prev])
      toast.success('Transaksi ditambahkan!')
      return { data: txn }
    } catch (e) {
      toast.error(e.message)
      return { error: e }
    }
  }

  const updateTransaction = async (id, data, oldData, applyBalanceDelta) => {
    try {
      const { frequency, ...updateFields } = data
      // Reverse efek lama
      if (oldData?.wallet_id && (oldData.transaction_subtype || 'regular') === 'regular') {
        const oldDelta = oldData.type === 'income' ? -oldData.amount : oldData.amount
        await walletService.adjustBalance(oldData.wallet_id, oldDelta)
        if (applyBalanceDelta) applyBalanceDelta(oldData.wallet_id, oldDelta)
      }
      const { data: txn, error } = await transactionService.update(id, updateFields)
      if (error) throw error
      // Apply efek baru
      if (data.wallet_id && (data.transaction_subtype || 'regular') === 'regular') {
        const newDelta = data.type === 'income' ? data.amount : -data.amount
        await walletService.adjustBalance(data.wallet_id, newDelta)
        if (applyBalanceDelta) applyBalanceDelta(data.wallet_id, newDelta)
      }
      setTransactions(prev => prev.map(t => t.id === id ? txn : t))
      toast.success('Transaksi diperbarui!')
      return { data: txn }
    } catch (e) {
      toast.error(e.message)
      return { error: e }
    }
  }

  const deleteTransaction = async (id, applyBalanceDelta) => {
    try {
      const txn = transactions.find(t => t.id === id)
        || await transactionService.getById(id).then(r => r.data)
      await _reverseAndDelete(txn, applyBalanceDelta, setTransactions)
      toast.success('Transaksi dihapus & saldo dikembalikan')
    } catch (e) {
      toast.error(e.message || 'Gagal menghapus')
    }
  }

  // Hanya hitung income/expense NYATA (exclude transfer & topup)
  const isRealIncome  = t => t.type === 'income'  && (t.transaction_subtype || 'regular') !== 'transfer' && (t.transaction_subtype || 'regular') !== 'topup'
  const isRealExpense = t => t.type === 'expense' && (t.transaction_subtype || 'regular') !== 'transfer' && (t.transaction_subtype || 'regular') !== 'topup'
  const income  = transactions.filter(isRealIncome).reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(isRealExpense).reduce((s, t) => s + t.amount, 0)

  return { transactions, loading, error, income, expense, balance: income - expense, addTransaction, updateTransaction, deleteTransaction, refetch: fetchTransactions }
}

// ── useAllTransactions ────────────────────────────────────
export function useAllTransactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(true)

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

// ── useCustomCategories ───────────────────────────────────
export function useCustomCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await customCategoryService.getAll(user.id)
    setCategories(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const addCategory = async (data) => {
    const { data: c, error } = await customCategoryService.create({ ...data, user_id: user.id })
    if (!error) { setCategories(p => [...p, c]); toast.success('Kategori ditambahkan!') }
    else toast.error(error.message)
    return { data: c, error }
  }

  const deleteCategory = async (id) => {
    const { error } = await customCategoryService.delete(id)
    if (!error) { setCategories(p => p.filter(x => x.id !== id)); toast.success('Kategori dihapus') }
    else toast.error(error.message)
  }

  return { categories, loading, addCategory, deleteCategory }
}

// ── useDebts ──────────────────────────────────────────────
export function useDebts() {
  const { user } = useAuth()
  const [debts, setDebts]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await debtService.getAll(user.id)
    setDebts(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const addDebt    = async (data)     => { const r = await debtService.create({ ...data, user_id: user.id }); if (!r.error) { setDebts(p => [r.data, ...p]); toast.success('Added!') } else toast.error(r.error.message); return r }
  const updateDebt = async (id, data) => { const r = await debtService.update(id, data); if (!r.error) { setDebts(p => p.map(x => x.id === id ? r.data : x)); toast.success('Updated!') } else toast.error(r.error.message); return r }
  const deleteDebt = async (id)       => { const r = await debtService.delete(id); if (!r.error) { setDebts(p => p.filter(x => x.id !== id)); toast.success('Deleted') } else toast.error(r.error.message) }

  // payDebt: ONLY updates paid_amount in DB, returns updated debt
  // Wallet adjustment & transaction creation handled by caller (DebtsPage)
  const payDebt = async ({ debt_id, pay_amount, pay_mode }) => {
    try {
      const debt = debts.find(d => d.id === debt_id)
      if (!debt) throw new Error('Debt not found')
      const r = pay_mode === 'full'
        ? await debtService.markFullyPaid(debt_id)
        : await debtService.recordPayment(debt_id, pay_amount)
      if (r.error) throw r.error
      setDebts(p => p.map(x => x.id === debt_id ? r.data : x))
      return { data: r.data, actualAmount: pay_mode === 'full' ? (debt.amount - (debt.paid_amount || 0)) : pay_amount }
    } catch (e) {
      toast.error(e.message)
      return { error: e }
    }
  }

  return { debts, payables: debts.filter(d => d.debt_type === 'payable'), receivables: debts.filter(d => d.debt_type === 'receivable'), loading, addDebt, updateDebt, deleteDebt, payDebt }
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

// ── useBudgetItems ────────────────────────────────────────
export function useBudgetItems(budgetId) {
  const { user } = useAuth()
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!budgetId) { setItems([]); return }
    setLoading(true)
    const { data } = await budgetItemService.getByBudget(budgetId)
    setItems(data || [])
    setLoading(false)
  }, [budgetId])

  useEffect(() => { fetch() }, [fetch])

  const addItem = async (data) => {
    const payload = { ...data, budget_id: budgetId, user_id: user.id, sort_order: items.length }
    const { data: item, error } = await budgetItemService.create(payload)
    if (!error) setItems(p => [...p, item])
    else toast.error(error.message)
    return { data: item, error }
  }

  const toggleItem = async (id, currentState) => {
    const { data: item, error } = await budgetItemService.toggleCheck(id, currentState)
    if (!error) setItems(p => p.map(x => x.id === id ? item : x))
    else toast.error(error.message)
  }

  const deleteItem = async (id) => {
    const { error } = await budgetItemService.delete(id)
    if (!error) setItems(p => p.filter(x => x.id !== id))
    else toast.error(error.message)
  }

  const totalAllocated = items.reduce((s, i) => s + (i.amount || 0), 0)

  return { items, loading, totalAllocated, addItem, toggleItem, deleteItem, refetch: fetch }
}

// ── useSavingsGoals ───────────────────────────────────────
export function useSavingsGoals() {
  const { user } = useAuth()
  const [goals, setGoals]     = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await savingsService.getAll(user.id)
    setGoals(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const addGoal         = async (d)       => { const r = await savingsService.create({ ...d, user_id: user.id }); if (!r.error) { setGoals(p => [r.data, ...p]); toast.success('Goal created!') } else toast.error(r.error.message); return r }
  const updateGoal      = async (id, d)   => { const r = await savingsService.update(id, d); if (!r.error) { setGoals(p => p.map(x => x.id === id ? r.data : x)); toast.success('Updated!') } else toast.error(r.error.message); return r }
  const addContribution = async (id, amt) => { const r = await savingsService.addContribution(id, amt); if (!r.error) { setGoals(p => p.map(x => x.id === id ? r.data : x)) } else toast.error(r.error.message); return r }
  const deleteGoal      = async (id)      => { const r = await savingsService.delete(id); if (!r.error) { setGoals(p => p.filter(x => x.id !== id)); toast.success('Goal deleted') } else toast.error(r.error.message) }

  return { goals, loading, addGoal, updateGoal, addContribution, deleteGoal, refetch: fetch }
}

// ── useRecurringTemplates ─────────────────────────────────
export function useRecurringTemplates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    const fn = async () => {
      setLoading(true)
      const { data } = await transactionService.getRecurring(user.id)
      setTemplates(data || [])
      setLoading(false)
    }
    fn()
  }, [user])

  const updateTemplate = async (id, d) => { const r = await transactionService.updateRecurringTemplate(id, d); if (!r.error) { setTemplates(p => p.map(x => x.id === id ? r.data : x)); toast.success('Updated!') } else toast.error(r.error.message) }
  const deleteTemplate = async (id)    => { const r = await transactionService.deleteRecurringTemplate(id);    if (!r.error) { setTemplates(p => p.filter(x => x.id !== id)); toast.success('Recurring deleted') } else toast.error(r.error.message) }

  return { templates, loading, updateTemplate, deleteTemplate }
}

// ── helpers ───────────────────────────────────────────────
function computeNextDue(from, frequency) {
  const d = new Date(from)
  const originalDay = d.getDate()
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (frequency === 'monthly') {
    const nextMonth    = d.getMonth() + 1
    const nextYear     = nextMonth > 11 ? d.getFullYear() + 1 : d.getFullYear()
    const clampedMonth = nextMonth % 12
    const lastDay      = new Date(nextYear, clampedMonth + 1, 0).getDate()
    d.setFullYear(nextYear); d.setMonth(clampedMonth); d.setDate(Math.min(originalDay, lastDay))
  } else if (frequency === 'yearly') {
    const nextYear = d.getFullYear() + 1
    const lastDay  = new Date(nextYear, d.getMonth() + 1, 0).getDate()
    d.setFullYear(nextYear); d.setDate(Math.min(originalDay, lastDay))
  }
  return d.toISOString().split('T')[0]
}
