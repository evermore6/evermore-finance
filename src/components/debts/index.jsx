import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { User, Wallet, Info } from 'lucide-react'
import { format } from 'date-fns'
import { Textarea, Select, Button } from '@/components/ui'
import { formatCurrency } from '@/utils'
import { DEBT_STATUSES } from '@/constants/categories'

const today = format(new Date(), 'yyyy-MM-dd')

// ── Debt Form ─────────────────────────────────────────────
export function DebtForm({ onSubmit, defaultValues, debtType = 'payable', loading, wallets = [] }) {
  const isEdit = !!defaultValues?.id

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      person_name: '',
      amount:      '',
      due_date:    '',
      status:      'pending',
      notes:       '',
      wallet_id:   '',
      admin_fee:   '0',
      debt_type:   debtType,
      ...defaultValues,
    },
  })

  const selectedWalletId = watch('wallet_id')
  const selectedWallet   = wallets.find(w => w.id === selectedWalletId)
  const amount           = parseFloat(watch('amount') || 0)

  // AP (Hutang): kamu dapat uang → wallet bertambah
  // AR (Piutang): kamu kasih uang → wallet berkurang
  const walletLabel = debtType === 'payable'
    ? 'Uang masuk ke wallet mana?'
    : 'Uang keluar dari wallet mana?'
  const walletHint = debtType === 'payable'
    ? 'Saldo wallet akan bertambah sejumlah hutang ini'
    : 'Saldo wallet akan berkurang sejumlah piutang ini'

  return (
    <form
      onSubmit={handleSubmit(d => onSubmit({
        ...d,
        amount:    parseFloat(d.amount),
        admin_fee: parseFloat(d.admin_fee || 0),
      }))}
      className="space-y-4"
    >
      {/* Person name */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
          {debtType === 'payable' ? 'Nama Pemberi Hutang' : 'Nama Peminjam'}
        </label>
        <div className="relative">
          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-warmgray-400" />
          <input
            placeholder="Nama orang / institusi"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white/60 dark:bg-warmgray-900/40
              text-[var(--text-primary)] placeholder:text-warmgray-400
              focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300
              ${errors.person_name ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
            {...register('person_name', { required: 'Nama wajib diisi' })}
          />
        </div>
        {errors.person_name && <p className="text-xs text-red-500 mt-1">{errors.person_name.message}</p>}
      </div>

      {/* Amount */}
      <div>
        <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
          Jumlah
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500 font-medium">Rp</span>
          <input
            type="number" min="0" placeholder="0"
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-lg font-mono
              bg-white/60 dark:bg-warmgray-900/40 text-[var(--text-primary)]
              focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-300
              ${errors.amount ? 'border-red-400' : 'border-warmgray-200 dark:border-warmgray-700'}`}
            {...register('amount', {
              required: 'Jumlah wajib diisi',
              min: { value: 1, message: 'Harus > 0' },
            })}
          />
        </div>
        {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
      </div>

      {/* Wallet picker — hanya saat ADD baru, bukan edit */}
      {!isEdit && wallets.length > 0 && (
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1">
            <span className="flex items-center gap-1.5">
              <Wallet size={14} />
              {walletLabel}
              <span className="text-[var(--text-muted)] font-normal text-xs">(opsional)</span>
            </span>
          </label>
          <p className="text-xs text-[var(--text-muted)] mb-2">{walletHint}</p>

          <div className="grid grid-cols-3 gap-2">
            {/* Opsi "Tidak ada / Catat manual" */}
            <button
              type="button"
              onClick={() => setValue('wallet_id', '')}
              className={`py-2 px-2 rounded-xl text-center text-xs transition-all border
                ${!selectedWalletId
                  ? 'border-warmgray-400 dark:border-warmgray-500 bg-warmgray-100 dark:bg-warmgray-800 text-warmgray-700 dark:text-warmgray-200 font-medium'
                  : 'border-warmgray-200 dark:border-warmgray-700 bg-warmgray-50/50 dark:bg-warmgray-900/30 text-warmgray-400 hover:border-warmgray-300'
                }`}
            >
              <div className="text-base mb-0.5">🚫</div>
              <div className="truncate">Skip</div>
              <div className="text-[10px] mt-0.5 opacity-60">Manual</div>
            </button>

            {wallets.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => setValue('wallet_id', w.id)}
                className={`py-2 px-2 rounded-xl text-center text-xs transition-all border
                  ${selectedWalletId === w.id
                    ? 'border-sage-300 dark:border-sage-700 bg-sage-50 dark:bg-sage-900/20 text-sage-700 dark:text-sage-300 font-medium ring-1 ring-sage-300'
                    : 'border-warmgray-200 dark:border-warmgray-700 bg-warmgray-50/50 dark:bg-warmgray-900/30 text-warmgray-500 hover:border-sage-200'
                  }`}
              >
                <div className="text-base mb-0.5">{w.icon}</div>
                <div className="truncate font-medium">{w.name}</div>
                <div className="text-[10px] mt-0.5 opacity-60 font-mono">{formatCurrency(w.balance)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Admin fee — hanya kalau wallet tipe bank & AR */}
      {!isEdit && selectedWallet?.type === 'bank' && debtType === 'receivable' && (
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
            Biaya Admin Transfer
            <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">(opsional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-warmgray-500">Rp</span>
            <input
              type="number" min="0" defaultValue="0"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm font-mono focus:outline-none focus:border-sage-400"
              {...register('admin_fee')}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Biaya admin otomatis tercatat sebagai expense "Admin Fee"
          </p>
        </div>
      )}

      {/* Preview */}
      {!isEdit && selectedWallet && amount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-xl border text-xs space-y-1
            ${debtType === 'payable'
              ? 'bg-sage-50 dark:bg-sage-900/15 border-sage-200 dark:border-sage-800'
              : 'bg-peach-50 dark:bg-peach-900/15 border-peach-200 dark:border-peach-800'
            }`}
        >
          <p className={`font-semibold ${debtType === 'payable' ? 'text-sage-700 dark:text-sage-300' : 'text-peach-700 dark:text-peach-300'}`}>
            Ringkasan
          </p>
          <p className="text-[var(--text-secondary)]">
            {debtType === 'payable' ? '💰 ' : '💸 '}
            Saldo <strong>{selectedWallet.icon} {selectedWallet.name}</strong> akan{' '}
            <strong>{debtType === 'payable' ? 'bertambah' : 'berkurang'}</strong>{' '}
            <strong>{formatCurrency(amount)}</strong>
          </p>
          <p className="text-[var(--text-muted)]">
            Transaksi otomatis tercatat di history
          </p>
        </motion.div>
      )}

      {/* Due Date + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-warmgray-600 dark:text-warmgray-300 block mb-1.5">
            Jatuh Tempo
          </label>
          <input
            type="date"
            className="w-full px-3.5 py-2.5 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm focus:outline-none focus:border-sage-400"
            {...register('due_date')}
          />
        </div>
        <Select
          label="Status"
          options={DEBT_STATUSES}
          {...register('status')}
        />
      </div>

      <Textarea
        label="Catatan"
        placeholder="Catatan opsional…"
        rows={2}
        {...register('notes')}
      />

      <Button type="submit" variant="primary" className="w-full" loading={loading}>
        {isEdit
          ? 'Update'
          : `Tambah ${debtType === 'payable' ? 'Hutang' : 'Piutang'}`}
      </Button>
    </form>
  )
}
