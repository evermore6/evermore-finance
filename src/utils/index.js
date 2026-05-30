// ── Currency ──────────────────────────────────────────────
export const formatCurrency = (amount, currency = 'IDR', locale = 'id-ID') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatCompact = (amount, currency = 'IDR') => {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000)     return `Rp ${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000)         return `Rp ${(amount / 1_000).toFixed(0)}K`
  return formatCurrency(amount, currency)
}

export const parseCurrencyInput = (value) => {
  const cleaned = String(value).replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}

// ── Dates ──────────────────────────────────────────────────
export const formatDate = (date, format = 'medium') => {
  if (!date) return ''
  const d = new Date(date)
  const options = {
    short:  { day: 'numeric', month: 'short' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long:   { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    time:   { hour: '2-digit', minute: '2-digit' },
    full:   { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  }
  return d.toLocaleDateString('id-ID', options[format] || options.medium)
}

export const getMonthYear = (date) => {
  const d = new Date(date)
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export const getStartOfMonth = (date = new Date()) => {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export const getEndOfMonth = (date = new Date()) => {
  const d = new Date(date)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)
}

export const isOverdue = (dueDate) => new Date(dueDate) < new Date()

export const daysUntil = (date) => {
  const diff = new Date(date) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export const getMonthsRange = (n = 6) => {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    months.push({
      year:  d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
    })
  }
  return months
}

// ── Helper: apakah transaksi ini pengeluaran nyata? ────────
// Transfer & topup antar wallet BUKAN pengeluaran nyata.
// category 'transfer' juga bukan pengeluaran nyata (debt payment dll).
// Null subtype dianggap 'regular' (data lama sebelum kolom subtype ada).
const isRealExpense = (t) => {
  if (t.type !== 'expense') return false
  const sub = t.transaction_subtype || 'regular'
  if (sub === 'transfer') return false
  if (sub === 'topup')    return false
  // Kalau kategorinya 'transfer' tapi subtype regular → kemungkinan debt payment
  // tetap dihitung sebagai expense nyata
  return true
}

const isRealIncome = (t) => {
  if (t.type !== 'income') return false
  const sub = t.transaction_subtype || 'regular'
  if (sub === 'transfer') return false
  if (sub === 'topup')    return false
  return true
}

// ── AI Insights (rule-based) ──────────────────────────────
export const generateInsights = (transactions, budgets = []) => {
  if (!transactions.length) return []
  const insights = []
  const now = new Date()

  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const lastMonth = transactions.filter(t => {
    const d = new Date(t.date)
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
  })

  // Hanya hitung pengeluaran & pemasukan NYATA — exclude transfer/topup antar wallet
  const thisIncome  = thisMonth.filter(isRealIncome).reduce((s, t) => s + t.amount, 0)
  const thisExpense = thisMonth.filter(isRealExpense).reduce((s, t) => s + t.amount, 0)
  const lastExpense = lastMonth.filter(isRealExpense).reduce((s, t) => s + t.amount, 0)

  // ── Saving rate ──────────────────────────────────────────
  if (thisIncome > 0) {
    const savingRate = ((thisIncome - thisExpense) / thisIncome * 100).toFixed(0)
    if (savingRate >= 20) {
      insights.push({ type: 'positive', icon: '🎉', text: `Luar biasa! Saving rate bulan ini ${savingRate}% — di atas rekomendasi 20%.` })
    } else if (savingRate < 0) {
      insights.push({ type: 'warning', icon: '⚠️', text: `Pengeluaran bulan ini melebihi pemasukan sebesar ${formatCurrency(thisExpense - thisIncome)}.` })
    } else {
      insights.push({ type: 'info', icon: '💡', text: `Saving rate bulan ini ${savingRate}%. Targetkan minimal 20% untuk kondisi finansial sehat.` })
    }
  }

  // ── Perbandingan bulan lalu ──────────────────────────────
  if (lastExpense > 0) {
    const diff = ((thisExpense - lastExpense) / lastExpense * 100).toFixed(0)
    if (diff > 20) {
      insights.push({ type: 'warning', icon: '📈', text: `Pengeluaran nyata bulan ini naik ${diff}% dari bulan lalu.` })
    } else if (diff < -10) {
      insights.push({ type: 'positive', icon: '📉', text: `Pengeluaran turun ${Math.abs(diff)}% dari bulan lalu. Kerja bagus!` })
    }
  }

  // ── Kategori terbesar — exclude transfer & topup ─────────
  const catTotals = {}
  thisMonth
    .filter(isRealExpense)
    // Jangan tampilkan 'transfer' di insight karena itu bukan belanja
    .filter(t => t.category !== 'transfer')
    .forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount
    })

  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]
  if (topCat) {
    const catLabel = topCat[0].replace(/_/g, ' ')
    insights.push({
      type: 'info',
      icon: '🏷️',
      text: `Pengeluaran terbesar bulan ini: ${catLabel} sebesar ${formatCurrency(topCat[1])}.`,
    })
  }

  // ── Budget warnings ──────────────────────────────────────
  budgets.forEach(budget => {
    const spent = catTotals[budget.category] || 0
    const pct   = (spent / budget.amount * 100)
    if (pct >= 90 && pct < 100) {
      insights.push({ type: 'warning', icon: '🔔', text: `Budget ${budget.category.replace(/_/g, ' ')} hampir habis (${pct.toFixed(0)}% terpakai).` })
    } else if (pct >= 100) {
      insights.push({ type: 'danger', icon: '🚨', text: `Budget ${budget.category.replace(/_/g, ' ')} sudah melebihi limit!` })
    }
  })

  return insights.slice(0, 4)
}
