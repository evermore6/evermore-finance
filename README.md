# 🌿 Evermore Finance Tracker

A modern, aesthetic personal finance tracker built with React + Supabase.
Track income, expenses, debts, budgets, and savings goals — all in real-time.

![Evermore Finance](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38BDF8?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 Auth | Email/password + Google OAuth via Supabase |
| 💸 Transactions | Add, edit, delete, search, filter by month/type/category |
| 💳 Debts | Track accounts payable & receivable with due dates |
| 🎯 Budgets | Monthly spending limits per category with progress bars |
| 🐷 Savings | Goal tracking with contributions and deadline support |
| 🔄 Recurring | Auto-generate transactions weekly/monthly/yearly |
| 📊 Dashboard | Charts, balance summary, AI-rule insights |
| 📤 Export | CSV, Excel (XLSX), PDF monthly reports |
| 💾 Backup | Full JSON export/import |
| 🌙 Dark Mode | System-aware + manual toggle |
| 📱 Mobile | Responsive first, bottom nav, FAB button |

---

## 🚀 Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/evermore-finance.git
cd evermore-finance
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Wait for the database to spin up
3. Go to **Settings → API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 3. Run the database schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Paste the entire contents of `supabase/schema.sql`
4. Click **Run**

### 4. Enable Google OAuth (optional)

1. Go to **Authentication → Providers → Google**
2. Toggle it on
3. Create OAuth credentials at [console.cloud.google.com](https://console.cloud.google.com):
   - Create a project → APIs & Services → Credentials → OAuth 2.0
   - Add `https://YOUR_PROJECT.supabase.co/auth/v1/callback` as an authorized redirect URI
4. Paste Client ID and Secret into Supabase

### 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Run locally

```bash
npm run dev
# → http://localhost:3000
```

---

## 📦 Deploy to Vercel

### Option A: Via Vercel CLI

```bash
npm install -g vercel
vercel

# When prompted:
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist

# Add environment variables:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Deploy to production:
vercel --prod
```

### Option B: Via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import your GitHub repo
4. Framework: **Vite** (auto-detected)
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy** 🚀

### After deploying — update Supabase Auth settings

1. Go to **Authentication → URL Configuration** in Supabase
2. Set **Site URL** to your Vercel URL: `https://your-app.vercel.app`
3. Add to **Redirect URLs**: `https://your-app.vercel.app/**`

---

## 🏗 Project Structure

```
evermore-finance/
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── ui/              # Button, Card, Modal, Input, etc.
│   │   ├── layout/          # Sidebar, Header, AppLayout, BottomNav
│   │   ├── auth/            # ProtectedRoute
│   │   ├── transactions/    # TransactionForm, TransactionList, TransactionItem
│   │   ├── dashboard/       # Charts, BalanceSummary, AIInsights
│   │   ├── debts/           # DebtForm, DebtCard
│   │   └── budgets-savings/ # BudgetForm, BudgetCard, SavingsForm, SavingsCard
│   ├── pages/
│   │   ├── auth/            # LoginPage, RegisterPage
│   │   ├── DashboardPage.jsx
│   │   ├── TransactionsPage.jsx
│   │   ├── DebtsPage.jsx
│   │   ├── BudgetsPage.jsx
│   │   ├── SavingsPage.jsx
│   │   └── SettingsPage.jsx
│   ├── hooks/               # useTransactions, useDebts, useBudgets, useSavings
│   ├── services/            # transactionService, debtService, etc.
│   ├── context/             # AuthContext, ThemeContext
│   ├── utils/               # Formatters, AI insights, export utils
│   ├── constants/           # Categories, payment methods
│   ├── lib/                 # Supabase client
│   ├── App.jsx              # Router setup
│   ├── main.jsx             # Entry point
│   └── index.css            # Global styles + CSS variables
├── supabase/
│   └── schema.sql           # Database schema + RLS policies
├── .env.example
├── vercel.json
└── README.md
```

---

## 🗄 Database Schema

```
transactions        — All income/expense records
recurring_templates — Recurring transaction definitions
debts               — Payables and receivables
budgets             — Monthly spending limits per category
savings_goals       — Savings goals with progress tracking
```

All tables use Row Level Security (RLS) — users can only access their own data.

---

## 🎨 Design System

| Token | Value |
|---|---|
| Sage Green | `#a3b18a` — primary brand color |
| Soft Cream | `#f6f1e9` — light background |
| Muted Peach | `#ebc7b2` — accent / expense color |
| Warm Gray | `#d6ccc2` — borders and muted text |
| Font Display | Playfair Display — headings |
| Font Body | Plus Jakarta Sans — body text |
| Font Mono | JetBrains Mono — amounts |

---

## 🛡 Security

- All data protected by **Supabase Row Level Security (RLS)**
- Users can only read/write their own data — enforced at database level
- Auth tokens managed securely by Supabase client
- No sensitive data in client-side code (only anon key)

---

## 📋 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v6 |
| Animation | Framer Motion |
| Charts | Recharts |
| Forms | React Hook Form |
| Icons | Lucide React |
| Toasts | React Hot Toast |
| Backend | Supabase (Auth + PostgreSQL + RLS) |
| Export | ExcelJS + jsPDF + jspdf-autotable |
| Dates | date-fns |
| Deploy | Vercel |

---

## 📄 License

MIT © Evermore Finance Tracker
