import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Users } from "lucide-react";

import { ApiError } from "../../api/client";
import { deactivateAdminUser, getAdminMetrics, getCurrentUser, listAdminUsers, updateAdminUser } from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { formatDateTime } from "../../lib/formatters";
import type { AdminMetrics, AdminUser } from "../../types/api";

type Status = "idle" | "loading" | "error";
type AdminAction = "block" | "activate" | "promote" | "demote";

type PendingAction = {
  action: AdminAction;
  user: AdminUser;
};

const actionLabels: Record<AdminAction, string> = {
  block: "Bloquear usuario",
  activate: "Desbloquear usuario",
  promote: "Tornar admin",
  demote: "Remover admin",
};

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
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      setStatus("loading");
      setError("");

      try {
        const [currentUserResponse, metricsResponse, usersResponse] = await Promise.all([
          getCurrentUser(),
          getAdminMetrics(),
          listAdminUsers(),
        ]);

        if (!isMounted) {
          return;
        }

        setCurrentAdminId(currentUserResponse.data.id);
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

  async function handleConfirmAction() {
    if (pendingAction === null) {
      return;
    }

    setIsActionSubmitting(true);
    setError("");

    try {
      const response =
        pendingAction.action === "block"
          ? await deactivateAdminUser(pendingAction.user.id)
          : await updateAdminUser(pendingAction.user.id, {
              is_active: pendingAction.action === "activate" ? true : undefined,
              role: pendingAction.action === "promote" ? "admin" : pendingAction.action === "demote" ? "user" : undefined,
            });

      setUsers((currentUsers) => currentUsers.map((user) => (user.id === response.data.id ? response.data : user)));
      setPendingAction(null);
    } catch (caughtError) {
      if (caughtError instanceof ApiError) {
        setError(caughtError.message);
      } else {
        setError("Nao foi possivel atualizar o usuario.");
      }
    } finally {
      setIsActionSubmitting(false);
    }
  }

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
                  <th className="px-5 py-3">Perfil</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Criado em</th>
                  <th className="px-5 py-3">Ultimo login</th>
                  <th className="px-5 py-3">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isCurrentAdmin = user.id === currentAdminId;

                  return (
                    <tr key={user.id} className="text-ink-700">
                      <td className="max-w-48 truncate px-5 py-4 font-mono text-xs text-ink-500">{user.id}</td>
                      <td className="px-5 py-4 font-medium text-ink-900">{user.name}</td>
                      <td className="px-5 py-4">{user.email}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-ink-700">
                          {user.role === "admin" ? "Admin" : "Usuario"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                            user.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {user.is_active ? "Ativo" : "Bloqueado"}
                        </span>
                      </td>
                      <td className="px-5 py-4">{formatDateTime(user.created_at)}</td>
                      <td className="px-5 py-4">
                        {user.last_login_at ? formatDateTime(user.last_login_at) : "Sem login registrado"}
                      </td>
                      <td className="px-5 py-4">
                        {isCurrentAdmin ? (
                          <span className="text-xs font-semibold text-ink-500">Sua conta</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-slate-50"
                              onClick={() => setPendingAction({ action: user.is_active ? "block" : "activate", user })}
                            >
                              {user.is_active ? "Bloquear" : "Desbloquear"}
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-ink-700 transition hover:bg-slate-50"
                              onClick={() => setPendingAction({ action: user.role === "admin" ? "demote" : "promote", user })}
                            >
                              {user.role === "admin" ? "Remover admin" : "Tornar admin"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {status !== "loading" && users.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-ink-500" colSpan={8}>
                      Nenhum usuario encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {pendingAction ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4">
            <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-ink-900">{actionLabels[pendingAction.action]}</h2>
              <p className="mt-3 text-sm leading-6 text-ink-500">
                Confirmar alteracao para {pendingAction.user.name} ({pendingAction.user.email})?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-ink-700 transition hover:bg-slate-50"
                  disabled={isActionSubmitting}
                  onClick={() => setPendingAction(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-brand-500"
                  disabled={isActionSubmitting}
                  onClick={handleConfirmAction}
                >
                  {isActionSubmitting ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : null}
                  Confirmar
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </FinanceShell>
  );
}
