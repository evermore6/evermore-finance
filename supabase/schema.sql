-- ═══════════════════════════════════════════════════════════════
-- EVERMORE FINANCE TRACKER - SUPABASE SQL SCHEMA
-- Run this in Supabase SQL Editor (Settings > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. TRANSACTIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category        TEXT NOT NULL,
  amount          NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method  TEXT,
  description     TEXT,
  is_recurring    BOOLEAN DEFAULT FALSE,
  recurring_id    UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date   ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type   ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat    ON transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring   ON transactions(recurring_id);

-- ── 2. RECURRING TEMPLATES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_templates (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category        TEXT NOT NULL,
  amount          NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  payment_method  TEXT,
  description     TEXT,
  frequency       TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
  next_due        DATE NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user     ON recurring_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next_due ON recurring_templates(next_due) WHERE is_active = TRUE;

-- ── 3. DEBTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debts (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  debt_type   TEXT NOT NULL DEFAULT 'payable' CHECK (debt_type IN ('payable', 'receivable')),
  person_name TEXT NOT NULL,
  amount      NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  due_date    DATE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_user        ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user_type   ON debts(user_id, debt_type);
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);

-- ── 4. BUDGETS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  amount      NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL CHECK (month >= 0 AND month <= 11),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, category, year, month)
);

CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, year, month);

-- ── 5. SAVINGS GOALS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  icon           TEXT DEFAULT '🎯',
  target_amount  NUMERIC(15, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline       DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals(user_id);

-- ── AUTO-UPDATE updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_recurring_updated_at
  BEFORE UPDATE ON recurring_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_debts_updated_at
  BEFORE UPDATE ON debts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER set_savings_goals_updated_at
  BEFORE UPDATE ON savings_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals       ENABLE ROW LEVEL SECURITY;

-- ── TRANSACTIONS RLS ──────────────────────────────────────────
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ── RECURRING TEMPLATES RLS ───────────────────────────────────
CREATE POLICY "Users can view own recurring templates"
  ON recurring_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring templates"
  ON recurring_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring templates"
  ON recurring_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring templates"
  ON recurring_templates FOR DELETE
  USING (auth.uid() = user_id);

-- ── DEBTS RLS ─────────────────────────────────────────────────
CREATE POLICY "Users can view own debts"
  ON debts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts"
  ON debts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts"
  ON debts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts"
  ON debts FOR DELETE
  USING (auth.uid() = user_id);

-- ── BUDGETS RLS ───────────────────────────────────────────────
CREATE POLICY "Users can view own budgets"
  ON budgets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budgets"
  ON budgets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budgets"
  ON budgets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budgets"
  ON budgets FOR DELETE
  USING (auth.uid() = user_id);

-- ── SAVINGS GOALS RLS ─────────────────────────────────────────
CREATE POLICY "Users can view own savings goals"
  ON savings_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own savings goals"
  ON savings_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own savings goals"
  ON savings_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own savings goals"
  ON savings_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Monthly Summary (optional RPC)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_user_id UUID,
  p_from     DATE,
  p_to       DATE
)
RETURNS TABLE (
  total_income  NUMERIC,
  total_expense NUMERIC,
  net_balance   NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income,
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
    COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END), 0) AS net_balance
  FROM transactions
  WHERE user_id = p_user_id
    AND date BETWEEN p_from AND p_to;
END;
$$;
