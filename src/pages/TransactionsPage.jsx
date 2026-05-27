import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTransactions, useWallets } from "@/hooks";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Modal, Button, Card } from "@/components/ui";
import { PageHeader } from "@/components/layout/Header";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/constants/categories";
import { formatCurrency } from "@/utils";
import { exportToCSV, exportToExcel, exportToPDF } from "@/utils/exportUtils";
import toast from "react-hot-toast";

export default function TransactionsPage() {
  const now = new Date();
  const [viewDate, setViewDate] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setType] = useState("");
  const [catFilter, setCat] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const {
    transactions,
    income,
    expense,
    loading,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  } = useTransactions({ ...viewDate, filters: { type: typeFilter, search } });

  const { wallets, refetch: refetchWallets } = useWallets();

  const walletUpdater = () => refetchWallets();

  // Filter kategori client-side
  const displayed = useMemo(() => {
    if (!catFilter) return transactions;
    return transactions.filter((t) => t.category === catFilter);
  }, [transactions, catFilter]);

  const handleAdd = async (data) => {
    setAddLoading(true);
    const { error } = await addTransaction(data, walletUpdater);
    setAddLoading(false);
    if (!error) setShowAdd(false);
  };

  const handleEdit = async (data) => {
    setAddLoading(true);
    const { error } = await updateTransaction(
      editItem.id,
      data,
      editItem,
      walletUpdater,
    );
    setAddLoading(false);
    if (!error) setEditItem(null);
  };

  const handleDelete = async (id) => {
    await deleteTransaction(id, walletUpdater);
    setDeleteConfirm(null);
  };

  const navigateMonth = (dir) => {
    setViewDate((prev) => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m > 11) {
        m = 0;
        y++;
      }
      if (m < 0) {
        m = 11;
        y--;
      }
      return { year: y, month: m };
    });
  };

  const monthLabel = new Date(
    viewDate.year,
    viewDate.month,
    1,
  ).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const catOptions =
    typeFilter === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleExport = async (format) => {
    if (!displayed.length) {
      toast.error("No transactions to export");
      return;
    }
    setShowExport(false);
    if (format === "csv") {
      exportToCSV(displayed, `evermore-${viewDate.year}-${viewDate.month + 1}`);
      toast.success("Exported CSV!");
    }
    if (format === "excel") {
      await exportToExcel(
        displayed,
        `evermore-${viewDate.year}-${viewDate.month + 1}`,
      );
      toast.success("Exported Excel!");
    }
    if (format === "pdf") {
      await exportToPDF(
        displayed,
        monthLabel,
        `evermore-report-${viewDate.year}-${viewDate.month + 1}`,
      );
      toast.success("Exported PDF!");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        subtitle={`${displayed.length} transaksi bulan ini`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                variant="secondary"
                size="sm"
                icon={Download}
                onClick={() => setShowExport((v) => !v)}
              >
                Export
              </Button>
              {showExport && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 top-10 z-30 glass-card rounded-xl p-2 w-36 shadow-glass-md"
                >
                  {["csv", "excel", "pdf"].map((f) => (
                    <button
                      key={f}
                      onClick={() => handleExport(f)}
                      className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-sage-50 dark:hover:bg-sage-900/20 text-[var(--text-primary)] uppercase font-medium tracking-wide transition-colors"
                    >
                      {f}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAdd(true)}
            >
              Add
            </Button>
          </div>
        }
      />

      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-2 rounded-xl hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-500 hover:text-sage-600 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-display font-semibold text-[var(--text-primary)]">
            {monthLabel}
          </p>
          <div className="flex items-center gap-3 justify-center mt-1">
            <span className="text-xs amount-income font-medium">
              +{formatCurrency(income)}
            </span>
            <span className="text-xs text-[var(--text-muted)]">·</span>
            <span className="text-xs amount-expense font-medium">
              -{formatCurrency(expense)}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigateMonth(1)}
          disabled={
            viewDate.year === now.getFullYear() &&
            viewDate.month === now.getMonth()
          }
          className="p-2 rounded-xl hover:bg-sage-50 dark:hover:bg-sage-900/20 text-warmgray-500 hover:text-sage-600 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-warmgray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions…"
            className="w-full pl-8 pr-8 py-2 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-sm text-[var(--text-primary)] placeholder:text-warmgray-400 focus:outline-none focus:border-sage-400 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warmgray-400 hover:text-warmgray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="flex items-center rounded-xl border border-warmgray-200 dark:border-warmgray-700 overflow-hidden bg-white/60 dark:bg-warmgray-900/40">
          {["", "income", "expense"].map((t) => (
            <button
              key={t}
              onClick={() => {
                setType(t);
                setCat("");
              }}
              className={`px-3 py-2 text-xs font-medium transition-all capitalize
                ${typeFilter === t ? "bg-sage-400 text-white" : "text-warmgray-500 hover:text-warmgray-700 dark:hover:text-warmgray-300"}`}
            >
              {t || "All"}
            </button>
          ))}
        </div>

        <select
          value={catFilter}
          onChange={(e) => setCat(e.target.value)}
          className="px-3 py-2 rounded-xl border border-warmgray-200 dark:border-warmgray-700 bg-white/60 dark:bg-warmgray-900/40 text-xs text-[var(--text-primary)] focus:outline-none focus:border-sage-400"
        >
          <option value="">All categories</option>
          {catOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <Card padding={false} className="overflow-hidden">
        <div className="p-2">
          <TransactionList
            transactions={displayed}
            loading={loading}
            onEdit={(t) => setEditItem(t)}
            onDelete={(id) => setDeleteConfirm(id)}
          />
        </div>
      </Card>

      {/* FAB mobile */}
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setShowAdd(true)}
        className="md:hidden fixed bottom-20 right-4 w-14 h-14 rounded-2xl bg-gradient-sage shadow-soft-md flex items-center justify-center text-white z-40"
      >
        <Plus size={24} />
      </motion.button>

      {/* Add Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Transaction"
        size="md"
      >
        <TransactionForm
          onSubmit={handleAdd}
          loading={addLoading}
          wallets={wallets}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Transaction"
        size="md"
      >
        {editItem && (
          <TransactionForm
            onSubmit={handleEdit}
            defaultValues={editItem}
            loading={addLoading}
            wallets={wallets}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Transaction"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Menghapus transaksi juga akan membalikkan saldo wallet terkait.
        </p>
      </Modal>
    </div>
  );
}
