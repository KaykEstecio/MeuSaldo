import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Users } from "lucide-react";

import { ApiError } from "../../api/client";
import { getAdminMetrics, listAdminUsers } from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { formatDateTime } from "../../lib/formatters";
import type { AdminMetrics, AdminUser } from "../../types/api";

type Status = "idle" | "loading" | "error";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-ink-900">{value}</p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Users size={22} aria-hidden="true" />
        </span>
      </div>
    </section>
  );
}

export function AdminPage() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      setStatus("loading");
      setError("");

      try {
        const [metricsResponse, usersResponse] = await Promise.all([getAdminMetrics(), listAdminUsers()]);

        if (!isMounted) {
          return;
        }

        setMetrics(metricsResponse.data);
        setUsers(usersResponse.data);
        setStatus("idle");
      } catch (caughtError) {
        if (!isMounted) {
          return;
        }

        if (caughtError instanceof ApiError) {
          setError(caughtError.status === 403 ? "Acesso administrativo restrito." : caughtError.message);
        } else {
          setError("Nao foi possivel carregar o painel administrativo.");
        }
        setStatus("error");
      }
    }

    void loadAdminData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <FinanceShell
      title="Administracao"
      subtitle="Visao operacional com usuarios cadastrados e metricas gerais do MeuSaldo."
    >
      <div className="space-y-6">
        <div className="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 p-4 text-brand-800">
          <ShieldCheck size={20} aria-hidden="true" />
          <p className="text-sm font-medium">Acesso exclusivo para administradores.</p>
        </div>

        {status === "error" ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard label="Usuarios cadastrados" value={metrics?.total_users ?? 0} />
          <MetricCard label="Novos registros no mes" value={metrics?.new_users_this_month ?? 0} />
        </div>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Usuarios</h2>
              <p className="mt-1 text-sm text-ink-500">Dados minimos de cadastro e auditoria de login.</p>
            </div>
            {status === "loading" ? <Loader2 className="animate-spin text-brand-700" size={20} aria-hidden="true" /> : null}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-ink-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Nome</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Criado em</th>
                  <th className="px-5 py-3">Ultimo login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="text-ink-700">
                    <td className="max-w-48 truncate px-5 py-4 font-mono text-xs text-ink-500">{user.id}</td>
                    <td className="px-5 py-4 font-medium text-ink-900">{user.name}</td>
                    <td className="px-5 py-4">{user.email}</td>
                    <td className="px-5 py-4">{formatDateTime(user.created_at)}</td>
                    <td className="px-5 py-4">
                      {user.last_login_at ? formatDateTime(user.last_login_at) : "Sem login registrado"}
                    </td>
                  </tr>
                ))}

                {status !== "loading" && users.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-ink-500" colSpan={5}>
                      Nenhum usuario encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </FinanceShell>
  );
}
