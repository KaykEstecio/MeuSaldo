import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import {
  confirmTransactionImport,
  listAccounts,
  listCategories,
  listTransactionImports,
  previewTransactionImport,
} from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { categoryTypeLabels } from "../../lib/financeLabels";
import { formatCurrency, formatShortDate } from "../../lib/formatters";
import { ROUTES } from "../../lib/routes";
import type {
  Account,
  Category,
  TransactionImport,
  TransactionImportPreview,
  TransactionImportPreviewRow,
} from "../../types/api";

type ReviewRow = TransactionImportPreviewRow & {
  category_id: string;
  selected: boolean;
};

const MAX_FILE_BYTES = 2_000_000;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

function confidenceLabel(row: ReviewRow) {
  const confidence = Number(row.confidence);
  if (confidence >= 0.9) return "Alta confianca";
  if (confidence >= 0.6) return "Sugestao";
  return "Revisar categoria";
}

export function TransactionImportsPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [history, setHistory] = useState<TransactionImport[]>([]);
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<TransactionImportPreview | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const accountsById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const reviewRequired = rows.some((row) => !row.is_duplicate && row.selected && !row.category_id);
  const selectedCount = rows.filter((row) => !row.is_duplicate && row.selected).length;

  function handleError(caughtError: unknown, fallback: string) {
    if (caughtError instanceof ApiError && caughtError.status === 401) {
      clearToken();
      navigate(ROUTES.login, { replace: true });
      return;
    }
    setError(getErrorMessage(caughtError, fallback));
  }

  async function loadReferenceData() {
    setIsLoading(true);
    try {
      const [accountsResponse, categoriesResponse, historyResponse] = await Promise.all([
        listAccounts(),
        listCategories(),
        listTransactionImports(),
      ]);
      setAccounts(accountsResponse.data);
      setCategories(categoriesResponse.data);
      setHistory(historyResponse.data);
      setAccountId((current) => current || accountsResponse.data[0]?.id || "");
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos carregar os dados para importacao.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadReferenceData();
  }, []);

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!file || !accountId) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("O arquivo deve ter no maximo 2 MB.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await previewTransactionImport({
        account_id: accountId,
        filename: file.name,
        content: await file.text(),
      });
      setPreview(response.data);
      setRows(
        response.data.rows.map((row) => ({
          ...row,
          category_id: row.suggested_category_id ?? "",
          selected: true,
        })),
      );
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos analisar este arquivo.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleConfirm() {
    if (!preview || reviewRequired || selectedCount === 0) return;
    setError("");
    setMessage("");
    setIsConfirming(true);
    try {
      const response = await confirmTransactionImport({
        account_id: accountId,
        filename: preview.filename,
        file_format: preview.file_format,
        rows: rows.map((row) => ({
          transaction_date: row.transaction_date,
          description: row.description,
          amount: row.amount,
          type: row.type,
          category_id: row.category_id || null,
          selected: row.selected,
        })),
      });
      const result = response.data;
      setMessage(
        `${result.imported_count} movimentacao(oes) importada(s), ${result.duplicate_count} duplicada(s) ignorada(s) e ${result.skipped_count} removida(s) da selecao.`,
      );
      setPreview(null);
      setRows([]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadReferenceData();
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos confirmar a importacao.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <FinanceShell
      title="Importar extrato"
      subtitle="Envie um CSV ou OFX, revise as categorias e confirme somente depois de conferir a previa."
    >
      {error ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <FileUp size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Selecionar arquivo</h2>
              <p className="mt-1 text-sm leading-6 text-ink-500">Nada sera salvo antes da sua confirmacao.</p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handlePreview}>
            <label className="block text-sm font-medium text-ink-700" htmlFor="import-account">
              Conta de destino
              <select
                id="import-account"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                required
                value={accountId}
                onChange={(event) => {
                  setAccountId(event.target.value);
                  setPreview(null);
                }}
              >
                <option value="">Selecione uma conta</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="import-file">
              Arquivo CSV ou OFX
              <input
                id="import-file"
                ref={fileInputRef}
                className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:font-semibold file:text-brand-700"
                type="file"
                accept=".csv,.ofx,text/csv,application/x-ofx"
                required
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                }}
              />
            </label>

            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-ink-500">
              CSV: use colunas data, descricao e valor. Valores negativos viram despesas. Limite de 500 linhas e 2 MB.
            </p>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:bg-brand-400"
              disabled={isLoading || isAnalyzing || !file || !accountId}
            >
              {isAnalyzing ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
              Analisar arquivo
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-900">Previa e revisao</h2>
          <p className="mt-1 text-sm text-ink-500">Duplicidades sao ignoradas automaticamente. Revise sugestoes com baixa confianca.</p>

          {!preview ? (
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 px-5 py-10 text-center">
              <FileUp className="mx-auto text-ink-500" size={28} aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-ink-900">A previa aparecera aqui</h3>
              <p className="mt-1 text-sm text-ink-500">Escolha uma conta e analise um arquivo para continuar.</p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-ink-500">Linhas</p><p className="mt-1 text-xl font-semibold text-ink-900">{preview.total_rows}</p></div>
                <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Prontas</p><p className="mt-1 text-xl font-semibold text-emerald-700">{preview.ready_count}</p></div>
                <div className="rounded-lg bg-amber-50 p-3"><p className="text-xs text-amber-800">Duplicadas</p><p className="mt-1 text-xl font-semibold text-amber-800">{preview.duplicate_count}</p></div>
              </div>

              <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase text-ink-500">
                    <tr><th className="p-3">Importar</th><th className="p-3">Data</th><th className="p-3">Descricao</th><th className="p-3">Tipo</th><th className="p-3">Valor</th><th className="p-3">Categoria</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => {
                      const availableCategories = categories.filter((category) => category.type === row.type);
                      return (
                        <tr key={row.row_number} className={row.is_duplicate ? "opacity-60" : ""}>
                          <td className="p-3">
                            <input
                              aria-label={`Importar ${row.description}, linha ${row.row_number}`}
                              type="checkbox"
                              checked={row.selected}
                              disabled={row.is_duplicate}
                              onChange={(event) => setRows((current) => current.map((item) => item.row_number === row.row_number ? { ...item, selected: event.target.checked } : item))}
                            />
                          </td>
                          <td className="p-3 text-ink-700">{formatShortDate(row.transaction_date)}</td>
                          <td className="p-3"><p className="font-medium text-ink-900">{row.description}</p>{row.is_duplicate ? <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-800"><AlertTriangle size={13} />Duplicada</span> : null}</td>
                          <td className="p-3 text-ink-700">{categoryTypeLabels[row.type]}</td>
                          <td className="p-3 font-semibold text-ink-900">{formatCurrency(row.amount)}</td>
                          <td className="p-3">
                            <select
                              aria-label={`Categoria de ${row.description}, linha ${row.row_number}`}
                              className="h-9 min-w-52 rounded-lg border border-slate-300 bg-white px-2 text-sm"
                              value={row.category_id}
                              disabled={row.is_duplicate || !row.selected}
                              onChange={(event) => setRows((current) => current.map((item) => item.row_number === row.row_number ? { ...item, category_id: event.target.value } : item))}
                            >
                              <option value="">Selecione</option>
                              {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                            </select>
                            {!row.is_duplicate ? <p className={`mt-1 text-xs ${row.category_id ? "text-emerald-700" : "text-amber-800"}`}>{confidenceLabel(row)} · {row.suggestion_reason}</p> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-semibold text-ink-900">{selectedCount} movimentacao(oes) pronta(s)</p><p className="mt-1 text-sm text-ink-500">{reviewRequired ? "Escolha as categorias pendentes para continuar." : "Revise os dados e confirme a importacao."}</p></div>
                <button type="button" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white disabled:bg-brand-400" disabled={isConfirming || reviewRequired || selectedCount === 0} onClick={() => void handleConfirm()}>
                  {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Confirmar importacao
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-ink-900">Historico de importacoes</h2>
        <p className="mt-1 text-sm text-ink-500">Registro auditavel dos arquivos confirmados.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase text-ink-500"><tr><th className="py-3 pr-4">Arquivo</th><th className="py-3 pr-4">Conta</th><th className="py-3 pr-4">Data</th><th className="py-3 pr-4">Importadas</th><th className="py-3 pr-4">Duplicadas</th><th className="py-3">Ignoradas</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? <tr><td className="py-6 text-ink-500" colSpan={6}>Nenhuma importacao confirmada.</td></tr> : history.map((item) => (
                <tr key={item.id}><td className="py-3 pr-4 font-medium text-ink-900">{item.filename}</td><td className="py-3 pr-4 text-ink-700">{accountsById.get(item.account_id)?.name ?? "Conta removida"}</td><td className="py-3 pr-4 text-ink-700">{new Date(item.created_at).toLocaleString("pt-BR")}</td><td className="py-3 pr-4 text-emerald-700">{item.imported_count}</td><td className="py-3 pr-4 text-amber-800">{item.duplicate_count}</td><td className="py-3 text-ink-700">{item.skipped_count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </FinanceShell>
  );
}
