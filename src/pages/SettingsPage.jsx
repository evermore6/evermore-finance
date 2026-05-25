import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  User, Moon, Sun, Download, Upload, RefreshCw,
  LogOut, Trash2, Edit2, Shield, Bell
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useRecurringTemplates, useAllTransactions } from '@/hooks'
import { Button, Card, Modal, Toggle, Badge } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency, formatDate } from '@/utils'
import { exportToJSON, parseJSONImport } from '@/utils/exportUtils'
import { RECURRING_FREQUENCIES } from '@/constants/categories'
import { getCategoryById } from '@/constants/categories'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { user, signOut, updateProfile } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { templates, loading: templatesLoading, updateTemplate, deleteTemplate } = useRecurringTemplates()
  const { transactions } = useAllTransactions()
  const navigate = useNavigate()
  const fileRef = useRef()

  const [editName, setEditName]   = useState(false)
  const [newName, setNewName]     = useState(user?.user_metadata?.full_name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [showSignOut, setShowSignOut] = useState(false)
  const [showDeleteRecurring, setShowDeleteRecurring] = useState(null)
  const [editRecurring, setEditRecurring]   = useState(null)
  const [recurFreq, setRecurFreq] = useState('')

  const name    = user?.user_metadata?.full_name || user?.email?.split('@')[0]
  const initials = (name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const avatar  = user?.user_metadata?.avatar_url

  const handleUpdateName = async () => {
    setNameLoading(true)
    const { error } = await updateProfile({ full_name: newName })
    setNameLoading(false)
    if (!error) { toast.success('Name updated!'); setEditName(false) }
    else toast.error(error.message)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
    toast.success('Signed out')
  }

  const handleExportBackup = async () => {
    const { data: debts }   = await supabase.from('debts').select('*').eq('user_id', user.id)
    const { data: budgets } = await supabase.from('budgets').select('*').eq('user_id', user.id)
    const { data: goals }   = await supabase.from('savings_goals').select('*').eq('user_id', user.id)
    exportToJSON({ transactions, debts, budgets, goals }, `evermore-backup-${Date.now()}`)
    toast.success('Backup exported!')
  }

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await parseJSONImport(file)
      let imported = 0

      if (data.transactions?.length) {
        const rows = data.transactions.map(t => ({ ...t, id: undefined, user_id: user.id }))
        const { error } = await supabase.from('transactions').insert(rows)
        if (!error) imported += rows.length
      }
      if (data.debts?.length) {
        const rows = data.debts.map(d => ({ ...d, id: undefined, user_id: user.id }))
        await supabase.from('debts').insert(rows)
      }
      toast.success(`Imported ${imported} transactions!`)
    } catch (e) {
      toast.error('Invalid backup file')
    }
    e.target.value = ''
  }

  const handleEditRecurring = async () => {
    if (!editRecurring) return
    await updateTemplate(editRecurring.id, { frequency: recurFreq })
    setEditRecurring(null)
  }

  const Section = ({ title, children }) => (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">{title}</h3>
      <Card padding={false} className="overflow-hidden">
        {children}
      </Card>
    </div>
  )

  const Row = ({ icon: Icon, label, description, action, danger = false }) => (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-[var(--border)] last:border-0">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-50 dark:bg-red-900/20' : 'bg-sage-50 dark:bg-sage-900/20'}`}>
        <Icon size={15} className={danger ? 'text-red-500' : 'text-sage-600 dark:text-sage-300'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-[var(--text-primary)]'}`}>{label}</p>
        {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )

  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />

      {/* Profile */}
      <Section title="Profile">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[var(--border)]">
          {avatar ? (
            <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-sage flex items-center justify-center text-white font-bold">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {editName ? (
              <div className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 focus:outline-none focus:border-sage-400"
                  autoFocus
                />
                <Button size="sm" variant="primary" onClick={handleUpdateName} loading={nameLoading}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditName(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">{name}</p>
                <button onClick={() => setEditName(true)} className="text-warmgray-400 hover:text-sage-600 transition-colors"><Edit2 size={13} /></button>
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
          </div>
        </div>
        <Row icon={Shield} label="Account Security" description="Managed by Supabase Auth" action={<Badge variant="paid">Secured</Badge>} />
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        <Row
          icon={isDark ? Moon : Sun}
          label="Dark Mode"
          description={isDark ? 'Currently dark theme' : 'Currently light theme'}
          action={<Toggle checked={isDark} onChange={toggleTheme} />}
        />
      </Section>

      {/* Data */}
      <Section title="Data & Backup">
        <Row
          icon={Download}
          label="Export Backup"
          description="Download all your data as JSON"
          action={<Button size="sm" variant="secondary" onClick={handleExportBackup}>Export</Button>}
        />
        <Row
          icon={Upload}
          label="Import Backup"
          description="Restore from a previous backup"
          action={
            <>
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
              <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>Import</Button>
            </>
          }
        />
      </Section>

      {/* Recurring Templates */}
      <Section title={`Recurring Transactions (${templates.length})`}>
        {templates.length === 0 ? (
          <div className="px-5 py-6 text-center text-sm text-[var(--text-muted)]">No recurring transactions set up</div>
        ) : (
          templates.map(t => {
            const cat = getCategoryById(t.category)
            return (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--border)] last:border-0">
                <span className="text-base">{cat?.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {t.description || cat?.label}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatCurrency(t.amount)} · {t.frequency} · next {formatDate(t.next_due, 'short')}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditRecurring(t); setRecurFreq(t.frequency) }}
                    className="p-1.5 rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-400 hover:text-sage-600 transition-colors"
                  ><Edit2 size={13} /></button>
                  <button
                    onClick={() => setShowDeleteRecurring(t.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-warmgray-400 hover:text-red-500 transition-colors"
                  ><Trash2 size={13} /></button>
                </div>
              </div>
            )
          })
        )}
      </Section>

      {/* Danger Zone */}
      <Section title="Account">
        <Row
          icon={LogOut}
          label="Sign Out"
          description="Log out of your account"
          danger
          action={<Button size="sm" variant="danger" onClick={() => setShowSignOut(true)}>Sign Out</Button>}
        />
      </Section>

      {/* Sign Out Confirm */}
      <Modal open={showSignOut} onClose={() => setShowSignOut(false)} title="Sign Out" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowSignOut(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleSignOut}>Sign Out</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Are you sure you want to sign out?</p>
      </Modal>

      {/* Edit Recurring Modal */}
      <Modal open={!!editRecurring} onClose={() => setEditRecurring(null)} title="Edit Recurring" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditRecurring(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditRecurring}>Save</Button>
          </>
        }
      >
        {editRecurring && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Editing future occurrences of <strong>{editRecurring.description || editRecurring.category}</strong>
            </p>
            <div>
              <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">Frequency</label>
              <select
                value={recurFreq}
                onChange={e => setRecurFreq(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
              >
                {RECURRING_FREQUENCIES.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Recurring Confirm */}
      <Modal open={!!showDeleteRecurring} onClose={() => setShowDeleteRecurring(null)} title="Stop Recurring" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteRecurring(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => { await deleteTemplate(showDeleteRecurring); setShowDeleteRecurring(null) }}>Stop</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">Stop generating this recurring transaction? Past transactions will not be deleted.</p>
      </Modal>

      <p className="text-xs text-center text-[var(--text-muted)] pb-4">
        Evermore Finance Tracker v1.0.0 · Built with ♥ using Supabase + React
      </p>
    </div>
  )
}
