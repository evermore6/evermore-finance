-- ═══════════════════════════════════════════════════════════════
-- EVERMORE v4 MIGRATION
-- Jalankan di Supabase SQL Editor SETELAH v3-migration.sql
-- ═══════════════════════════════════════════════════════════════

-- ── Tambah paid_amount ke debts ───────────────────────────────
ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS paid_amount  NUMERIC(15, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_date    DATE,
  ADD COLUMN IF NOT EXISTS wallet_id    UUID REFERENCES wallets(id) ON DELETE SET NULL;

-- Update status otomatis berdasarkan paid_amount
CREATE OR REPLACE FUNCTION auto_update_debt_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount <= 0 THEN
    NEW.status := 'pending';
  ELSIF NEW.paid_amount >= NEW.amount THEN
    NEW.status := 'paid';
    NEW.paid_date := COALESCE(NEW.paid_date, CURRENT_DATE);
  ELSE
    NEW.status := 'partial';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_debt_status
  BEFORE INSERT OR UPDATE OF paid_amount ON debts
  FOR EACH ROW EXECUTE FUNCTION auto_update_debt_status();
