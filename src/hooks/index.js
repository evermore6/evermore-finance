import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { transactionService } from "@/services/transactionService";
import { debtService, budgetService, savingsService } from "@/services/index";
import { walletService } from "@/services/walletService";
import toast from "react-hot-toast";

// ── useWallets ────────────────────────────────────────────
export function useWallets() {
  const { user } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await walletService.getAll(user.id);
    // Kalau user belum punya wallet sama sekali, buat default
    if (data && data.length === 0) {
      const { data: defaults } = await walletService.createDefaults(user.id);
      setWallets(defaults || []);
    } else {
      setWallets(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addWallet = async (data) => {
    const { data: w, error } = await walletService.create({
      ...data,
      user_id: user.id,
    });
    if (!error) {
      setWallets((p) => [...p, w]);
      toast.success("Wallet added!");
    } else toast.error(error.message);
    return { data: w, error };
  };

  const updateWallet = async (id, data) => {
    const { data: w, error } = await walletService.update(id, data);
    if (!error) {
      setWallets((p) => p.map((x) => (x.id === id ? w : x)));
      toast.success("Wallet updated!");
    } else toast.error(error.message);
    return { data: w, error };
  };

  const deleteWallet = async (id) => {
    const { error } = await walletService.delete(id);
    if (!error) {
      setWallets((p) => p.filter((x) => x.id !== id));
      toast.success("Wallet removed");
    } else toast.error(error.message);
  };

  const transferFunds = async (fromId, toId, amount) => {
    const { error } = await walletService.transfer(fromId, toId, amount);
    if (!error) {
      // Update local state
      setWallets((p) =>
        p.map((w) => {
          if (w.id === fromId) return { ...w, balance: w.balance - amount };
          if (w.id === toId) return { ...w, balance: w.balance + amount };
          return w;
        }),
      );
      toast.success(
        `Transferred ${amount.toLocaleString("id-ID")} successfully!`,
      );
    } else {
      toast.error(error.message);
    }
    return { error };
  };

  const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

  return {
    wallets,
    loading,
    totalBalance,
    addWallet,
    updateWallet,
    deleteWallet,
    transferFunds,
    refetch: fetch,
  };
}

// ── useTransactions ───────────────────────────────────────
export function useTransactions({ year, month, filters = {} } = {}) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await transactionService.getMonthly(
        user.id,
        y,
        m,
      );
      if (error) throw error;
      let result = data || [];
      if (filters.type) result = result.filter((t) => t.type === filters.type);
      if (filters.search)
        result = result.filter(
          (t) =>
            t.description
              ?.toLowerCase()
              .includes(filters.search.toLowerCase()) ||
            t.category?.toLowerCase().includes(filters.search.toLowerCase()),
        );
      setTransactions(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, y, m, filters.type, filters.search]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Process recurring on mount
  useEffect(() => {
    if (user) transactionService.processRecurring(user.id);
  }, [user]);

  const addTransaction = async (data, walletUpdater) => {
    try {
      const { frequency, ...txnFields } = data;
      const payload = { ...txnFields, user_id: user.id };

      if (data.is_recurring) {
        const { data: template } =
          await transactionService.createRecurringTemplate({
            user_id: user.id,
            type: data.type,
            category: data.category,
            amount: data.amount,
            payment_method: data.payment_method,
            description: data.description,
            frequency: frequency || "monthly",
            next_due: computeNextDue(data.date, frequency || "monthly"),
            is_active: true,
          });
        if (template) payload.recurring_id = template.id;
      }

      const { data: txn, error } = await transactionService.create(payload);
      if (error) throw error;

      // Otomatis update saldo wallet
      if (data.wallet_id) {
        const delta = data.type === "income" ? data.amount : -data.amount;
        await walletService.adjustBalance(data.wallet_id, delta);
        // Kasih tahu parent untuk update wallet state
        if (walletUpdater) walletUpdater(data.wallet_id, delta);
      }

      setTransactions((prev) => [txn, ...prev]);
      toast.success("Transaction added!");
      return { data: txn };
    } catch (e) {
      toast.error(e.message);
      return { error: e };
    }
  };

  const updateTransaction = async (id, data, oldData, walletUpdater) => {
    try {
      const { frequency, ...updateFields } = data;

      // Reverse saldo wallet lama dulu
      if (oldData?.wallet_id) {
        const oldDelta =
          oldData.type === "income" ? -oldData.amount : oldData.amount;
        await walletService.adjustBalance(oldData.wallet_id, oldDelta);
        if (walletUpdater) walletUpdater(oldData.wallet_id, oldDelta);
      }

      const { data: txn, error } = await transactionService.update(
        id,
        updateFields,
      );
      if (error) throw error;

      // Apply saldo wallet baru
      if (data.wallet_id) {
        const newDelta = data.type === "income" ? data.amount : -data.amount;
        await walletService.adjustBalance(data.wallet_id, newDelta);
        if (walletUpdater) walletUpdater(data.wallet_id, newDelta);
      }

      setTransactions((prev) => prev.map((t) => (t.id === id ? txn : t)));
      toast.success("Transaction updated!");
      return { data: txn };
    } catch (e) {
      toast.error(e.message);
      return { error: e };
    }
  };

  const deleteTransaction = async (id, walletUpdater) => {
    try {
      // Cari transaksi yang akan dihapus untuk reverse saldo
      const txn = transactions.find((t) => t.id === id);

      const { error } = await transactionService.delete(id);
      if (error) throw error;

      // Reverse saldo wallet
      if (txn?.wallet_id) {
        const delta = txn.type === "income" ? -txn.amount : txn.amount;
        await walletService.adjustBalance(txn.wallet_id, delta);
        if (walletUpdater) walletUpdater(txn.wallet_id, delta);
      }

      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Transaction deleted");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return {
    transactions,
    loading,
    error,
    income,
    expense,
    balance: income - expense,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}

// ── useAllTransactions ────────────────────────────────────
export function useAllTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      setLoading(true);
      const { data } = await transactionService.getAll({
        userId: user.id,
        limit: 500,
      });
      setTransactions(data || []);
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  return { transactions, loading };
}

// ── useDebts ──────────────────────────────────────────────
export function useDebts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await debtService.getAll(user.id);
    setDebts(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addDebt = async (data) => {
    const { data: d, error } = await debtService.create({
      ...data,
      user_id: user.id,
    });
    if (!error) {
      setDebts((p) => [d, ...p]);
      toast.success("Added!");
    } else toast.error(error.message);
    return { data: d, error };
  };

  const updateDebt = async (id, data) => {
    const { data: d, error } = await debtService.update(id, data);
    if (!error) {
      setDebts((p) => p.map((x) => (x.id === id ? d : x)));
      toast.success("Updated!");
    } else toast.error(error.message);
    return { data: d, error };
  };

  const deleteDebt = async (id) => {
    const { error } = await debtService.delete(id);
    if (!error) {
      setDebts((p) => p.filter((x) => x.id !== id));
      toast.success("Deleted");
    } else toast.error(error.message);
  };

  const payables = debts.filter((d) => d.debt_type === "payable");
  const receivables = debts.filter((d) => d.debt_type === "receivable");

  return {
    debts,
    payables,
    receivables,
    loading,
    addDebt,
    updateDebt,
    deleteDebt,
  };
}

// ── useBudgets ────────────────────────────────────────────
export function useBudgets(year, month) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await budgetService.getAll(user.id, y, m);
    setBudgets(data || []);
    setLoading(false);
  }, [user, y, m]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const upsertBudget = async (data) => {
    const { data: b, error } = await budgetService.upsert({
      ...data,
      user_id: user.id,
    });
    if (!error) {
      setBudgets((p) => {
        const idx = p.findIndex((x) => x.id === b.id);
        return idx >= 0 ? p.map((x) => (x.id === b.id ? b : x)) : [b, ...p];
      });
      toast.success("Budget saved!");
    } else toast.error(error.message);
    return { data: b, error };
  };

  const deleteBudget = async (id) => {
    const { error } = await budgetService.delete(id);
    if (!error) {
      setBudgets((p) => p.filter((x) => x.id !== id));
      toast.success("Budget deleted");
    } else toast.error(error.message);
  };

  return { budgets, loading, upsertBudget, deleteBudget };
}

