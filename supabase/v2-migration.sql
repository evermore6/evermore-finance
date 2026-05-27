-- ═══════════════════════════════════════════════════════════════
-- EVERMORE v2 MIGRATION
-- Jalankan di Supabase SQL Editor SETELAH wallet-migration.sql
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tambah kolom baru ke transactions ─────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transaction_subtype TEXT
    DEFAULT 'regular'
    CHECK (transaction_subtype IN ('regular','transfer','topup','saving_contribution','opening_balance')),
  ADD COLUMN IF NOT EXISTS to_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transfer_id UUID,
  ADD COLUMN IF NOT EXISTS admin_fee NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saving_goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_subtype   ON transactions(transaction_subtype);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer  ON transactions(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_saving    ON transactions(saving_goal_id);

-- ── 2. Tambah tipe investasi ke wallets ───────────────────────
ALTER TABLE wallets
  DROP CONSTRAINT IF EXISTS wallets_type_check;

ALTER TABLE wallets
  ADD CONSTRAINT wallets_type_check
  CHECK (type IN ('cash','bank','ewallet','investment'));

-- ── 3. Tabel custom_categories ────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_categories (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT '📦',
  color      TEXT NOT NULL DEFAULT '#a3b18a',
  type       TEXT NOT NULL CHECK (type IN ('income','expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_categories_user ON custom_categories(user_id, type);

ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom categories"
  ON custom_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom categories"
  ON custom_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom categories"
  ON custom_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom categories"
  ON custom_categories FOR DELETE USING (auth.uid() = user_id);

-- ── 4. RPC: Atomic transfer antar wallet ─────────────────────
-- (sudah ada di wallet-migration.sql, ini versi update dengan admin fee)
CREATE OR REPLACE FUNCTION transfer_between_wallets(
  p_from_wallet_id UUID,
  p_to_wallet_id   UUID,
  p_amount         NUMERIC,
  p_admin_fee      NUMERIC DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Kurangi dari wallet asal (amount + admin_fee)
  UPDATE wallets
    SET balance = balance - p_amount - p_admin_fee
    WHERE id = p_from_wallet_id;
  -- Tambah ke wallet tujuan (hanya amount, bukan admin_fee)
  UPDATE wallets
    SET balance = balance + p_amount
    WHERE id = p_to_wallet_id;
END;
$$;
