-- ═══════════════════════════════════════════════════════════════
-- EVERMORE v3 MIGRATION
-- Jalankan di Supabase SQL Editor SETELAH v2-migration.sql
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabel budget_items (sub-budget checklist) ──────────────
CREATE TABLE IF NOT EXISTS budget_items (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  budget_id   UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  amount      NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_checked  BOOLEAN DEFAULT FALSE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_items_budget  ON budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_user    ON budget_items(user_id);

CREATE OR REPLACE TRIGGER set_budget_items_updated_at
  BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget items"
  ON budget_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget items"
  ON budget_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget items"
  ON budget_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget items"
  ON budget_items FOR DELETE USING (auth.uid() = user_id);

-- ── 2. Tambah notes ke budgets ────────────────────────────────
ALTER TABLE budgets
  ADD COLUMN IF NOT EXISTS notes TEXT;
