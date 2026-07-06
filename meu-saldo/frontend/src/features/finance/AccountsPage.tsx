import { FormEvent, useEffect, useRef, useState } from "react";
import { Edit3, Loader2, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { createAccount, deleteAccount, listAccounts, updateAccount } from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { accountTypeLabels } from "../../lib/financeLabels";
import { formatCurrency } from "../../lib/formatters";
import { ROUTES } from "../../lib/routes";
import type { Account, AccountType } from "../../types/api";

const initialForm = {
  name: "",
  type: "checking" as AccountType,
  initial_balance: "0.00",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function AccountsPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);

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
      const response = await listAccounts();
      setAccounts(response.data);
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos carregar suas contas. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingAccount(null);
  }

  function focusNewAccountForm() {
    resetForm();
    nameInputRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, {
          name: form.name,
          type: form.type,
        });
        setMessage("Conta atualizada com sucesso.");
      } else {
        await createAccount(form);
        setMessage("Conta criada com sucesso.");
      }
      resetForm();
      await loadData();
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos salvar a conta. Verifique os campos e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(accountId: string) {
    setError("");
    setMessage("");

    try {
      await deleteAccount(accountId);
      setMessage("Conta removida com sucesso.");
      await loadData();
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos remover a conta. Verifique se ela ainda possui movimentacoes vinculadas.");
    }
  }

  return (
    <FinanceShell
      title="Contas financeiras"
      subtitle="Cadastre onde seu dinheiro fica, como banco, carteira, poupanca ou cartao."
    >
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                {editingAccount ? "Editar conta" : "Nova conta"}
              </h2>
              <p className="mt-1 text-sm text-ink-500">Comece criando a conta que voce usa no dia a dia.</p>
            </div>
            {editingAccount ? (
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
            <label className="block text-sm font-medium text-ink-700" htmlFor="account-name">
              Nome
              <input
                id="account-name"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                minLength={2}
                maxLength={120}
                placeholder="Ex.: Nubank, Carteira, Poupanca"
                ref={nameInputRef}
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="account-type">
              Tipo de conta
              <select
                id="account-type"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AccountType }))}
              >
                {Object.entries(accountTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="account-initial-balance">
              Saldo inicial da conta
              <input
                id="account-initial-balance"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-ink-500"
                min="0"
                step="0.01"
                type="number"
                placeholder="Ex.: 250.00"
                required={!editingAccount}
                disabled={Boolean(editingAccount)}
                value={form.initial_balance}
                onChange={(event) =>
                  setForm((current) => ({ ...current, initial_balance: event.target.value }))
                }
              />
            </label>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-brand-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Plus size={18} />}
              {editingAccount ? "Salvar alteracoes" : "Criar conta financeira"}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Suas contas financeiras</h2>
              <p className="mt-1 text-sm text-ink-500">{accounts.length} conta(s) cadastrada(s)</p>
            </div>
          </div>

          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {message ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-ink-500">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Conta</th>
                  <th className="py-3 pr-4 font-semibold">Tipo</th>
                  <th className="py-3 pr-4 font-semibold">Saldo inicial</th>
                  <th className="py-3 pr-4 font-semibold">Saldo atual</th>
                  <th className="py-3 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="py-6 text-ink-500" colSpan={5}>
                      Carregando contas...
                    </td>
                  </tr>
                ) : accounts.length === 0 ? (
                  <tr>
                    <td className="py-8" colSpan={5}>
                      <div className="max-w-xl">
                        <h3 className="text-base font-semibold text-ink-900">Nenhuma conta financeira ainda</h3>
                        <p className="mt-2 text-sm leading-6 text-ink-500">
                          Contas financeiras sao os lugares onde seu dinheiro fica, como banco, carteira, cartao ou
                          dinheiro fisico.
                        </p>
                        <button
                          type="button"
                          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                          onClick={focusNewAccountForm}
                        >
                          Criar primeira conta
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id}>
                      <td className="py-4 pr-4 font-medium text-ink-900">{account.name}</td>
                      <td className="py-4 pr-4 text-ink-700">{accountTypeLabels[account.type]}</td>
                      <td className="py-4 pr-4 text-ink-700">{formatCurrency(account.initial_balance)}</td>
                      <td className="py-4 pr-4 font-semibold text-ink-900">{formatCurrency(account.current_balance)}</td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-300 text-ink-500 transition hover:bg-slate-50"
                            onClick={() => {
                              setEditingAccount(account);
                              setForm({
                                name: account.name,
                                type: account.type,
                                initial_balance: account.initial_balance,
                              });
                            }}
                            aria-label={`Editar conta ${account.name}`}
                          >
                            <Edit3 size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                            onClick={() => void handleDelete(account.id)}
                            aria-label={`Remover conta ${account.name}`}
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
