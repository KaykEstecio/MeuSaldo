import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, WalletCards } from "lucide-react";

import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";

type FinanceShellProps = {
  children: ReactNode;
  subtitle?: string;
  title: string;
};

const navigationItems = [
  { label: "Dashboard", to: ROUTES.dashboard },
  { label: "Contas", to: ROUTES.accounts },
  { label: "Categorias", to: ROUTES.categories },
  { label: "Transacoes", to: ROUTES.transactions },
];

export function FinanceShell({ children, subtitle, title }: FinanceShellProps) {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();

  return (
    <section className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-5 py-5 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link className="flex items-center gap-3" to={ROUTES.dashboard}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white">
                <WalletCards size={22} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-ink-500">MeuSaldo</p>
                <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
              </div>
            </Link>

            <button
              type="button"
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink-700 transition hover:bg-slate-50"
              onClick={() => {
                clearToken();
                navigate(ROUTES.login, { replace: true });
              }}
            >
              <LogOut size={18} aria-hidden="true" />
              Sair
            </button>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navigationItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-slate-50 hover:text-ink-900"
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
        {subtitle ? <p className="mb-5 text-sm text-ink-500">{subtitle}</p> : null}
        {children}
      </main>
    </section>
  );
}
