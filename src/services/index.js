import { supabase } from '@/lib/supabase'

// ── Debt Service ──────────────────────────────────────────
export const debtService = {
  async getAll(userId, debtType) {
    let q = supabase.from('debts').select('*').eq('user_id', userId)
    if (debtType) q = q.eq('debt_type', debtType)
    return q.order('due_date', { ascending: true })
  },
  async create(data) {
    return supabase.from('debts').insert(data).select().single()
  },
  async update(id, data) {
    return supabase.from('debts').update(data).eq('id', id).select().single()
  },
  async delete(id) {
    return supabase.from('debts').delete().eq('id', id)
  },
}

// ── Budget Service ────────────────────────────────────────
export const budgetService = {
  async getAll(userId, year, month) {
    return supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .order('category', { ascending: true })
  },
  async upsert(data) {
    return supabase
      .from('budgets')
      .upsert(data, { onConflict: 'user_id,category,year,month' })
      .select()
      .single()
  },
  async delete(id) {
    return supabase.from('budgets').delete().eq('id', id)
  },
}

// ── Savings Service ───────────────────────────────────────
export const savingsService = {
  async getAll(userId) {
    return supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  },
  async create(data) {
    return supabase.from('savings_goals').insert(data).select().single()
  },
  async update(id, data) {
    return supabase.from('savings_goals').update(data).eq('id', id).select().single()
  },
  async addContribution(id, amount) {
    // Increment current_amount
    const { data: goal } = await supabase
      .from('savings_goals')
      .select('current_amount')
      .eq('id', id)
      .single()
    const newAmount = (goal?.current_amount || 0) + amount
    return supabase
      .from('savings_goals')
      .update({ current_amount: newAmount })
      .eq('id', id)
      .select()
      .single()
  },
  async delete(id) {
    return supabase.from('savings_goals').delete().eq('id', id)
  },
}

// ── Budget Items Service ──────────────────────────────────
export const budgetItemService = {
  async getByBudget(budgetId) {
    return supabase
      .from('budget_items')
      .select('*')
      .eq('budget_id', budgetId)
      .order('sort_order', { ascending: true })
  },

  async getAllByUser(userId, year, month) {
    // Join dengan budgets untuk filter by period
    return supabase
      .from('budget_items')
      .select('*, budgets!inner(category, year, month)')
      .eq('user_id', userId)
      .eq('budgets.year', year)
      .eq('budgets.month', month)
  },

  async create(data) {
    return supabase.from('budget_items').insert(data).select().single()
  },

  async update(id, data) {
    return supabase.from('budget_items').update(data).eq('id', id).select().single()
  },

  async toggleCheck(id, currentState) {
    return supabase
      .from('budget_items')
      .update({ is_checked: !currentState })
      .eq('id', id)
      .select()
      .single()
  },

  async delete(id) {
    return supabase.from('budget_items').delete().eq('id', id)
  },

  async deleteByBudget(budgetId) {
    return supabase.from('budget_items').delete().eq('budget_id', budgetId)
  },
}
