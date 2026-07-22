import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAiMessage, updateAiMessageFeedback } from "../../api/endpoints";
import { AiAssistantPage } from "./AiAssistantPage";

const { assistantMessage } = vi.hoisted(() => ({
  assistantMessage: {
    id: "assistant-1",
    role: "assistant" as const,
    content: "Seu maior gasto esta em Mercado.",
    source: "external" as const,
    feedback: null,
    created_at: "2026-07-22T12:00:00Z",
  },
}));

vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({ isDark: false, theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("../../api/endpoints", () => ({
  createAiMessage: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue({
    data: { id: "user-1", name: "Teste", email: "teste@example.com", role: "user" },
  }),
  listAiMessages: vi.fn().mockResolvedValue({ data: [assistantMessage], meta: { page: 1, page_size: 50, total: 1 } }),
  logout: vi.fn(),
  updateAiMessageFeedback: vi.fn().mockResolvedValue({
    data: { ...assistantMessage, feedback: "helpful" },
    message: "ok",
  }),
}));

afterEach(cleanup);

describe("AiAssistantPage", () => {
  it("prefills the question received from the dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/ai-assistant?prompt=Resuma%20meu%20mes%20e%20aponte%20os%20maiores%20gastos."]}>
        <AiAssistantPage />
      </MemoryRouter>,
    );

    expect(await screen.findByLabelText("Pergunta para o assistente")).toHaveValue(
      "Resuma meu mes e aponte os maiores gastos.",
    );
  });

  it("identifies an external AI answer and records helpful feedback", async () => {
    render(
      <MemoryRouter initialEntries={["/ai-assistant"]}>
        <AiAssistantPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Seu maior gasto esta em Mercado.")).toBeInTheDocument();
    expect(screen.getByText("Gerada pela IA")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Resposta util" }));

    await waitFor(() => expect(updateAiMessageFeedback).toHaveBeenCalledWith("assistant-1", "helpful"));
    expect(screen.getByRole("button", { name: "Resposta util" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders the interpreted period and traceable insight cards", async () => {
    vi.mocked(createAiMessage).mockResolvedValueOnce({
      data: {
        answer: "Resumo seguro da semana.",
        source: "rules",
        disclaimer: "Resposta gerada por regras.",
        fallback_reason: "provider_disabled",
        suggestions: ["Resuma meu mes."],
        analysis_period: {
          label: "ultimos 7 dias (16/07 a 22/07/2026)",
          start_date: "2026-07-16",
          end_date: "2026-07-22",
        },
        insights: [
          {
            key: "expense",
            label: "Despesas",
            value: "R$ 120,00",
            description: "ultimos 7 dias",
            tone: "warning",
            href: "/transactions?type=expense",
          },
        ],
        user_message: {
          id: "user-2",
          role: "user",
          content: "Resuma minha semana.",
          source: "user",
          feedback: null,
          created_at: "2026-07-22T12:01:00Z",
        },
        assistant_message: {
          id: "assistant-2",
          role: "assistant",
          content: "Resumo seguro da semana.",
          source: "rules",
          feedback: null,
          created_at: "2026-07-22T12:01:01Z",
        },
      },
      message: "ok",
    });

    render(
      <MemoryRouter initialEntries={["/ai-assistant"]}>
        <AiAssistantPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Resuma minha semana." }));
    fireEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("ultimos 7 dias (16/07 a 22/07/2026)")).toBeInTheDocument();
    expect(screen.getByText("R$ 120,00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Despesas/ })).toHaveAttribute(
      "href",
      "/transactions?type=expense",
    );
  });
});
