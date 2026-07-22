import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Loader2,
  ReceiptText,
  RefreshCw,
  Sparkles,
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
import { getCurrentUser, getDashboardSummary, listCategories, listTransactions } from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { useTheme } from "../../hooks/useTheme";
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

type ChecklistItemProps = {
  actionLabel: string;
  description: string;
  done: boolean;
  onAction: () => void;
  title: string;
};

function ChecklistItem({ actionLabel, description, done, onAction, title }: ChecklistItemProps) {
  return (
    <li className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span
          className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-ink-500"
          }`}
        >
          {done ? "OK" : ""}
        </span>
        <div>
          <h4 className="text-sm font-semibold text-ink-900">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-ink-500">{description}</p>
        </div>
      </div>

      <button
        type="button"
        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${
          done
            ? "border border-slate-200 bg-white text-ink-500 hover:bg-slate-50"
            : "bg-brand-600 text-white hover:bg-brand-700"
        }`}
        onClick={onAction}
      >
        {done ? "Ver" : actionLabel}
      </button>
    </li>
  );
}

export function DashboardPage() {
  const { clearToken } = useAuthToken();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [categoryCount, setCategoryCount] = useState(0);
  const [hasIncomeTransaction, setHasIncomeTransaction] = useState(false);
  const [hasExpenseTransaction, setHasExpenseTransaction] = useState(false);
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

  const chartColors = useMemo(
    () => ({
      axis: isDark ? "#cbd5e1" : "#6b7280",
      grid: isDark ? "#334155" : "#e2e8f0",
      netFill: isDark ? "rgba(148, 163, 184, 0.18)" : "#e2e8f0",
      netStroke: isDark ? "#94a3b8" : "#475569",
      incomeFill: isDark ? "rgba(5, 150, 105, 0.22)" : "#d1fae5",
      expenseFill: isDark ? "rgba(225, 29, 72, 0.2)" : "#ffe4e6",
      tooltipBackground: isDark ? "#0f172a" : "#ffffff",
      tooltipBorder: isDark ? "#334155" : "#e2e8f0",
      tooltipText: isDark ? "#f8fafc" : "#111827",
    }),
    [isDark],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setStatus("loading");
      setError("");

      if (!isValidMonthInput(selectedMonth)) {
        if (isMounted) {
          setSummary(null);
          setError("Escolha um periodo valido para ver seu resumo.");
          setStatus("error");
        }
        return;
      }

      try {
        const { year, month } = parseMonthInput(selectedMonth);
        const [userResponse, summaryResponse, categoriesResponse, transactionsResponse] = await Promise.all([
          getCurrentUser(),
          getDashboardSummary({ year, month }),
          listCategories(),
          listTransactions(),
        ]);

        if (isMounted) {
          setUser(userResponse.data);
          setSummary(summaryResponse.data);
          setCategoryCount(categoriesResponse.data.length);
          setHasIncomeTransaction(transactionsResponse.data.some((transaction) => transaction.type === "income"));
          setHasExpenseTransaction(transactionsResponse.data.some((transaction) => transaction.type === "expense"));
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
          setError("Nao conseguimos carregar seu resumo. Atualize a pagina ou tente novamente em instantes.");
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
      setError("Escolha um periodo valido para ver seu resumo.");
      setStatus("error");
      return;
    }

    setError("");
    setSelectedMonth(nextPeriod);
    setRefreshKey((current) => current + 1);
  }

  const periodLabel = summary ? formatMonthLabel(summary.period.year, summary.period.month) : "";
  const hasAccount = (summary?.active_accounts ?? 0) > 0;
  const hasCategory = categoryCount > 0;
  const isFirstUseComplete = hasAccount && hasCategory && hasIncomeTransaction && hasExpenseTransaction;
  const isDashboardEmpty =
    Boolean(summary) && summary?.active_accounts === 0 && categoryCount === 0 && summary?.transactions_count === 0;

  return (
    <FinanceShell title="Inicio">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">
              {user ? `Ola, ${user.name}` : "Carregando usuario"}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-ink-900">
              {periodLabel ? `Resumo de ${periodLabel}` : "Seu resumo financeiro"}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Acompanhe saldos, entradas, saidas e principais gastos do mes.
            </p>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row sm:items-center" noValidate onSubmit={handlePeriodSubmit}>
            <label className="text-sm font-medium text-ink-700" htmlFor="dashboard-period">
              Mes do resumo
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
                aria-label="Atualizar resumo"
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

        <section className="mt-6 overflow-hidden rounded-lg border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-5 shadow-sm dark:from-slate-900 dark:to-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Sparkles size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-ink-900">Pergunte ao MeuSaldo</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-600">
                  Receba uma leitura explicada dos seus numeros e confira os dados usados em cada resposta.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                onClick={() => navigate(`${ROUTES.aiAssistant}?prompt=${encodeURIComponent("Resuma minha semana.")}`)}
              >
                Resumir minha semana
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                onClick={() =>
                  navigate(
                    `${ROUTES.aiAssistant}?prompt=${encodeURIComponent("Resuma meu mes e destaque o maior gasto.")}`,
                  )
                }
              >
                Analisar este mes
              </button>
            </div>
          </div>
        </section>

        {isDashboardEmpty ? (
          <section className="mt-6 rounded-lg border border-brand-100 bg-brand-50 p-5">
            <h3 className="text-lg font-semibold text-ink-900">Seu painel ainda esta vazio</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
              Comece criando uma conta financeira. Depois registre uma receita ou despesa para o MeuSaldo montar seu
              resumo automaticamente.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                onClick={() => navigate(ROUTES.accounts)}
              >
                Criar conta financeira
              </button>
              <button
                type="button"
                className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                onClick={() => navigate(`${ROUTES.transactions}?type=expense`)}
              >
                Registrar movimentacao
              </button>
              <button
                type="button"
                className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
                onClick={() => navigate(ROUTES.categories)}
              >
                Ver categorias
              </button>
            </div>
          </section>
        ) : null}

        {!isFirstUseComplete && status !== "loading" ? (
          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-lg font-semibold text-ink-900">Comece por aqui</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">
                Complete estes passos para configurar seu MeuSaldo e liberar um resumo financeiro mais util.
              </p>
            </div>

            <ol className="mt-5 space-y-3">
              <ChecklistItem
                title="Criar primeira conta financeira"
                description="Informe onde seu dinheiro fica, como banco, carteira ou dinheiro fisico."
                done={hasAccount}
                actionLabel="Criar conta"
                onAction={() => navigate(ROUTES.accounts)}
              />
              <ChecklistItem
                title="Criar ou revisar categorias"
                description="Use categorias para separar gastos e receitas, como Alimentacao, Casa ou Salario."
                done={hasCategory}
                actionLabel="Ver categorias"
                onAction={() => navigate(ROUTES.categories)}
              />
              <ChecklistItem
                title="Registrar primeira receita"
                description="Cadastre uma entrada de dinheiro para acompanhar o que voce recebeu."
                done={hasIncomeTransaction}
                actionLabel="Registrar receita"
                onAction={() => navigate(`${ROUTES.transactions}?type=income`)}
              />
              <ChecklistItem
                title="Registrar primeira despesa"
                description="Cadastre uma saida de dinheiro para entender seus gastos."
                done={hasExpenseTransaction}
                actionLabel="Registrar despesa"
                onAction={() => navigate(`${ROUTES.transactions}?type=expense`)}
              />
              <ChecklistItem
                title="Conferir o dashboard"
                description="Depois dos primeiros registros, volte aqui para acompanhar seu resumo do mes."
                done={isFirstUseComplete}
                actionLabel="Atualizar resumo"
                onAction={() => setRefreshKey((current) => current + 1)}
              />
            </ol>
          </section>
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
                <h3 className="text-base font-semibold text-ink-900">Entradas e saidas por dia</h3>
                <p className="mt-1 text-sm text-ink-500">Veja como seu dinheiro entrou e saiu durante o mes.</p>
              </div>
              <CalendarDays size={20} className="text-ink-500" aria-hidden="true" />
            </div>

            {cashflowData.length > 0 ? (
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cashflowData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="date" tick={{ fill: chartColors.axis, fontSize: 12 }} tickLine={false} />
                    <YAxis
                      tick={{ fill: chartColors.axis, fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                      width={92}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBackground,
                        borderColor: chartColors.tooltipBorder,
                        color: chartColors.tooltipText,
                      }}
                      itemStyle={{ color: chartColors.tooltipText }}
                      labelStyle={{ color: chartColors.tooltipText }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Receitas"
                      stroke="#059669"
                      fill={chartColors.incomeFill}
                    />
                    <Area
                      type="monotone"
                      dataKey="expense"
                      name="Despesas"
                      stroke="#e11d48"
                      fill={chartColors.expenseFill}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      name="Liquido"
                      stroke={chartColors.netStroke}
                      fill={chartColors.netFill}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState message="Ainda nao ha movimentacoes neste mes. Registre uma receita ou despesa para ver o grafico." />
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h3 className="text-base font-semibold text-ink-900">Onde voce mais gastou</h3>
              <p className="mt-1 text-sm text-ink-500">Compare seus gastos por categoria no mes escolhido.</p>
            </div>

            {categoryData.length > 0 ? (
              <div className="mt-5 h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 24, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis
                      type="number"
                      tick={{ fill: chartColors.axis, fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fill: chartColors.axis, fontSize: 12 }}
                      width={96}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: chartColors.tooltipBackground,
                        borderColor: chartColors.tooltipBorder,
                        color: chartColors.tooltipText,
                      }}
                      itemStyle={{ color: chartColors.tooltipText }}
                      labelStyle={{ color: chartColors.tooltipText }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Bar dataKey="amount" name="Despesas" fill="#e11d48" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState message="Ainda nao ha despesas com categoria neste mes. Cadastre uma despesa para acompanhar seus gastos." />
            )}
          </section>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-ink-900">Contas ativas</h3>
            <p className="mt-3 text-3xl font-semibold text-ink-900">{summary?.active_accounts ?? 0}</p>
            <p className="mt-2 text-sm text-ink-500">Contas que entram no calculo do seu saldo.</p>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-ink-900">Movimentacoes no mes</h3>
            <p className="mt-3 text-3xl font-semibold text-ink-900">{summary?.transactions_count ?? 0}</p>
            <p className="mt-2 text-sm text-ink-500">Receitas e despesas registradas no periodo.</p>
          </section>
        </div>
    </FinanceShell>
  );
}
