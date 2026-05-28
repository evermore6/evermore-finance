export const EXPENSE_CATEGORIES = [
  { id: 'food_beverage',  label: 'Food & Beverage',  icon: '🍜', color: '#e07a4a' },
  { id: 'housing',        label: 'Housing',           icon: '🏠', color: '#6a9ecc' },
  { id: 'personal_care',  label: 'Personal Care',     icon: '✨', color: '#c47ab0' },
  { id: 'transportation', label: 'Transportation',    icon: '🚗', color: '#5a9a7a' },
  { id: 'shopping',       label: 'Shopping',          icon: '🛍️', color: '#d06a8a' },
  { id: 'entertainment',  label: 'Entertainment',     icon: '🎬', color: '#8a78cc' },
  { id: 'education',      label: 'Education',         icon: '📚', color: '#60a8c0' },
  { id: 'healthcare',     label: 'Healthcare',        icon: '🏥', color: '#70b870' },
  { id: 'transfer',       label: 'Transfer',          icon: '↔️', color: '#9090a0' },
  { id: 'utilities',      label: 'Utilities',         icon: '💡', color: '#c8a048' },
  { id: 'admin_fee',      label: 'Admin Fee',         icon: '🏷️', color: '#b07050' },
  { id: 'misc',           label: 'Misc',              icon: '📦', color: '#a0a0a0' },
]

export const INCOME_CATEGORIES = [
  { id: 'salary',    label: 'Salary',    icon: '💼', color: '#5a8a4a' },
  { id: 'freelance', label: 'Freelance', icon: '💻', color: '#4a7aba' },
  { id: 'bonus',     label: 'Bonus',     icon: '🎁', color: '#c8a048' },
  { id: 'gift',      label: 'Gift',      icon: '🎀', color: '#c47ab0' },
  { id: 'refund',    label: 'Refund',    icon: '↩️', color: '#70b870' },
]

export const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES.map(c => ({ ...c, type: 'expense' })),
  ...INCOME_CATEGORIES.map(c => ({ ...c, type: 'income' })),
]

export const getCategoryById = (id) => ALL_CATEGORIES.find(c => c.id === id)

export const getCategoriesByType = (type) =>
  type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

export const PAYMENT_METHODS = [
  { id: 'cash',          label: 'Cash',         icon: '💵' },
  { id: 'debit_card',    label: 'Debit Card',   icon: '💳' },
  { id: 'credit_card',   label: 'Credit Card',  icon: '💳' },
  { id: 'bank_transfer', label: 'Bank Transfer',icon: '🏦' },
  { id: 'ewallet',       label: 'E-Wallet',     icon: '📱' },
  { id: 'qris',          label: 'QRIS',         icon: '📲' },
  { id: 'other',         label: 'Other',        icon: '💰' },
]

export const RECURRING_FREQUENCIES = [
  { id: 'weekly',  label: 'Weekly'  },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly',  label: 'Yearly'  },
]

export const DEBT_STATUSES = [
  { id: 'pending', label: 'Pending' },
  { id: 'partial', label: 'Partial' },
  { id: 'paid',    label: 'Paid'    },
  { id: 'overdue', label: 'Overdue' },
]
