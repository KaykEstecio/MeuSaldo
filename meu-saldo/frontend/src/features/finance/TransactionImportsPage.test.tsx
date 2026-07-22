import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { confirmTransactionImport, previewTransactionImport } from "../../api/endpoints";
import { TransactionImportsPage } from "./TransactionImportsPage";

vi.mock("../../hooks/useTheme", () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));

vi.mock("../../api/endpoints", () => ({
  confirmTransactionImport: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue({ data: { id: "user-1", name: "Teste", role: "user" } }),
  listAccounts: vi.fn().mockResolvedValue({ data: [{ id: "account-1", name: "Conta Teste" }] }),
  listCategories: vi.fn().mockResolvedValue({
    data: [
      { id: "category-expense", name: "Mercado", type: "expense" },
      { id: "category-income", name: "Salario", type: "income" },
    ],
  }),
  listTransactionImports: vi.fn().mockResolvedValue({ data: [], meta: { page: 1, page_size: 20, total: 0 } }),
  logout: vi.fn(),
  previewTransactionImport: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("TransactionImportsPage", () => {
  it("previews rows, requires category review and confirms the import", async () => {
    vi.mocked(previewTransactionImport).mockResolvedValueOnce({
      data: {
        filename: "extrato.csv",
        file_format: "csv",
        total_rows: 2,
        duplicate_count: 1,
        ready_count: 1,
        rows: [
          {
            row_number: 1,
            transaction_date: "2026-07-10",
            description: "Padaria Central",
            amount: "45.90",
            type: "expense",
            suggested_category_id: null,
            confidence: "0",
            suggestion_reason: "Revisao necessaria",
            is_duplicate: false,
          },
          {
            row_number: 2,
            transaction_date: "2026-07-10",
            description: "Padaria Central",
            amount: "45.90",
            type: "expense",
            suggested_category_id: null,
            confidence: "0",
            suggestion_reason: "Revisao necessaria",
            is_duplicate: true,
          },
        ],
      },
      message: "ok",
    });
    vi.mocked(confirmTransactionImport).mockResolvedValueOnce({
      data: {
        import_record: {
          id: "import-1",
          account_id: "account-1",
          filename: "extrato.csv",
          file_format: "csv",
          status: "confirmed",
          total_rows: 2,
          imported_count: 1,
          duplicate_count: 1,
          skipped_count: 0,
          created_at: "2026-07-22T15:00:00Z",
        },
        imported_count: 1,
        duplicate_count: 1,
        skipped_count: 0,
      },
      message: "ok",
    });

    render(
      <MemoryRouter initialEntries={["/transaction-imports"]}>
        <TransactionImportsPage />
      </MemoryRouter>,
    );

    const file = new File(["data;descricao;valor"], "extrato.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: vi.fn().mockResolvedValue("data;descricao;valor") });
    fireEvent.change(await screen.findByLabelText("Arquivo CSV ou OFX"), { target: { files: [file] } });
    const analyzeButton = screen.getByRole("button", { name: "Analisar arquivo" });
    await waitFor(() => expect(analyzeButton).toBeEnabled());
    fireEvent.submit(analyzeButton.closest("form")!);

    await waitFor(() => expect(previewTransactionImport).toHaveBeenCalledOnce());

    expect(await screen.findAllByText("Padaria Central")).toHaveLength(2);
    expect(screen.getByText("Duplicada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar importacao" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Categoria de Padaria Central, linha 1"), {
      target: { value: "category-expense" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar importacao" }));

    await waitFor(() => expect(confirmTransactionImport).toHaveBeenCalledOnce());
    expect(vi.mocked(confirmTransactionImport).mock.calls[0][0].rows[0].category_id).toBe("category-expense");
    expect(await screen.findByText(/1 movimentacao\(oes\) importada/)).toBeInTheDocument();
  });
});
