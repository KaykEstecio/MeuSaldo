import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearAccessToken, getAccessToken } from "../../lib/auth";
import { LoginPage } from "./LoginPage";

vi.mock("../../api/endpoints", () => ({
  login: vi.fn().mockResolvedValue({
    data: { access_token: "memory-token", token_type: "bearer", expires_in_minutes: 30 },
    message: "ok",
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => clearAccessToken());

  it("logs in, stores the access token in memory and redirects", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Painel autenticado</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "teste@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "SenhaForte123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => expect(screen.getByText("Painel autenticado")).toBeInTheDocument());
    expect(getAccessToken()).toBe("memory-token");
    expect(window.localStorage.getItem("meusaldo.access_token")).toBeNull();
  });
});
