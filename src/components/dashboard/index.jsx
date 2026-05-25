import { motion } from 'framer-motion'
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, Badge, Skeleton } from '@/components/ui'
import { formatCompact, formatCurrency, getMonthsRange } from '@/utils'
import { getCategoryById } from '@/constants/categories'
import { formatDate } from '@/utils'

// ── Balance Summary Cards ─────────────────────────────────
export function BalanceSummary({ income = 0, expense = 0, loading }) {
  const balance = income - expense
  const savingRate = income > 0 ? ((balance / income) * 100).toFixed(0) : 0

  const stats = [
    {
      label: 'Balance',
      value: balance,
      icon: Wallet,
      color: balance >= 0 ? '#5a8a4a' : '#c0614a',
      bg: balance >= 0 ? 'bg-sage-50 dark:bg-sage-900/20' : 'bg-red-50 dark:bg-red-900/20',
      trend: null,
    },
    {
      label: 'Income',
      value: income,
      icon: TrendingUp,
      color: '#5a8a4a',
      bg: 'bg-sage-50 dark:bg-sage-900/20',
      Arrow: ArrowUpRight,
    },
    {
      label: 'Expense',
      value: expense,
      icon: TrendingDown,
      color: '#c0614a',
      bg: 'bg-peach-50 dark:bg-peach-900/20',
      Arrow: ArrowDownRight,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
        >
          <Card className="relative overflow-hidden">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-36" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-[var(--text-muted)]">{stat.label}</span>
                  <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon size={15} style={{ color: stat.color }} />
                  </div>
                </div>
                <p className="font-display text-2xl font-semibold text-[var(--text-primary)]">
                  {formatCompact(Math.abs(stat.value))}
                </p>
                {stat.label === 'Balance' && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Saving rate: <span className="font-medium" style={{ color: savingRate >= 20 ? '#5a8a4a' : '#c0614a' }}>{savingRate}%</span>
                  </p>
                )}
              </>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

// ── Monthly Trend Chart ───────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(246,241,233,0.95)',
  border: '1px solid rgba(163,177,138,0.3)',
  borderRadius: '12px',
  fontSize: '12px',
  color: '#2d3b2a',
}

export function MonthlyChart({ data = [] }) {
  return (
    <Card>
      <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">Income vs Expense</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#a3b18a" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#a3b18a" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ebc7b2" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#ebc7b2" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(163,177,138,0.15)" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v, name) => [formatCurrency(v), name]}
          />
          <Area type="monotone" dataKey="income"  stroke="#7d9464" strokeWidth={2} fill="url(#incomeGrad)"  name="Income"  />
          <Area type="monotone" dataKey="expense" stroke="#d48a68" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Category Pie Chart ────────────────────────────────────
export function CategoryChart({ data = [] }) {
  if (!data.length) return null
  return (
    <Card>
      <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">Expenses by Category</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(v) => [formatCurrency(v)]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v) => <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Recent Transactions ───────────────────────────────────
export function RecentTransactions({ transactions = [], loading }) {
  if (loading) {
    return (
      <Card>
        <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">Recent Transactions</h3>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="font-display font-semibold text-[var(--text-primary)] mb-4">Recent Transactions</h3>
      {!transactions.length ? (
        <p className="text-sm text-[var(--text-muted)] text-center py-6">No transactions this month</p>
      ) : (
        <div className="space-y-1">
          {transactions.slice(0, 8).map(t => {
            const cat = getCategoryById(t.category)
            return (
              <div key={t.id} className="flex items-center gap-3 py-2.5 px-1 rounded-xl hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: `${cat?.color}22` }}
                >
                  {cat?.icon || '📦'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {t.description || cat?.label || t.category}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">{formatDate(t.date, 'short')}</p>
                </div>
                <span className={`text-xs font-mono font-medium ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCompact(t.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ── AI Insights ───────────────────────────────────────────
const INSIGHT_STYLES = {
  positive: { bg: 'bg-sage-50 dark:bg-sage-900/20',   border: 'border-sage-200 dark:border-sage-800' },
  warning:  { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  danger:   { bg: 'bg-red-50 dark:bg-red-900/20',     border: 'border-red-200 dark:border-red-800'   },
  info:     { bg: 'bg-blue-50 dark:bg-blue-900/20',   border: 'border-blue-200 dark:border-blue-800' },
}

export function AIInsights({ insights = [] }) {
  if (!insights.length) return null
  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">✨</span>
        <h3 className="font-display font-semibold text-[var(--text-primary)]">Insights</h3>
        <Badge variant="info" className="text-[10px]">AI</Badge>
      </div>
      <div className="space-y-2.5">
        {insights.map((insight, i) => {
          const style = INSIGHT_STYLES[insight.type] || INSIGHT_STYLES.info
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-start gap-3 p-3 rounded-xl border ${style.bg} ${style.border}`}
            >
              <span className="text-base flex-shrink-0 mt-0.5">{insight.icon}</span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{insight.text}</p>
            </motion.div>
          )
        })}
      </div>
    </Card>
  )
}
