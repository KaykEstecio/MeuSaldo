import { FormEvent, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Edit3, Loader2, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import {
  createBudget,
  deleteBudget,
  listBudgets,
  listCategories,
  updateBudget,
} from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { formatCurrency, formatMonthLabel, formatPercent } from "../../lib/formatters";
import { ROUTES } from "../../lib/routes";
import type { Budget, Category } from "../../types/api";

const currentDate = new Date();

const initialForm = {
  category_id: "",
  limit_amount: "",
  month: currentDate.getMonth() + 1,
  year: currentDate.getFullYear(),
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function progressWidth(usagePercent: string) {
  return `${Math.min(Number(usagePercent), 100)}%`;
}

export function BudgetsPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [filter, setFilter] = useState({
    month: initialForm.month,
    year: initialForm.year,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "expense"),
    [categories],
  );

  const totals = useMemo(
    () =>
      budgets.reduce(
        (accumulator, budget) => ({
          limit: accumulator.limit + Number(budget.limit_amount),
          remaining: accumulator.remaining + Number(budget.remaining_amount),
          spent: accumulator.spent + Number(budget.spent_amount),
        }),
        { limit: 0, remaining: 0, spent: 0 },
      ),
    [budgets],
  );

  function handleError(caughtError: unknown, fallback: string) {
    if (caughtError instanceof ApiError && caughtError.status === 401) {
      clearToken();
      navigate(ROUTES.login, { replace: true });
      return;
    }

    setError(getErrorMessage(caughtError, fallback));
  }

  async function loadData(period = filter) {
    setIsLoading(true);
    setError("");

    try {
      const [categoriesResponse, budgetsResponse] = await Promise.all([
        listCategories(),
        listBudgets(period),
      ]);
      const nextExpenseCategories = categoriesResponse.data.filter((category) => category.type === "expense");

      setCategories(categoriesResponse.data);
      setBudgets(budgetsResponse.data);
      setForm((current) => ({
        ...current,
        category_id: current.category_id || nextExpenseCategories[0]?.id || "",
      }));
    } catch (caughtError) {
      handleError(caughtError, "Nao foi possivel carregar os orcamentos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [filter.month, filter.year]);

  function resetForm(period = filter) {
    setEditingBudget(null);
    setForm({
      category_id: expenseCategories[0]?.id || "",
      limit_amount: "",
      month: period.month,
      year: period.year,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    const payload = {
      category_id: form.category_id,
      limit_amount: form.limit_amount,
      month: form.month,
      year: form.year,
    };

    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, payload);
        setMessage("Orcamento atualizado com sucesso.");
      } else {
        await createBudget(payload);
        setMessage("Orcamento criado com sucesso.");
      }
      const nextFilter = { month: form.month, year: form.year };
      setFilter(nextFilter);
      resetForm(nextFilter);
      await loadData(nextFilter);
    } catch (caughtError) {
      handleError(caughtError, "Nao foi possivel salvar o orcamento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(budget: Budget) {
    const confirmed = window.confirm(`Remover o orcamento de ${budget.category_name}?`);
    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await deleteBudget(budget.id);
      setMessage("Orcamento removido com sucesso.");
      await loadData();
    } catch (caughtError) {
      handleError(caughtError, "Nao foi possivel remover o orcamento.");
    }
  }

  function updateFilter(nextFilter: typeof filter) {
    setFilter(nextFilter);
    if (!editingBudget) {
      setForm((current) => ({
        ...current,
        month: nextFilter.month,
        year: nextFilter.year,
      }));
    }
  }

  return (
    <FinanceShell
      title="Orcamentos"
      subtitle="Defina limites mensais por categoria de despesa e acompanhe o consumo do periodo."
    >
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                {editingBudget ? "Editar orcamento" : "Novo orcamento"}
              </h2>
              <p className="mt-1 text-sm text-ink-500">Use categorias de despesa para criar limites mensais.</p>
            </div>
            {editingBudget ? (
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-lg border border-slate-300 text-ink-500 transition hover:bg-slate-50"
                onClick={() => resetForm()}
                aria-label="Cancelar edicao"
              >
                <X size={18} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-ink-700" htmlFor="budget-category">
              Categoria
              <select
                id="budget-category"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                required
                value={form.category_id}
                onChange={(event) => setForm((current) => ({ ...current, category_id: event.target.value }))}
              >
                <option value="">Selecione uma categoria</option>
                {expenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-ink-700" htmlFor="budget-month">
                Mes
                <select
                  id="budget-month"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  value={form.month}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, month: Number(event.target.value) }))
                  }
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(2026, month).replace(" de 2026", "")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-ink-700" htmlFor="budget-year">
                Ano
                <input
                  id="budget-year"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  max="2100"
                  min="2000"
                  required
                  type="number"
                  value={form.year}
                  onChange={(event) => setForm((current) => ({ ...current, year: Number(event.target.value) }))}
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-ink-700" htmlFor="budget-limit">
              Limite mensal
              <input
                id="budget-limit"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                min="0.01"
                required
                step="0.01"
                type="number"
                value={form.limit_amount}
                onChange={(event) => setForm((current) => ({ ...current, limit_amount: event.target.value }))}
              />
            </label>

            {expenseCategories.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Cadastre uma categoria de despesa antes de criar orcamentos.
              </div>
            ) : null}

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-brand-500"
              disabled={isSubmitting || expenseCategories.length === 0}
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Plus size={18} />}
              {editingBudget ? "Salvar orcamento" : "Criar orcamento"}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Orcamentos do periodo</h2>
              <p className="mt-1 text-sm text-ink-500">{formatMonthLabel(filter.year, filter.month)}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-ink-700" htmlFor="budget-filter-month">
                Mes
                <select
                  id="budget-filter-month"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  value={filter.month}
                  onChange={(event) => updateFilter({ ...filter, month: Number(event.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                    <option key={month} value={month}>
                      {formatMonthLabel(2026, month).replace(" de 2026", "")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-ink-700" htmlFor="budget-filter-year">
                Ano
                <input
                  id="budget-filter-year"
                  className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  max="2100"
                  min="2000"
                  type="number"
                  value={filter.year}
                  onChange={(event) => updateFilter({ ...filter, year: Number(event.target.value) })}
                />
              </label>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-ink-500">Limite planejado</p>
              <p className="mt-2 text-xl font-semibold text-ink-900">{formatCurrency(totals.limit)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-ink-500">Gasto realizado</p>
              <p className="mt-2 text-xl font-semibold text-rose-700">{formatCurrency(totals.spent)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-ink-500">Saldo do orcamento</p>
              <p className={`mt-2 text-xl font-semibold ${totals.remaining < 0 ? "text-rose-700" : "text-emerald-700"}`}>
                {formatCurrency(totals.remaining)}
              </p>
            </div>
          </div>

          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {message ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-ink-500">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Categoria</th>
                  <th className="py-3 pr-4 font-semibold">Limite</th>
                  <th className="py-3 pr-4 font-semibold">Gasto</th>
                  <th className="py-3 pr-4 font-semibold">Restante</th>
                  <th className="py-3 pr-4 font-semibold">Uso</th>
                  <th className="py-3 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="py-6 text-ink-500" colSpan={6}>
                      Carregando orcamentos...
                    </td>
                  </tr>
                ) : budgets.length === 0 ? (
                  <tr>
                    <td className="py-6 text-ink-500" colSpan={6}>
                      Nenhum orcamento cadastrado para este periodo.
                    </td>
                  </tr>
                ) : (
                  budgets.map((budget) => (
                    <tr key={budget.id}>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2 font-medium text-ink-900">
                          {budget.is_over_limit ? (
                            <AlertTriangle size={16} className="text-rose-600" aria-hidden="true" />
                          ) : null}
                          {budget.category_name}
                        </div>
                      </td>
                      <td className="py-4 pr-4 font-semibold text-ink-900">{formatCurrency(budget.limit_amount)}</td>
                      <td className="py-4 pr-4 text-rose-700">{formatCurrency(budget.spent_amount)}</td>
                      <td className={`py-4 pr-4 font-semibold ${budget.is_over_limit ? "text-rose-700" : "text-emerald-700"}`}>
                        {formatCurrency(budget.remaining_amount)}
                      </td>
                      <td className="py-4 pr-4">
                        <div className="min-w-[160px]">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-ink-700">{formatPercent(budget.usage_percent)}%</span>
                            <span className={budget.is_over_limit ? "text-rose-700" : "text-ink-500"}>
                              {budget.is_over_limit ? "Acima" : "Dentro"}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100">
                            <div
                              className={`h-2 rounded-full ${budget.is_over_limit ? "bg-rose-500" : "bg-brand-600"}`}
                              style={{ width: progressWidth(budget.usage_percent) }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-300 text-ink-500 transition hover:bg-slate-50"
                            onClick={() => {
                              setEditingBudget(budget);
                              setForm({
                                category_id: budget.category_id,
                                limit_amount: budget.limit_amount,
                                month: budget.month,
                                year: budget.year,
                              });
                            }}
                            aria-label={`Editar orcamento ${budget.category_name}`}
                          >
                            <Edit3 size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                            onClick={() => void handleDelete(budget)}
                            aria-label={`Remover orcamento ${budget.category_name}`}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </FinanceShell>
  );
}
