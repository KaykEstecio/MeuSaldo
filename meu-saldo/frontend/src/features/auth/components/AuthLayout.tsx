import type { ReactNode } from "react";
import { BarChart3, ShieldCheck, WalletCards } from "lucide-react";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  description: string;
};

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <section className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_480px]">
      <div className="hidden flex-col justify-between bg-white px-12 py-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white">
            <WalletCards size={22} aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold text-ink-900">MeuSaldo</span>
        </div>

        <div className="max-w-xl">
          <h1 className="max-w-lg text-5xl font-semibold leading-tight text-ink-900">{title}</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-ink-500">{description}</p>
        </div>

        <div className="grid max-w-2xl grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3 text-sm font-medium text-ink-700">
              <BarChart3 size={18} className="text-brand-700" aria-hidden="true" />
              Resumo mensal
            </div>
            <p className="mt-4 text-3xl font-semibold text-ink-900">R$ 0,00</p>
            <p className="mt-2 text-sm text-ink-500">Dados aparecem apos o login.</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3 text-sm font-medium text-ink-700">
              <ShieldCheck size={18} className="text-brand-700" aria-hidden="true" />
              Conta protegida
            </div>
            <p className="mt-4 text-3xl font-semibold text-ink-900">JWT</p>
            <p className="mt-2 text-sm text-ink-500">Sessao autenticada pelo backend.</p>
          </div>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-600 text-white">
              <WalletCards size={22} aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold text-ink-900">MeuSaldo</span>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
