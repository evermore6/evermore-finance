-- ═══════════════════════════════════════════════════════════════
-- EVERMORE — WALLET MIGRATION
-- Jalankan di Supabase SQL Editor SETELAH schema.sql utama
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabel WALLETS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'bank'
             CHECK (type IN ('cash', 'bank', 'ewallet')),
  icon       TEXT NOT NULL DEFAULT '💳',
  color      TEXT NOT NULL DEFAULT '#a3b18a',
  balance    NUMERIC(15, 2) NOT NULL DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

CREATE OR REPLACE TRIGGER set_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 2. Tambah kolom wallet_id ke transactions ─────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_id);

-- ── 3. RLS untuk wallets ──────────────────────────────────────
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallets"
  ON wallets FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own wallets"
  ON wallets FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own wallets"
  ON wallets FOR DELETE USING (auth.uid() = user_id);

-- ── 4. RPC: update saldo wallet secara atomik ─────────────────
CREATE OR REPLACE FUNCTION update_wallet_balance(
  p_wallet_id UUID,
  p_delta     NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE wallets
  SET balance = balance + p_delta
  WHERE id = p_wallet_id;
END;
$$;

-- ── 5. RPC: transfer antar wallet ─────────────────────────────
CREATE OR REPLACE FUNCTION transfer_between_wallets(
  p_from_wallet_id UUID,
  p_to_wallet_id   UUID,
  p_amount         NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER AS $$
BEGIN
  UPDATE wallets SET balance = balance - p_amount WHERE id = p_from_wallet_id;
  UPDATE wallets SET balance = balance + p_amount WHERE id = p_to_wallet_id;
END;
$$;