// ── useSavingsGoals ───────────────────────────────────────
export function useSavingsGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await savingsService.getAll(user.id);
    setGoals(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addGoal = async (data) => {
    const { data: g, error } = await savingsService.create({
      ...data,
      user_id: user.id,
    });
    if (!error) {
      setGoals((p) => [g, ...p]);
      toast.success("Goal created!");
    } else toast.error(error.message);
    return { data: g, error };
  };

  const updateGoal = async (id, data) => {
    const { data: g, error } = await savingsService.update(id, data);
    if (!error) {
      setGoals((p) => p.map((x) => (x.id === id ? g : x)));
      toast.success("Updated!");
    } else toast.error(error.message);
    return { data: g, error };
  };

  const addContribution = async (id, amount) => {
    const { data: g, error } = await savingsService.addContribution(id, amount);
    if (!error) {
      setGoals((p) => p.map((x) => (x.id === id ? g : x)));
      toast.success(`+${amount.toLocaleString("id-ID")} added!`);
    } else toast.error(error.message);
    return { data: g, error };
  };

  const deleteGoal = async (id) => {
    const { error } = await savingsService.delete(id);
    if (!error) {
      setGoals((p) => p.filter((x) => x.id !== id));
      toast.success("Goal deleted");
    } else toast.error(error.message);
  };

  return { goals, loading, addGoal, updateGoal, addContribution, deleteGoal };
}

// ── useRecurringTemplates ─────────────────────────────────
export function useRecurringTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await transactionService.getRecurring(user.id);
      setTemplates(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const updateTemplate = async (id, data) => {
    const { data: t, error } = await transactionService.updateRecurringTemplate(
      id,
      data,
    );
    if (!error) {
      setTemplates((p) => p.map((x) => (x.id === id ? t : x)));
      toast.success("Updated!");
    } else toast.error(error.message);
  };

  const deleteTemplate = async (id) => {
    const { error } = await transactionService.deleteRecurringTemplate(id);
    if (!error) {
      setTemplates((p) => p.filter((x) => x.id !== id));
      toast.success("Recurring deleted");
    } else toast.error(error.message);
  };

  return { templates, loading, updateTemplate, deleteTemplate };
}

// ── helpers ───────────────────────────────────────────────
function computeNextDue(from, frequency) {
  const d = new Date(from);
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  if (frequency === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}
