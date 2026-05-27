import { supabase } from '@/lib/supabase'

export const transactionService = {
  // ── Fetch ──────────────────────────────────────────────
  async getAll({ userId, from, to, type, category, search, limit = 100, offset = 0 } = {}) {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (from)     query = query.gte('date', from)
    if (to)       query = query.lte('date', to)
    if (type)     query = query.eq('type', type)
    if (category) query = query.eq('category', category)
    if (search)   query = query.ilike('description', `%${search}%`)

    return query
  },

  async getById(id) {
    return supabase.from('transactions').select('*').eq('id', id).single()
  },

  async getMonthly(userId, year, month) {
    const from = new Date(year, month, 1).toISOString().split('T')[0]
    const to   = new Date(year, month + 1, 0).toISOString().split('T')[0]
    return supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
  },

  async getSummary(userId, year, month) {
    const from = new Date(year, month, 1).toISOString().split('T')[0]
    const to   = new Date(year, month + 1, 0).toISOString().split('T')[0]
    return supabase.rpc('get_monthly_summary', { p_user_id: userId, p_from: from, p_to: to })
  },

  // ── Mutations ─────────────────────────────────────────
  async create(data) {
    return supabase.from('transactions').insert(data).select().single()
  },

  async createBatch(rows) {
    return supabase.from('transactions').insert(rows).select()
  },

  async update(id, data) {
    return supabase.from('transactions').update(data).eq('id', id).select().single()
  },

  async delete(id) {
    return supabase.from('transactions').delete().eq('id', id)
  },

  // ── Recurring ─────────────────────────────────────────
  async getRecurring(userId) {
    return supabase
      .from('recurring_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
  },

  async createRecurringTemplate(data) {
    return supabase.from('recurring_templates').insert(data).select().single()
  },

  async updateRecurringTemplate(id, data) {
    return supabase.from('recurring_templates').update(data).eq('id', id).select().single()
  },

  async deleteRecurringTemplate(id) {
    return supabase.from('recurring_templates').update({ is_active: false }).eq('id', id)
  },

  async processRecurring(userId) {
    const today = new Date().toISOString().split('T')[0]
    const { data: templates } = await supabase
      .from('recurring_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('next_due', today)

    if (!templates?.length) return { created: 0 }

    const newTransactions = templates.map(t => ({
      user_id:        t.user_id,
      type:           t.type,
      category:       t.category,
      amount:         t.amount,
      payment_method: t.payment_method,
      description:    t.description,
      date:           t.next_due,
      is_recurring:   true,
      recurring_id:   t.id,
    }))

    const { error } = await supabase.from('transactions').insert(newTransactions)
    if (error) return { error }

    // Update next_due for each template
    for (const t of templates) {
      const nextDue = computeNextDue(t.next_due, t.frequency)
      await supabase.from('recurring_templates').update({ next_due: nextDue }).eq('id', t.id)
    }

    return { created: newTransactions.length }
  },
}

function computeNextDue(from, frequency) {
  const d = new Date(from)
  if (frequency === 'weekly')  d.setDate(d.getDate() + 7)
  if (frequency === 'monthly') d.setMonth(d.getMonth() + 1)
  if (frequency === 'yearly')  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}
