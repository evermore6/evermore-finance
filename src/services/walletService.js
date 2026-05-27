import { supabase } from '@/lib/supabase'

export const DEFAULT_WALLETS = [
  { name: 'Cash',      type: 'cash',       icon: '💵', color: '#7d9464', sort_order: 0 },
  { name: 'BNI',       type: 'bank',       icon: '🏦', color: '#e06a3a', sort_order: 1 },
  { name: 'BCA',       type: 'bank',       icon: '🏦', color: '#1a5fac', sort_order: 2 },
  { name: 'GoPay',     type: 'ewallet',    icon: '🟢', color: '#00aa5b', sort_order: 3 },
  { name: 'ShopeePay', type: 'ewallet',    icon: '🛍️', color: '#ee4d2d', sort_order: 4 },
]

export const walletService = {
  async getAll(userId) {
    return supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
  },

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
    return supabase.from('wallets').update({ is_active: false }).eq('id', id)
  },

  async adjustBalance(walletId, delta) {
    return supabase.rpc('update_wallet_balance', {
      p_wallet_id: walletId,
      p_delta:     delta,
    })
  },

  // Transfer atomik dengan admin fee support
  async transfer(fromWalletId, toWalletId, amount, adminFee = 0) {
    return supabase.rpc('transfer_between_wallets', {
      p_from_wallet_id: fromWalletId,
      p_to_wallet_id:   toWalletId,
      p_amount:         amount,
      p_admin_fee:      adminFee,
    })
  },
}

// ── Custom Categories Service ─────────────────────────────
export const customCategoryService = {
  async getAll(userId) {
    return supabase
      .from('custom_categories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
  },

  async create(data) {
    return supabase.from('custom_categories').insert(data).select().single()
  },

  async delete(id) {
    return supabase.from('custom_categories').delete().eq('id', id)
  },
}
