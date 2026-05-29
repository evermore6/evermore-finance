import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, ArrowLeftRight, RefreshCw, Wallet } from 'lucide-react'
import { useWallets, useAllTransactions } from '@/hooks'
import {
  WalletCard, WalletForm, TransferModal,
} from '@/components/wallets'
import { Modal, Button, Card, EmptyState, Skeleton, Badge } from '@/components/ui'
import { PageHeader } from '@/components/layout/Header'
import { formatCurrency, formatDate, formatCompact } from '@/utils'
import { getCategoryById } from '@/constants/categories'

export default function WalletsPage() {
  const { wallets, loading, totalBalance, addWallet, updateWallet, deleteWallet, transferFunds, refetch } = useWallets()
  const { transactions } = useAllTransactions()

  const [showAdd,      setShowAdd]      = useState(false)
  const [editItem,     setEditItem]     = useState(null)
  const [showTransfer, setShowTransfer] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [activeWallet, setActiveWallet] = useState(null) // filter txn per wallet
  const [saveLoading,  setSaveLoading]  = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)

  // Hitung jumlah transaksi per wallet
  const txnCountByWallet = useMemo(() => {
    const map = {}
    transactions.forEach(t => {
      if (t.wallet_id) map[t.wallet_id] = (map[t.wallet_id] || 0) + 1
    })
    return map
  }, [transactions])

  // Transaksi yang ditampilkan (filter by active wallet kalau ada)
  const displayedTxns = useMemo(() => {
    const list = activeWallet
      ? transactions.filter(t => t.wallet_id === activeWallet)
      : transactions
    return list.slice(0, 30)
  }, [transactions, activeWallet])

  // Statistik per wallet
  const walletStats = useMemo(() => {
    const map = {}
    wallets.forEach(w => {
      const txns = transactions.filter(t => t.wallet_id === w.id)
      map[w.id] = {
        income:  txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0),
        expense: txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0),
        count:   txns.length,
      }
    })
    return map
  }, [wallets, transactions])

  const handleAdd = async (data) => {
    setSaveLoading(true)
    const { error } = await addWallet(data)
    setSaveLoading(false)
    if (!error) setShowAdd(false)
  }

  const handleEdit = async (data) => {
    setSaveLoading(true)
    const { error } = await updateWallet(editItem.id, data)
    setSaveLoading(false)
    if (!error) setEditItem(null)
  }

  const handleTransfer = async (fromId, toId, amount, adminFee = 0) => {
    setTransferLoading(true)
    try {
      const { error } = await transferFunds(fromId, toId, amount, adminFee)
      if (!error) {
        setShowTransfer(false)
      }
    } finally {
      // finally memastikan loading SELALU di-reset, bahkan kalau error
      setTransferLoading(false)
    }
  }

  const handleDelete = async (id) => {
    await deleteWallet(id)
    setDeleteConfirm(null)
    if (activeWallet === id) setActiveWallet(null)
  }

  const activeWalletData = wallets.find(w => w.id === activeWallet)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallets"
        subtitle="Kelola saldo dan lihat riwayat per akun"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={ArrowLeftRight} onClick={() => setShowTransfer(true)}>
              Transfer
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
              Add Wallet
            </Button>
          </div>
        }
      />

      {/* ── Total Balance Banner ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 relative overflow-hidden"
      >
        {/* Decorative circle */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-sage-200/30 dark:bg-sage-800/20 blur-xl" />
        <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-peach-200/20 dark:bg-peach-800/10 blur-lg" />

        <p className="text-xs text-[var(--text-muted)] mb-1 relative z-10">Total Semua Wallet</p>
        <p className="font-display text-3xl font-semibold text-[var(--text-primary)] relative z-10">
          {formatCurrency(totalBalance)}
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1 relative z-10">
          dari {wallets.length} wallet aktif
        </p>
      </motion.div>

      {/* ── Wallet Cards ─────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : wallets.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="Belum ada wallet"
            description="Tambahkan wallet untuk mulai tracking saldo per akun."
            action={<Button variant="primary" icon={Plus} onClick={() => setShowAdd(true)}>Add Wallet</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {wallets.map(w => (
            <WalletCard
              key={w.id}
              wallet={w}
              txnCount={txnCountByWallet[w.id] || 0}
              onEdit={w => setEditItem(w)}
              onDelete={id => setDeleteConfirm(id)}
            />
          ))}
        </div>
      )}

      {/* ── Wallet Stats Row ─────────────────────────────── */}
      {wallets.length > 0 && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="font-display font-semibold text-[var(--text-primary)]">Ringkasan per Wallet</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Total income & expense dari semua waktu</p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {wallets.map(w => {
              const stats = walletStats[w.id] || { income: 0, expense: 0, count: 0 }
              return (
                <div key={w.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: `${w.color}22` }}
                  >
                    {w.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{w.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{stats.count} transaksi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs amount-income font-medium">+{formatCompact(stats.income)}</p>
                    <p className="text-xs amount-expense font-medium">-{formatCompact(stats.expense)}</p>
                  </div>
                  <div className="text-right ml-2 min-w-[80px]">
                    <p className={`text-sm font-display font-semibold ${w.balance < 0 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                      {formatCompact(w.balance)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">saldo</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Transaction History per Wallet ───────────────── */}
      {wallets.length > 0 && (
        <Card padding={false}>
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display font-semibold text-[var(--text-primary)]">
                  Riwayat Transaksi
                  {activeWalletData && (
                    <span className="ml-2 text-sage-600 dark:text-sage-300">{activeWalletData.icon} {activeWalletData.name}</span>
                  )}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{displayedTxns.length} transaksi ditampilkan</p>
              </div>
            </div>

            {/* Filter wallet tabs */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setActiveWallet(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${!activeWallet
                    ? 'bg-sage-400 text-white'
                    : 'bg-warmgray-100 dark:bg-warmgray-800 text-warmgray-500 hover:bg-warmgray-200 dark:hover:bg-warmgray-700'
                  }`}
              >
                Semua
              </button>
              {wallets.map(w => (
                <button
                  key={w.id}
                  onClick={() => setActiveWallet(activeWallet === w.id ? null : w.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1
                    ${activeWallet === w.id
                      ? 'text-white'
                      : 'bg-warmgray-100 dark:bg-warmgray-800 text-warmgray-500 hover:bg-warmgray-200 dark:hover:bg-warmgray-700'
                    }`}
                  style={activeWallet === w.id ? { background: w.color } : {}}
                >
                  {w.icon} {w.name}
                </button>
              ))}
            </div>
          </div>

          {/* Transaction rows */}
          {displayedTxns.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                {activeWallet ? 'Belum ada transaksi di wallet ini.' : 'Belum ada transaksi sama sekali.'}
              </p>
            </div>
          ) : (
            <div>
              {displayedTxns.map(t => {
                const cat    = getCategoryById(t.category)
                const wallet = wallets.find(w => w.id === t.wallet_id)
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] last:border-0 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: `${cat?.color}22` }}
                    >
                      {cat?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {t.description || cat?.label || t.category}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-[var(--text-muted)]">{formatDate(t.date, 'short')}</p>
                        {wallet && (
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                            style={{ background: `${wallet.color}22`, color: wallet.color }}
                          >
                            {wallet.icon} {wallet.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-mono font-semibold flex-shrink-0 ${t.type === 'income' ? 'amount-income' : 'amount-expense'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCompact(t.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* FAB mobile */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-gradient-sage shadow-soft-md flex items-center justify-center text-white z-40"
      >
        <Plus size={24} />
      </motion.button>

      {/* Add Wallet Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Wallet" size="md">
        <WalletForm onSubmit={handleAdd} loading={saveLoading} />
      </Modal>

      {/* Edit Wallet Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Wallet" size="md">
        {editItem && <WalletForm onSubmit={handleEdit} defaultValues={editItem} loading={saveLoading} />}
      </Modal>

      {/* Transfer Modal */}
      <TransferModal
        open={showTransfer}
        onClose={() => setShowTransfer(false)}
        wallets={wallets}
        onTransfer={handleTransfer}
        loading={transferLoading}
      />

      {/* Delete Confirm */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Hapus Wallet"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Batal</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Hapus</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Wallet akan disembunyikan. Transaksi lama tetap tersimpan dan tidak ikut terhapus.
        </p>
      </Modal>
    </div>
  )
}
