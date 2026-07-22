import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  CalendarRange,
  Loader2,
  Send,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "../../api/client";
import { createAiMessage, listAiMessages, updateAiMessageFeedback } from "../../api/endpoints";
import { FinanceShell } from "../../components/layout/FinanceShell";
import { useAuthToken } from "../../hooks/useAuthToken";
import { ROUTES } from "../../lib/routes";
import type { AiAnalysisPeriod, AiInsight, AiMessage } from "../../types/api";

const suggestionPrompts = [
  "Resuma minha semana.",
  "Resuma meu mes e destaque o maior gasto.",
  "Como posso melhorar meu resultado neste mes?",
];

const insightToneClasses = {
  neutral: "border-slate-200 bg-slate-50 text-ink-900",
  positive: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  negative: "border-red-200 bg-red-50 text-red-900",
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function AiAssistantPage() {
  const { clearToken } = useAuthToken();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [prompt, setPrompt] = useState(() => (searchParams.get("prompt") ?? "").slice(0, 1000));
  const [suggestions, setSuggestions] = useState(suggestionPrompts);
  const [analysisPeriod, setAnalysisPeriod] = useState<AiAnalysisPeriod | null>(null);
  const [insights, setInsights] = useState<AiInsight[]>([]);
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
      setSuggestions(response.data.suggestions);
      setAnalysisPeriod(response.data.analysis_period);
      setInsights(response.data.insights);
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

  async function submitFeedback(messageId: string, feedback: "helpful" | "not_helpful") {
    setError("");
    try {
      const response = await updateAiMessageFeedback(messageId, feedback);
      setMessages((current) =>
        current.map((message) => (message.id === messageId ? response.data : message)),
      );
    } catch (caughtError) {
      handleError(caughtError, "Nao conseguimos registrar sua avaliacao agora.");
    }
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
            {suggestions.map((suggestion) => (
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

          {analysisPeriod && insights.length > 0 ? (
            <section className="mt-4" aria-labelledby="analysis-summary-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="analysis-summary-title" className="text-sm font-semibold text-ink-900">
                  Numeros usados nesta analise
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                  <CalendarRange size={14} aria-hidden="true" />
                  {analysisPeriod.label}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {insights.map((insight) => (
                  <Link
                    key={insight.key}
                    className={`group rounded-lg border p-3 transition hover:-translate-y-0.5 hover:shadow-sm ${insightToneClasses[insight.tone]}`}
                    to={insight.href}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{insight.label}</p>
                      <ArrowRight size={15} className="shrink-0 opacity-60 transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </div>
                    <p className="mt-2 text-lg font-semibold">{insight.value}</p>
                    <p className="mt-1 text-xs leading-5 opacity-75">{insight.description}</p>
                  </Link>
                ))}
              </div>
            </section>
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
                      {isAssistant ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500">
                            {message.source === "external" ? (
                              <BrainCircuit size={14} aria-hidden="true" />
                            ) : (
                              <ShieldCheck size={14} aria-hidden="true" />
                            )}
                            {message.source === "external" ? "Gerada pela IA" : "Modo seguro por regras"}
                          </span>
                          <div className="flex items-center gap-1" aria-label="Avaliar resposta">
                            <button
                              type="button"
                              className={`rounded-md p-1.5 transition hover:bg-slate-100 ${
                                message.feedback === "helpful" ? "bg-brand-50 text-brand-700" : "text-ink-400"
                              }`}
                              aria-label="Resposta util"
                              aria-pressed={message.feedback === "helpful"}
                              onClick={() => void submitFeedback(message.id, "helpful")}
                            >
                              <ThumbsUp size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`rounded-md p-1.5 transition hover:bg-slate-100 ${
                                message.feedback === "not_helpful" ? "bg-red-50 text-red-700" : "text-ink-400"
                              }`}
                              aria-label="Resposta nao util"
                              aria-pressed={message.feedback === "not_helpful"}
                              onClick={() => void submitFeedback(message.id, "not_helpful")}
                            >
                              <ThumbsDown size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ) : null}
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
