import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { transactionService } from '@/services/transactionService'
import { debtService, budgetService, savingsService } from '@/services/index'
import { walletService, customCategoryService } from '@/services/walletService'
import { budgetItemService } from '@/services/index'
import toast from 'react-hot-toast'

// ── useWallets ────────────────────────────────────────────
export function useWallets() {
  const { user } = useAuth()
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

  // Update saldo lokal tanpa refetch
  const applyBalanceDelta = (walletId, delta) => {
    setWallets(p => p.map(w =>
      w.id === walletId ? { ...w, balance: w.balance + delta } : w
    ))
  }

  const totalBalance = wallets
    .filter(w => w.type !== 'investment')
    .reduce((s, w) => s + (w.balance || 0), 0)

  const netWorth = wallets.reduce((s, w) => s + (w.balance || 0), 0)

  // ── Transfer antar wallet (dipanggil dari WalletsPage) ─
  const transferFunds = async (fromId, toId, amount, adminFee = 0) => {
    try {
      const { error } = await walletService.transfer(fromId, toId, amount, adminFee)
      if (error) throw error

      // Update saldo lokal
      applyBalanceDelta(fromId, -(amount + adminFee))
      applyBalanceDelta(toId,    amount)

      toast.success('Transfer berhasil!')
      return { error: null }
    } catch (e) {
      toast.error(e.message || 'Transfer gagal')
      return { error: e }
    }
  }

  return {
    wallets, loading, totalBalance, netWorth,
    addWallet, updateWallet, deleteWallet,
    applyBalanceDelta, transferFunds, refetch: fetch
  }
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

  useEffect(() => {
    if (user) transactionService.processRecurring(user.id)
  }, [user])

  // ── Tambah transaksi (semua tipe) ─────────────────────
  const addTransaction = async (data, applyBalanceDelta) => {
    try {
      const subtype = data.transaction_subtype || 'regular'

      // ── Transfer / Topup ──────────────────────────────
      if (subtype === 'transfer' || subtype === 'topup') {
        const { from_wallet_id, to_wallet_id, amount, admin_fee = 0, description, date } = data

        // Atomic transfer di DB
        const { error: txErr } = await walletService.transfer(from_wallet_id, to_wallet_id, amount, admin_fee)
        if (txErr) throw txErr

        // Update local wallet state
        if (applyBalanceDelta) {
          applyBalanceDelta(from_wallet_id, -(amount + admin_fee))
          applyBalanceDelta(to_wallet_id,   amount)
        }

        // Simpan transaksi yang linked (untuk history)
        const transferId = crypto.randomUUID()
        const batchRows = []

        // Transaksi keluar (amount saja, tanpa admin fee)
        batchRows.push({
          user_id:             user.id,
          type:                'expense',
          transaction_subtype: subtype,
          category:            'transfer',
          amount,
          admin_fee,
          wallet_id:           from_wallet_id,
          to_wallet_id,
          transfer_id:         transferId,
          description:         description || (subtype === 'topup' ? 'Top Up' : 'Transfer'),
          date,
        })

        // Transaksi masuk ke wallet tujuan
        batchRows.push({
          user_id:             user.id,
          type:                'income',
          transaction_subtype: subtype,
          category:            'transfer',
          amount,
          wallet_id:           to_wallet_id,
          transfer_id:         transferId,
          description:         description || (subtype === 'topup' ? 'Top Up diterima' : 'Transfer diterima'),
          date,
        })

        // ── AUTO: Admin fee → expense terpisah jika > 0 ───
        if (admin_fee > 0) {
          batchRows.push({
            user_id:             user.id,
            type:                'expense',
            transaction_subtype: 'regular',
            category:            'admin_fee',
            amount:              admin_fee,
            wallet_id:           from_wallet_id,
            description:         `Biaya admin ${subtype === 'topup' ? 'top up' : 'transfer'}`,
            date,
          })
          // Tidak perlu adjustBalance lagi — sudah termasuk di walletService.transfer
        }

        const { data: rows } = await transactionService.createBatch(batchRows)
        if (rows) setTransactions(prev => [...rows, ...prev])
        toast.success(subtype === 'topup' ? 'Top Up berhasil!' : 'Transfer berhasil!')
        return { data: rows }
      }

      // ── Saving Contribution ───────────────────────────
      if (subtype === 'saving_contribution') {
        const { wallet_id, saving_goal_id, amount, description, date } = data

        // Kurangi saldo wallet
        await walletService.adjustBalance(wallet_id, -amount)
        if (applyBalanceDelta) applyBalanceDelta(wallet_id, -amount)

        // Tambah ke saving goal
        const { supabase } = await import('@/lib/supabase')
        await supabase.rpc
          ? null
          : null
        // Direct update via savingsService
        const { savingsService: ss } = await import('@/services/index')
        await ss.addContribution(saving_goal_id, amount)

        // Catat sebagai transaksi
        const txn = {
          user_id:             user.id,
          type:                'expense',
          transaction_subtype: 'saving_contribution',
          category:            'transfer',
          amount,
          wallet_id,
          saving_goal_id,
          description:         description || 'Saving contribution',
          date,
        }
        const { data: saved, error } = await transactionService.create(txn)
        if (error) throw error
        setTransactions(prev => [saved, ...prev])
        toast.success('Saving berhasil disisihkan! 🐷')
        return { data: saved }
      }

      // ── Regular (income / expense) ────────────────────
      const { frequency, ...txnFields } = data
      const payload = { ...txnFields, user_id: user.id, transaction_subtype: 'regular' }

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
      // Reverse saldo lama
      if (oldData?.wallet_id && oldData.transaction_subtype === 'regular') {
        const oldDelta = oldData.type === 'income' ? -oldData.amount : oldData.amount
        await walletService.adjustBalance(oldData.wallet_id, oldDelta)
        if (applyBalanceDelta) applyBalanceDelta(oldData.wallet_id, oldDelta)
      }
      const { data: txn, error } = await transactionService.update(id, updateFields)
      if (error) throw error
      // Apply saldo baru
      if (data.wallet_id && data.transaction_subtype === 'regular') {
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
      const { error } = await transactionService.delete(id)
      if (error) throw error
      if (txn?.wallet_id && txn.transaction_subtype === 'regular') {
        const delta = txn.type === 'income' ? -txn.amount : txn.amount
        await walletService.adjustBalance(txn.wallet_id, delta)
        if (applyBalanceDelta) applyBalanceDelta(txn.wallet_id, delta)
      }
      setTransactions(prev => prev.filter(t => t.id !== id))
      toast.success('Transaksi dihapus')
    } catch (e) {
      toast.error(e.message)
    }
  }

  // Hanya hitung income/expense NYATA — exclude transfer & topup antar wallet
  // Null subtype = data lama, dianggap 'regular'
  const isRealIncome  = t => t.type === 'income'  && (t.transaction_subtype || 'regular') !== 'transfer' && (t.transaction_subtype || 'regular') !== 'topup'
  const isRealExpense = t => t.type === 'expense' && (t.transaction_subtype || 'regular') !== 'transfer' && (t.transaction_subtype || 'regular') !== 'topup'

  const income  = transactions.filter(isRealIncome).reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(isRealExpense).reduce((s, t) => s + t.amount, 0)

  return {
    transactions, loading, error,
    income, expense, balance: income - expense,
    addTransaction, updateTransaction, deleteTransaction,
    refetch: fetchTransactions,
  }
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

  // ── Bayar hutang / terima piutang ─────────────────────────
  const payDebt = async ({ debt_id, pay_amount, pay_mode, wallet_id, admin_fee = 0, description }) => {
    try {
      const debt = debts.find(d => d.id === debt_id)
      if (!debt) throw new Error('Debt not found')

      const isPayable    = debt.debt_type === 'payable'
      const isReceivable = debt.debt_type === 'receivable'
      const today        = new Date().toISOString().split('T')[0]

      // 1. Update paid_amount di DB (trigger otomatis update status)
      const r = pay_mode === 'full'
        ? await debtService.markFullyPaid(debt_id)
        : await debtService.recordPayment(debt_id, pay_amount)
      if (r.error) throw r.error

      // Update local state
      setDebts(p => p.map(x => x.id === debt_id ? r.data : x))

      // 2. Adjust wallet balance
      if (wallet_id) {
        // Payable: keluar dari wallet (bayar hutang) → delta negatif
        // Receivable: masuk ke wallet (terima uang) → delta positif
        const actualAmount = pay_mode === 'full'
          ? (debt.amount - (debt.paid_amount || 0))
          : pay_amount

        const walletDelta = isPayable
          ? -(actualAmount + admin_fee)
          : actualAmount

        await walletService.adjustBalance(wallet_id, walletDelta)

        // Admin fee juga kurangi wallet kalau receivable (biaya transfer masuk)
        // Biasanya yang nanggung admin fee adalah si pengirim, jadi untuk receivable tidak dikurangi

        return { data: r.data, walletDelta, actualAmount, admin_fee }
      }

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

// ── useBudgetItems ───────────────────────────────────────
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

  const updateItem = async (id, data) => {
    const { data: item, error } = await budgetItemService.update(id, data)
    if (!error) setItems(p => p.map(x => x.id === id ? item : x))
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
  const totalChecked   = items.filter(i => i.is_checked).reduce((s, i) => s + (i.amount || 0), 0)

  return { items, loading, totalAllocated, totalChecked, addItem, updateItem, toggleItem, deleteItem, refetch: fetch }
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

  const addGoal         = async (data)         => { const r = await savingsService.create({ ...data, user_id: user.id }); if (!r.error) { setGoals(p => [r.data, ...p]); toast.success('Goal created!') } else toast.error(r.error.message); return r }
  const updateGoal      = async (id, data)     => { const r = await savingsService.update(id, data); if (!r.error) { setGoals(p => p.map(x => x.id === id ? r.data : x)); toast.success('Updated!') } else toast.error(r.error.message); return r }
  const addContribution = async (id, amount)   => { const r = await savingsService.addContribution(id, amount); if (!r.error) { setGoals(p => p.map(x => x.id === id ? r.data : x)) } else toast.error(r.error.message); return r }
  const deleteGoal      = async (id)           => { const r = await savingsService.delete(id); if (!r.error) { setGoals(p => p.filter(x => x.id !== id)); toast.success('Goal deleted') } else toast.error(r.error.message) }

  return { goals, loading, addGoal, updateGoal, addContribution, deleteGoal, refetch: fetch }
}

// ── useRecurringTemplates ─────────────────────────────────
export function useRecurringTemplates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchFn = async () => {
      setLoading(true)
      const { data } = await transactionService.getRecurring(user.id)
      setTemplates(data || [])
      setLoading(false)
    }
    fetchFn()
  }, [user])

  const updateTemplate = async (id, data) => { const r = await transactionService.updateRecurringTemplate(id, data); if (!r.error) { setTemplates(p => p.map(x => x.id === id ? r.data : x)); toast.success('Updated!') } else toast.error(r.error.message) }
  const deleteTemplate = async (id)       => { const r = await transactionService.deleteRecurringTemplate(id); if (!r.error) { setTemplates(p => p.filter(x => x.id !== id)); toast.success('Recurring deleted') } else toast.error(r.error.message) }

  return { templates, loading, updateTemplate, deleteTemplate }
}

// ── helpers ───────────────────────────────────────────────
function computeNextDue(from, frequency) {
  const d = new Date(from)
  const originalDay = d.getDate()  // simpan tanggal asal (misal 31)

  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (frequency === 'monthly') {
    // Pindah ke bulan berikutnya
    const nextMonth = d.getMonth() + 1
    const nextYear  = nextMonth > 11 ? d.getFullYear() + 1 : d.getFullYear()
    const clampedMonth = nextMonth % 12
    // Cari hari terakhir bulan tujuan
    const lastDayOfNextMonth = new Date(nextYear, clampedMonth + 1, 0).getDate()
    // Pakai originalDay atau hari terakhir bulan (mana yang lebih kecil)
    d.setFullYear(nextYear)
    d.setMonth(clampedMonth)
    d.setDate(Math.min(originalDay, lastDayOfNextMonth))
  } else if (frequency === 'yearly') {
    const nextYear = d.getFullYear() + 1
    // Handle 29 Feb → 28 Feb kalau tahun bukan leap year
    const lastDayOfMonth = new Date(nextYear, d.getMonth() + 1, 0).getDate()
    d.setFullYear(nextYear)
    d.setDate(Math.min(originalDay, lastDayOfMonth))
  }

  return d.toISOString().split('T')[0]
}
