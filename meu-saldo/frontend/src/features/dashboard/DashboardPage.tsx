import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Loader2,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ApiError } from "../../api/client";
import { getCurrentUser, getDashboardSummary } from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { formatCurrency, formatMonthLabel, formatShortDate } from "../../lib/formatters";
import { ROUTES } from "../../lib/routes";
import type { DashboardSummary, User } from "../../types/api";

type Status = "idle" | "loading" | "error";

type SummaryCardProps = {
  label: string;
  value: string;
  icon: typeof WalletCards;
  tone: "balance" | "income" | "expense" | "neutral";
};

const cardToneClass = {
  balance: "bg-brand-50 text-brand-700",
  income: "bg-emerald-50 text-emerald-700",
  expense: "bg-rose-50 text-rose-700",
  neutral: "bg-slate-100 text-ink-700",
};

function getCurrentMonthInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonthInput(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

function isValidMonthInput(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

function SummaryCard({ label, value, icon: Icon, tone }: SummaryCardProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-ink-900">{value}</p>
        </div>
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${cardToneClass[tone]}`}>
          <Icon size={22} aria-hidden="true" />
        </span>
      </div>
    </section>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return <div className="flex h-72 items-center justify-center text-sm text-ink-500">{message}</div>;
}

export function DashboardPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthInputValue);
  const [periodInput, setPeriodInput] = useState(getCurrentMonthInputValue);
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const cashflowData = useMemo(
    () =>
      summary?.cashflow_by_day.map((point) => ({
        date: formatShortDate(point.date),
        income: Number(point.income),
        expense: Number(point.expense),
        net: Number(point.net),
      })) ?? [],
    [summary],
  );

  const categoryData = useMemo(
    () =>
      summary?.expense_by_category.map((category) => ({
        name: category.category_name,
        amount: Number(category.amount),
      })) ?? [],
    [summary],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setStatus("loading");
      setError("");

      if (!isValidMonthInput(selectedMonth)) {
        if (isMounted) {
          setSummary(null);
          setError("Informe um periodo valido.");
          setStatus("error");
        }
        return;
      }

      try {
        const { year, month } = parseMonthInput(selectedMonth);
        const [userResponse, summaryResponse] = await Promise.all([
          getCurrentUser(),
          getDashboardSummary({ year, month }),
        ]);

        if (isMounted) {
          setUser(userResponse.data);
          setSummary(summaryResponse.data);
          setStatus("idle");
        }
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        if (caughtError instanceof ApiError) {
          setSummary(null);
          setError(caughtError.message);
          if (caughtError.status === 401) {
            clearToken();
            navigate(ROUTES.login, { replace: true });
          }
        } else {
          setSummary(null);
          setError("Nao foi possivel carregar o dashboard.");
        }
        setStatus("error");
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [clearToken, navigate, refreshKey, selectedMonth]);

  function handlePeriodSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextPeriod = String(formData.get("period") ?? "");
    setPeriodInput(nextPeriod);

    if (!isValidMonthInput(nextPeriod)) {
      setSummary(null);
      setError("Informe um periodo valido.");
      setStatus("error");
      return;
    }

    setError("");
    setSelectedMonth(nextPeriod);
    setRefreshKey((current) => current + 1);
  }

  const periodLabel = summary ? formatMonthLabel(summary.period.year, summary.period.month) : "";

  return (
    <FinanceShell title="Dashboard financeiro">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">
              {user ? `Ola, ${user.name}` : "Carregando usuario"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">
              {periodLabel ? `Resumo de ${periodLabel}` : "Resumo do periodo"}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Dados agregados pelo backend com isolamento por usuario autenticado.
            </p>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row sm:items-center" noValidate onSubmit={handlePeriodSubmit}>
            <label className="text-sm font-medium text-ink-700" htmlFor="dashboard-period">
              Periodo
            </label>
            <div className="flex items-center gap-2">
              <input
                id="dashboard-period"
                name="period"
                type="month"
                min="2000-01"
                max="2100-12"
                required
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-ink-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                value={periodInput}
                onChange={(event) => setPeriodInput(event.target.value)}
              />
              <button
                type="submit"
                className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:bg-brand-500"
                disabled={status === "loading"}
                aria-label="Atualizar dashboard"
              >
                {status === "loading" ? (
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw size={18} aria-hidden="true" />
                )}
              </button>
            </div>
          </form>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Saldo total"
            value={formatCurrency(summary?.total_balance ?? 0)}
            icon={WalletCards}
            tone="balance"
          />
          <SummaryCard
            label="Receitas do mes"
            value={formatCurrency(summary?.monthly_income ?? 0)}
            icon={ArrowUpCircle}
            tone="income"
          />
          <SummaryCard
            label="Despesas do mes"
            value={formatCurrency(summary?.monthly_expense ?? 0)}
            icon={ArrowDownCircle}
            tone="expense"
          />
          <SummaryCard
            label="Resultado mensal"
            value={formatCurrency(summary?.monthly_net ?? 0)}
            icon={ReceiptText}
            tone="neutral"
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-ink-900">Fluxo de caixa diario</h3>
                <p className="mt-1 text-sm text-ink-500">Receitas, despesas e saldo liquido do periodo.</p>
              </div>
              <CalendarDays size={20} className="text-ink-500" aria-hidden="true" />
            </div>

            {cashflowData.length > 0 ? (
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 12 }} tickLine={false} />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                      width={92}
                    />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Receitas"
                      stroke="#059669"
                      fill="#d1fae5"
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Despesas"
                      stroke="#e11d48"
                      fill="#ffe4e6"
                    />
                    <Area type="monotone" dataKey="net" name="Liquido" stroke="#475569" fill="#e2e8f0" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState message="Nenhuma movimentacao encontrada para o periodo." />
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-ink-900">Despesas por categoria</h3>
              <p className="mt-1 text-sm text-ink-500">Total de despesas agrupadas pelo backend.</p>
            </div>

            {categoryData.length > 0 ? (
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 24, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: "#6b7280", fontSize: 12 }}
                      width={96}
                    />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="amount" name="Despesas" fill="#e11d48" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState message="Nenhuma despesa categorizada neste periodo." />
            )}
          </section>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-ink-900">Contas ativas</h3>
            <p className="mt-3 text-3xl font-semibold text-ink-900">{summary?.active_accounts ?? 0}</p>
            <p className="mt-2 text-sm text-ink-500">Contas ativas consideradas no saldo total.</p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-ink-900">Transacoes no periodo</h3>
            <p className="mt-3 text-3xl font-semibold text-ink-900">{summary?.transactions_count ?? 0}</p>
            <p className="mt-2 text-sm text-ink-500">Movimentacoes ativas consideradas no resumo mensal.</p>
          </section>
        </div>
    </FinanceShell>
  );
}
