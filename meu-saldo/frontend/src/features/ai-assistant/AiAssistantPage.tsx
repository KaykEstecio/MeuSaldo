import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bot, Loader2, Send, Sparkles, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../../api/client";
import { createAiMessage, listAiMessages } from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";
import type { AiMessage } from "../../types/api";

const suggestionPrompts = [
  "Como posso economizar este mes?",
  "Analise meus limites de gastos.",
  "Qual categoria merece mais atencao?",
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function AiAssistantPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [disclaimer, setDisclaimer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const orderedMessages = useMemo(() => [...messages].reverse(), [messages]);

  function handleError(caughtError: unknown, fallback: string) {
    if (caughtError instanceof ApiError && caughtError.status === 401) {
      clearToken();
      navigate(ROUTES.login, { replace: true });
      return;
    }

    setError(getErrorMessage(caughtError, fallback));
  }

  async function loadMessages() {
    setIsLoading(true);
    setError("");

    try {
      const response = await listAiMessages();
      setMessages(response.data);
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos carregar a conversa do assistente. Tente novamente em instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadMessages();
  }, []);

  async function submitPrompt(message: string) {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await createAiMessage({ message: trimmedMessage });
      setDisclaimer(response.data.disclaimer);
      setMessages((current) => [response.data.assistant_message, response.data.user_message, ...current]);
      setPrompt("");
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos gerar uma resposta agora. Tente reformular a pergunta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPrompt(prompt);
  }

  return (
    <FinanceShell
      title="Assistente financeiro"
      subtitle="Faca perguntas sobre seus gastos, limites e proximos passos financeiros."
    >
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Sparkles size={22} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink-900">Orientacao segura</h2>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            O assistente analisa seu resumo financeiro dentro do MeuSaldo. Ele nao altera seus dados e nao faz operacoes por voce.
          </p>

          <div className="mt-5 space-y-2">
            {suggestionPrompts.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-ink-700 transition hover:border-brand-200 hover:bg-brand-50"
                onClick={() => setPrompt(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
            As respostas sao apoio educativo e nao substituem orientacao financeira profissional.
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Conversa financeira</h2>
              <p className="mt-1 text-sm text-ink-500">Pergunte sobre gastos, limites mensais e formas de se organizar.</p>
            </div>
          </div>

          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {disclaimer ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-ink-600">
              {disclaimer}
            </div>
          ) : null}

          <div className="mt-5 min-h-[360px] space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {isLoading ? (
              <div className="flex h-72 items-center justify-center gap-2 text-sm text-ink-500">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Carregando conversa...
              </div>
            ) : orderedMessages.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-center">
                <div className="max-w-md">
                  <h3 className="text-base font-semibold text-ink-900">Comece uma conversa financeira</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-500">
                    O assistente usa seus dados para gerar analises. Cadastre algumas movimentacoes para receber
                    insights melhores.
                  </p>
                  <p className="mt-3 text-sm text-ink-500">Voce tambem pode escolher uma sugestao ao lado.</p>
                </div>
              </div>
            ) : (
              orderedMessages.map((message) => {
                const isAssistant = message.role === "assistant";
                const Icon = isAssistant ? Bot : UserRound;

                return (
                  <article
                    key={message.id}
                    className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
                  >
                    {isAssistant ? (
                      <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                        <Icon size={18} aria-hidden="true" />
                      </span>
                    ) : null}
                    <div
                      className={`max-w-[760px] rounded-lg px-4 py-3 text-sm leading-6 ${
                        isAssistant ? "bg-white text-ink-700 shadow-sm" : "bg-brand-600 text-white"
                      }`}
                    >
                      <p>{message.content}</p>
                      {isAssistant ? <p className="mt-2 text-xs text-ink-400">Resposta gerada pelo MeuSaldo</p> : null}
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="ai-prompt">
              Pergunta para o assistente
            </label>
            <textarea
              id="ai-prompt"
              className="min-h-24 flex-1 resize-none rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              maxLength={1000}
              minLength={2}
              placeholder="Ex.: Como posso reduzir meus gastos este mes?"
              required
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <button
              type="submit"
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:bg-brand-500 sm:self-end"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} />}
              Enviar
            </button>
          </form>
        </section>
      </div>
    </FinanceShell>
  );
}
