import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Edit3, Loader2, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import {
  createTransaction,
  deleteTransaction,
  listAccounts,
  listCategories,
  listTransactions,
  updateTransaction,
} from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { categoryTypeLabels, transactionTypeLabels } from "../../lib/financeLabels";
import { formatCurrency, formatShortDate } from "../../lib/formatters";
import { ROUTES } from "../../lib/routes";
import type { Account, Category, Transaction, TransactionType } from "../../types/api";

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

const initialForm = {
  account_id: "",
  amount: "",
  category_id: "",
  description: "",
  transaction_date: todayInputValue(),
  type: "expense" as TransactionType,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function TransactionsPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const descriptionInputRef = useRef<HTMLInputElement | null>(null);

  const accountsById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === form.type),
    [categories, form.type],
  );

  function handleError(caughtError: unknown, fallback: string) {
    if (caughtError instanceof ApiError && caughtError.status === 401) {
      clearToken();
      navigate(ROUTES.login, { replace: true });
      return;
    }

    setError(getErrorMessage(caughtError, fallback));
  }

  async function loadData() {
    setIsLoading(true);
    setError("");

    try {
      const [accountsResponse, categoriesResponse, transactionsResponse] = await Promise.all([
        listAccounts(),
        listCategories(),
        listTransactions(),
      ]);
      setAccounts(accountsResponse.data);
      setCategories(categoriesResponse.data);
      setTransactions(transactionsResponse.data);

      setForm((current) => ({
        ...current,
        account_id: current.account_id || accountsResponse.data[0]?.id || "",
        category_id:
          current.category_id ||
          categoriesResponse.data.find((category) => category.type === current.type)?.id ||
          "",
      }));
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos carregar suas movimentacoes. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setEditingTransaction(null);
    setForm({
      ...initialForm,
      account_id: accounts[0]?.id || "",
      category_id: categories.find((category) => category.type === initialForm.type)?.id || "",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, form);
        setMessage("Movimentacao atualizada com sucesso.");
      } else {
        await createTransaction(form);
        setMessage("Movimentacao registrada com sucesso.");
      }
      resetForm();
      await loadData();
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos salvar a movimentacao. Verifique conta, categoria, valor e data.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(transactionId: string) {
    setError("");
    setMessage("");

    try {
      await deleteTransaction(transactionId);
      setMessage("Movimentacao removida com sucesso.");
      await loadData();
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos remover a movimentacao. Tente novamente em instantes.");
    }
  }

  function updateType(type: TransactionType) {
    const nextCategory = categories.find((category) => category.type === type)?.id || "";
    setForm((current) => ({
      ...current,
      category_id: nextCategory,
      type,
    }));
  }

  function startNewTransaction(type: TransactionType) {
    setEditingTransaction(null);
    setForm({
      ...initialForm,
      account_id: accounts[0]?.id || "",
      category_id: categories.find((category) => category.type === type)?.id || "",
      type,
    });
    window.setTimeout(() => descriptionInputRef.current?.focus(), 0);
  }

  return (
    <FinanceShell
      title="Movimentacoes"
      subtitle="Registre entradas e saidas de dinheiro. Cada movimentacao atualiza o saldo da conta escolhida."
    >
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                {editingTransaction ? "Editar movimentacao" : "Nova movimentacao"}
              </h2>
              <p className="mt-1 text-sm text-ink-500">Escolha se e receita ou despesa, depois informe conta, categoria e valor.</p>
            </div>
            {editingTransaction ? (
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-lg border border-slate-300 text-ink-500 transition hover:bg-slate-50"
                onClick={resetForm}
                aria-label="Cancelar edicao"
              >
                <X size={18} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-ink-700" htmlFor="transaction-type">
              Tipo de movimentacao
              <select
                id="transaction-type"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                value={form.type}
                onChange={(event) => updateType(event.target.value as TransactionType)}
              >
                {Object.entries(transactionTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="transaction-account">
              Conta financeira
              <select
                id="transaction-account"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                required
                value={form.account_id}
                onChange={(event) => setForm((current) => ({ ...current, account_id: event.target.value }))}
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="transaction-category">
              Categoria da movimentacao
              <select
                id="transaction-category"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                required
                value={form.category_id}
                onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
              >
                <option value="">Selecione uma categoria</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="transaction-description">
              Descricao curta
              <input
                id="transaction-description"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                maxLength={255}
                minLength={1}
                placeholder="Ex.: Mercado, salario, aluguel"
                ref={descriptionInputRef}
                required
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink-700" htmlFor="transaction-amount">
                Valor
                <input
                  id="transaction-amount"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  min="0.01"
                  step="0.01"
                  type="number"
                  placeholder="Ex.: 89.90"
                  required
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </label>

              <label className="block text-sm font-medium text-ink-700" htmlFor="transaction-date">
                Data da movimentacao
                <input
                  id="transaction-date"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  type="date"
                  required
                  value={form.transaction_date}
                  onChange={(event) => setForm((current) => ({ ...current, transaction_date: event.target.value }))}
                />
              </label>
            </div>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-brand-500"
              disabled={isSubmitting || accounts.length === 0 || availableCategories.length === 0}
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Plus size={18} />}
              {editingTransaction ? "Salvar alteracoes" : "Registrar movimentacao"}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-900">Movimentacoes registradas</h2>
          <p className="mt-1 text-sm text-ink-500">{transactions.length} movimentacao(oes) no historico</p>

          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {message ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-ink-500">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Data</th>
                  <th className="py-3 pr-4 font-semibold">Descricao</th>
                  <th className="py-3 pr-4 font-semibold">Tipo</th>
                  <th className="py-3 pr-4 font-semibold">Conta</th>
                  <th className="py-3 pr-4 font-semibold">Categoria</th>
                  <th className="py-3 pr-4 font-semibold">Valor</th>
                  <th className="py-3 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="py-6 text-ink-500" colSpan={7}>
                      Carregando movimentacoes...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td className="py-8" colSpan={7}>
                      <div className="max-w-xl">
                        <h3 className="text-base font-semibold text-ink-900">Nenhuma movimentacao ainda</h3>
                        <p className="mt-2 text-sm leading-6 text-ink-500">
                          Movimentacoes sao suas receitas e despesas. Registre uma entrada ou saida para atualizar seus
                          saldos e montar seu resumo.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                            onClick={() => startNewTransaction("income")}
                          >
                            Registrar receita
                          </button>
                          <button
                            type="button"
                            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                            onClick={() => startNewTransaction("expense")}
                          >
                            Registrar despesa
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => {
                    const account = accountsById.get(transaction.account_id);
                    const category = transaction.category_id ? categoriesById.get(transaction.category_id) : null;

                    return (
                      <tr key={transaction.id}>
                        <td className="py-4 pr-4 text-ink-700">{formatShortDate(transaction.transaction_date)}</td>
                        <td className="py-4 pr-4 font-medium text-ink-900">{transaction.description}</td>
                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                              transaction.type === "income"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {categoryTypeLabels[transaction.type]}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-ink-700">{account?.name ?? "Conta removida"}</td>
                        <td className="py-4 pr-4 text-ink-700">{category?.name ?? "Categoria removida"}</td>
                        <td className="py-4 pr-4 font-semibold text-ink-900">{formatCurrency(transaction.amount)}</td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="flex size-9 items-center justify-center rounded-lg border border-slate-300 text-ink-500 transition hover:bg-slate-50"
                              onClick={() => {
                                setEditingTransaction(transaction);
                                setForm({
                                  account_id: transaction.account_id,
                                  amount: transaction.amount,
                                  category_id: transaction.category_id ?? "",
                                  description: transaction.description,
                                  transaction_date: transaction.transaction_date,
                                  type: transaction.type,
                                });
                              }}
                              aria-label={`Editar movimentacao ${transaction.description}`}
                            >
                              <Edit3 size={16} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                              onClick={() => void handleDelete(transaction.id)}
                              aria-label={`Remover movimentacao ${transaction.description}`}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </FinanceShell>
  );
}
