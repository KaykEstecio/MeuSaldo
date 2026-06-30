import { Activity, Database, LineChart, ShieldCheck } from "lucide-react";

const setupItems = [
  {
    title: "Saldo",
    description: "R$ 0,00",
    icon: Activity,
  },
  {
    title: "Seguranca",
    description: "Sessao protegida",
    icon: ShieldCheck,
  },
  {
    title: "Dados",
    description: "API configurada",
    icon: Database,
  },
  {
    title: "Graficos",
    description: "Pronto para metricas",
    icon: LineChart,
  },
];

export function SetupStatusPage() {
  return (
    <section className="flex flex-1 flex-col justify-center gap-10 py-8">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-brand-700">MeuSaldo</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal text-ink-900 sm:text-5xl">
          Seu dinheiro organizado em um so lugar
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ink-500">
          Acompanhe contas, categorias, transacoes e orcamentos com uma experiencia simples e segura.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {setupItems.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-ink-900">{item.title}</h2>
                  <p className="mt-1 text-sm leading-6 text-ink-500">{item.description}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
