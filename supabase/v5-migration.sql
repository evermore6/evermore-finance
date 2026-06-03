-- ═══════════════════════════════════════════════════════════════
-- EVERMORE v5 MIGRATION
-- Jalankan SETELAH v4-migration.sql
-- ═══════════════════════════════════════════════════════════════

-- Tambah debt_id ke transactions supaya bisa reverse paid_amount saat dihapus
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS debt_id UUID REFERENCES debts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_debt ON transactions(debt_id);
