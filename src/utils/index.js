import { EXCLUDED_FROM_INSIGHTS } from '@/constants/categories'

// ── Currency ──────────────────────────────────────────────
export const formatCurrency = (amount, currency = 'IDR', locale = 'id-ID') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount)
}

export const formatCompact = (amount) => {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000)     return `Rp ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)         return `Rp ${(amount / 1_000).toFixed(0)}K`
  return formatCurrency(amount)
}

export const parseCurrencyInput = (value) => {
  return parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0
}

// ── Dates ──────────────────────────────────────────────────
export const formatDate = (date, format = 'medium') => {
  if (!date) return ''
  const d = new Date(date)
  const opts = {
    short:  { day: 'numeric', month: 'short' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long:   { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    time:   { hour: '2-digit', minute: '2-digit' },
    full:   { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  }
  return d.toLocaleDateString('id-ID', opts[format] || opts.medium)
}

export const getMonthYear  = (date) => new Date(date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
export const getStartOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1)
export const getEndOfMonth   = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
export const isOverdue       = (dueDate) => new Date(dueDate) < new Date()

export const daysUntil = (date) => {
  const diff = new Date(date) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export const getMonthsRange = (n = 6) => {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) })
  }
  return months
}

// ── Real expense/income helpers ────────────────────────────
// Exclude transfer & topup (perpindahan antar wallet bukan pengeluaran nyata)
export const isRealExpense = (t) => {
  if (t.type !== 'expense') return false
  const sub = t.transaction_subtype || 'regular'
  return sub !== 'transfer' && sub !== 'topup'
}
export const isRealIncome = (t) => {
  if (t.type !== 'income') return false
  const sub = t.transaction_subtype || 'regular'
  return sub !== 'transfer' && sub !== 'topup'
}

// ── AI Insights ───────────────────────────────────────────
export const generateInsights = (transactions, budgets = [], debts = []) => {
  if (!transactions.length) return []
  const insights = []
  const now = new Date()

  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const lastMonth = transactions.filter(t => {
    const d  = new Date(t.date)
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
  })

  const thisIncome  = thisMonth.filter(isRealIncome).reduce((s, t) => s + t.amount, 0)
  const thisExpense = thisMonth.filter(isRealExpense).reduce((s, t) => s + t.amount, 0)
  const lastExpense = lastMonth.filter(isRealExpense).reduce((s, t) => s + t.amount, 0)

  // Saving rate
  if (thisIncome > 0) {
    const rate = ((thisIncome - thisExpense) / thisIncome * 100).toFixed(0)
    if (rate >= 20)    insights.push({ type: 'positive', icon: '🎉', text: `Saving rate bulan ini ${rate}% — di atas rekomendasi 20%. Kerja bagus!` })
    else if (rate < 0) insights.push({ type: 'warning',  icon: '⚠️', text: `Pengeluaran melebihi pemasukan ${formatCurrency(thisExpense - thisIncome)} bulan ini.` })
    else               insights.push({ type: 'info',     icon: '💡', text: `Saving rate bulan ini ${rate}%. Targetkan minimal 20% untuk kondisi finansial sehat.` })
  }

  // Vs bulan lalu
  if (lastExpense > 0) {
    const diff = ((thisExpense - lastExpense) / lastExpense * 100).toFixed(0)
    if (diff > 20)      insights.push({ type: 'warning',  icon: '📈', text: `Pengeluaran naik ${diff}% dari bulan lalu.` })
    else if (diff < -10) insights.push({ type: 'positive', icon: '📉', text: `Pengeluaran turun ${Math.abs(diff)}% dari bulan lalu. Hebat!` })
  }

  // Kategori terbesar — exclude family_transfer, debt_payment, admin_fee, transfer
  const catTotals = {}
  thisMonth
    .filter(isRealExpense)
    .filter(t => !EXCLUDED_FROM_INSIGHTS.has(t.category))
    .forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount })

  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]
  if (topCat) {
    insights.push({ type: 'info', icon: '🏷️', text: `Pengeluaran terbesar: ${topCat[0].replace(/_/g, ' ')} sebesar ${formatCurrency(topCat[1])}.` })
  }

  // Budget warnings — HANYA kalau MELEBIHI (bukan pas 100%)
  budgets.forEach(b => {
    const spent = catTotals[b.category] || 0
    const pct   = (spent / b.amount) * 100
    if (pct > 100) {
      insights.push({ type: 'danger',  icon: '🚨', text: `Budget ${b.category.replace(/_/g, ' ')} sudah melebihi limit! (${pct.toFixed(0)}%)` })
    } else if (pct >= 80 && pct <= 100) {
      insights.push({ type: 'warning', icon: '🔔', text: `Budget ${b.category.replace(/_/g, ' ')} hampir habis (${pct.toFixed(0)}% terpakai).` })
    }
  })

  // Debt reminders
  const activeDebts = debts.filter(d => d.status !== 'paid')
  const overdueDebts = activeDebts.filter(d => d.due_date && daysUntil(d.due_date) < 0)
  if (overdueDebts.length > 0) {
    const names = overdueDebts.map(d => d.person_name).slice(0, 2).join(', ')
    insights.push({ type: 'danger', icon: '🚨', text: `${overdueDebts.length} hutang sudah lewat jatuh tempo: ${names}.` })
  }
  const dueSoon = activeDebts.filter(d => { if (!d.due_date) return false; const days = daysUntil(d.due_date); return days >= 0 && days <= 7 })
  if (dueSoon.length > 0) {
    const d    = dueSoon[0]
    const days = daysUntil(d.due_date)
    insights.push({ type: 'warning', icon: '🔔', text: `Hutang ke ${d.person_name} ${formatCurrency(d.amount - (d.paid_amount || 0))} jatuh tempo ${days === 0 ? 'hari ini' : `${days} hari lagi`}.` })
  }
  const payables = activeDebts.filter(d => d.debt_type === 'payable')
  if (payables.length > 0) {
    const total = payables.reduce((s, d) => s + (d.amount - (d.paid_amount || 0)), 0)
    insights.push({ type: 'info', icon: '💸', text: `Sisa hutangmu: ${formatCurrency(total)} dari ${payables.length} orang.` })
  }
  const receivables = activeDebts.filter(d => d.debt_type === 'receivable')
  if (receivables.length > 0) {
    const total = receivables.reduce((s, d) => s + (d.amount - (d.paid_amount || 0)), 0)
    insights.push({ type: 'info', icon: '💰', text: `Piutang belum diterima: ${formatCurrency(total)} dari ${receivables.length} orang.` })
  }

  return insights.slice(0, 6)
}
