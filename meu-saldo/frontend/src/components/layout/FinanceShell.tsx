import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Moon, Plus, Sun, WalletCards } from "lucide-react";

import { getCurrentUser, logout } from "../../api/endpoints";
import { useAuthToken } from "../../hooks/useAuthToken";
import { useTheme } from "../../hooks/useTheme";
import { ROUTES } from "../../lib/routes";
import type { User } from "../../types/api";

type FinanceShellProps = {
  children: ReactNode;
  subtitle?: string;
  title: string;
};

const navigationItems = [
  { label: "Inicio", to: ROUTES.dashboard },
  { label: "Contas financeiras", to: ROUTES.accounts },
  { label: "Categorias", to: ROUTES.categories },
  { label: "Movimentacoes", to: ROUTES.transactions },
  { label: "Limites de gastos", to: ROUTES.budgets },
  { label: "Assistente financeiro", to: ROUTES.aiAssistant },
];

export function FinanceShell({ children, subtitle, title }: FinanceShellProps) {
  const { clearToken } = useAuthToken();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isAdminArea = location.pathname === ROUTES.admin;
  const visibleNavigationItems = useMemo(
    () =>
      currentUser?.role === "admin"
        ? [...navigationItems, { label: "Area admin", to: ROUTES.admin }]
        : navigationItems,
    [currentUser],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCurrentUser() {
      try {
        const response = await getCurrentUser();

        if (isMounted) {
          setCurrentUser(response.data);
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null);
        }
      }
    }

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="min-h-screen bg-slate-50 transition-colors dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-5 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link className="flex items-center gap-3" to={ROUTES.dashboard}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white">
                <WalletCards size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-500 dark:text-slate-400">MeuSaldo</p>
                <h1 className="text-2xl font-semibold text-ink-900 dark:text-slate-50">{title}</h1>
              </div>
            </Link>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={toggleTheme}
                aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
              >
                {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
                {isDark ? "Claro" : "Escuro"}
              </button>
              {isAdminArea ? null : (
                <button
                  type="button"
                  className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700"
                  onClick={() => navigate(`${ROUTES.transactions}?type=expense`)}
                >
                  <Plus size={18} aria-hidden="true" />
                  Nova movimentacao
                </button>
              )}
              <button
                type="button"
                className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  clearToken();
                  navigate(ROUTES.login, { replace: true });
                  void logout().catch(() => undefined);
                }}
              >
                <LogOut size={18} aria-hidden="true" />
                Sair
              </button>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1">
            {visibleNavigationItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-600 dark:text-white"
                      : "text-ink-500 hover:bg-slate-50 hover:text-ink-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  }`
                }
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 py-6 lg:px-8">
        {subtitle ? <p className="mb-5 text-sm text-ink-500 dark:text-slate-400">{subtitle}</p> : null}
        {children}
      </main>
    </section>
  );
}
