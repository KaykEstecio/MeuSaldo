import { FormEvent, useEffect, useRef, useState } from "react";
import { Edit3, Loader2, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { categoryTypeLabels } from "../../lib/financeLabels";
import { ROUTES } from "../../lib/routes";
import type { Category, CategoryType } from "../../types/api";

const initialForm = {
  color: "#10b981",
  icon: "",
  name: "",
  type: "expense" as CategoryType,
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function CategoriesPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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
      const response = await listCategories();
      setCategories(response.data);
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos carregar suas categorias. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setForm(initialForm);
    setEditingCategory(null);
  }

  function focusNewCategoryForm() {
    resetForm();
    nameInputRef.current?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setMessage("");

    const payload = {
      color: form.color || null,
      icon: form.icon || null,
      name: form.name,
      type: form.type,
    };

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        setMessage("Categoria atualizada com sucesso.");
      } else {
        await createCategory(payload);
        setMessage("Categoria criada com sucesso.");
      }
      resetForm();
      await loadData();
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos salvar a categoria. Verifique os campos e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(categoryId: string) {
    setError("");
    setMessage("");

    try {
      await deleteCategory(categoryId);
      setMessage("Categoria removida com sucesso.");
      await loadData();
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos remover a categoria. Verifique se ela esta sendo usada em movimentacoes.");
    }
  }

  return (
    <FinanceShell
      title="Categorias"
      subtitle="Crie grupos para entender melhor de onde vem e para onde vai seu dinheiro."
    >
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">
                {editingCategory ? "Editar categoria" : "Nova categoria"}
              </h2>
              <p className="mt-1 text-sm text-ink-500">Exemplos: Salario, Alimentacao, Casa, Transporte.</p>
            </div>
            {editingCategory ? (
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
            <label className="block text-sm font-medium text-ink-700" htmlFor="category-name">
              Nome
              <input
                id="category-name"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                minLength={2}
                maxLength={120}
                placeholder="Ex.: Alimentacao"
                ref={nameInputRef}
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="category-type">
              Tipo da categoria
              <select
                id="category-type"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CategoryType }))}
              >
                {Object.entries(categoryTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="category-color">
              Cor de identificacao
              <input
                id="category-color"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                type="color"
                value={form.color}
                onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
              />
            </label>

            <label className="block text-sm font-medium text-ink-700" htmlFor="category-icon">
              Identificador visual
              <input
                id="category-icon"
                className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                maxLength={60}
                placeholder="Opcional. Ex.: casa, mercado, salario"
                value={form.icon}
                onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
              />
            </label>

            <button
              type="submit"
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-brand-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Plus size={18} />}
              {editingCategory ? "Salvar alteracoes" : "Criar categoria"}
            </button>
          </form>
        </section>

        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink-900">Suas categorias</h2>
          <p className="mt-1 text-sm text-ink-500">{categories.length} categoria(s) cadastrada(s)</p>

          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {message ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-ink-500">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Categoria</th>
                  <th className="py-3 pr-4 font-semibold">Tipo</th>
                  <th className="py-3 pr-4 font-semibold">Cor</th>
                  <th className="py-3 pr-4 font-semibold">Padrao</th>
                  <th className="py-3 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td className="py-6 text-ink-500" colSpan={5}>
                      Carregando categorias...
                    </td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td className="py-8" colSpan={5}>
                      <div className="max-w-xl">
                        <h3 className="text-base font-semibold text-ink-900">Nenhuma categoria ainda</h3>
                        <p className="mt-2 text-sm leading-6 text-ink-500">
                          Categorias ajudam a entender para onde seu dinheiro esta indo. Use nomes simples, como
                          Alimentacao, Casa, Transporte ou Salario.
                        </p>
                        <button
                          type="button"
                          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
                          onClick={focusNewCategoryForm}
                        >
                          Criar categoria
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id}>
                      <td className="py-4 pr-4">
                        <div className="font-medium text-ink-900">{category.name}</div>
                        {category.icon ? <div className="mt-1 text-xs text-ink-500">{category.icon}</div> : null}
                      </td>
                      <td className="py-4 pr-4 text-ink-700">{categoryTypeLabels[category.type]}</td>
                      <td className="py-4 pr-4">
                        <span className="flex items-center gap-2 text-ink-700">
                          <span
                            className="size-4 rounded-full border border-slate-200"
                            style={{ backgroundColor: category.color ?? "#e2e8f0" }}
                          />
                          {category.color ?? "Sem cor"}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-ink-700">{category.is_default ? "Sim" : "Nao"}</td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-lg border border-slate-300 text-ink-500 transition hover:bg-slate-50"
                            onClick={() => {
                              setEditingCategory(category);
                              setForm({
                                color: category.color ?? "#10b981",
                                icon: category.icon ?? "",
                                name: category.name,
                                type: category.type,
                              });
                            }}
                            aria-label={`Editar categoria ${category.name}`}
                          >
                            <Edit3 size={16} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="flex size-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50"
                            onClick={() => void handleDelete(category.id)}
                            aria-label={`Remover categoria ${category.name}`}
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
