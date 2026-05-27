import { supabase } from '@/lib/supabase'

// Default wallets yang dibuat otomatis untuk user baru
export const DEFAULT_WALLETS = [
  { name: 'Cash',       type: 'cash',    icon: '💵', color: '#7d9464', sort_order: 0 },
  { name: 'BNI',        type: 'bank',    icon: '🏦', color: '#e06a3a', sort_order: 1 },
  { name: 'BCA',        type: 'bank',    icon: '🏦', color: '#1a5fac', sort_order: 2 },
  { name: 'GoPay',      type: 'ewallet', icon: '🟢', color: '#00aa5b', sort_order: 3 },
  { name: 'ShopeePay',  type: 'ewallet', icon: '🛍️', color: '#ee4d2d', sort_order: 4 },
]

export const walletService = {
  // ── Fetch ──────────────────────────────────────────────
  async getAll(userId) {
    return supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
  },

  // ── Mutations ─────────────────────────────────────────
  async create(data) {
    return supabase.from('wallets').insert(data).select().single()
  },

  async createDefaults(userId) {
    const rows = DEFAULT_WALLETS.map(w => ({ ...w, user_id: userId, balance: 0 }))
    return supabase.from('wallets').insert(rows).select()
  },

  async update(id, data) {
    return supabase.from('wallets').update(data).eq('id', id).select().single()
  },

  async delete(id) {
    // Soft delete — jangan hapus supaya transaksi lama tetap terhubung
    return supabase.from('wallets').update({ is_active: false }).eq('id', id)
  },

  // ── Balance Operations ────────────────────────────────
  // Delta positif = tambah saldo, negatif = kurang saldo
  async adjustBalance(walletId, delta) {
    return supabase.rpc('update_wallet_balance', {
      p_wallet_id: walletId,
      p_delta:     delta,
    })
  },

  // Transfer antar wallet
  async transfer(fromWalletId, toWalletId, amount) {
    return supabase.rpc('transfer_between_wallets', {
      p_from_wallet_id: fromWalletId,
      p_to_wallet_id:   toWalletId,
      p_amount:         amount,
    })
  },

  // Recalculate saldo dari transaksi (untuk repair/sync)
  async recalculate(userId) {
    const { data: wallets } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!wallets?.length) return

    for (const w of wallets) {
      const { data: txns } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .eq('wallet_id', w.id)

      if (!txns) continue
      const balance = txns.reduce((sum, t) =>
        sum + (t.type === 'income' ? t.amount : -t.amount), 0
      )
      await supabase.from('wallets').update({ balance }).eq('id', w.id)
    }
  },
}
