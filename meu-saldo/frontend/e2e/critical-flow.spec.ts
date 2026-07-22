import { expect, test } from "@playwright/test";

test("cadastro ate assistente financeiro", async ({ page, request }) => {
  const email = `e2e.${Date.now()}@example.com`;
  const password = "SenhaForte123";
  const apiBase = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000/api/v1";

  const registerResponse = await request.post(`${apiBase}/auth/register`, {
    data: { name: "Usuario E2E", email, password },
  });
  expect(registerResponse.status()).toBe(201);

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

  await page.getByRole("link", { name: "Contas financeiras" }).click();
  await expect(page.getByRole("heading", { name: "Contas financeiras", level: 1 })).toBeVisible();
  await page.getByLabel("Nome").fill("Conta E2E");
  await page.getByLabel("Saldo inicial da conta").fill("1000");
  await page.getByRole("button", { name: "Criar conta financeira" }).click();
  await expect(page.getByRole("cell", { name: "Conta E2E", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Categorias" }).click();
  await expect(page.getByRole("heading", { name: "Categorias", level: 1 })).toBeVisible();
  await page.getByLabel("Nome").fill("Mercado E2E");
  await page.getByLabel("Tipo da categoria").selectOption("expense");
  await page.locator("form").getByRole("button", { name: "Criar categoria" }).click();
  await expect(page.getByRole("cell", { name: "Mercado E2E", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Movimentacoes" }).click();
  await expect(page.getByRole("heading", { name: "Movimentacoes", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Despesa", exact: true }).click();
  await page.getByLabel("Conta financeira").selectOption({ label: "Conta E2E" });
  await page.getByLabel("Categoria da movimentacao").selectOption({ label: "Mercado E2E" });
  await page.getByLabel("Descricao curta").fill("Compra E2E");
  await page.getByLabel("Valor").fill("120");
  await page.getByRole("button", { name: "Registrar movimentacao" }).click();
  await expect(page.getByRole("cell", { name: "Compra E2E", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Limites de gastos" }).click();
  await expect(page.getByRole("heading", { name: "Limites de gastos", level: 1 })).toBeVisible();
  await page.locator("#budget-category").selectOption({ label: "Mercado E2E" });
  await page.getByLabel("Limite mensal").fill("500");
  await page.getByRole("button", { name: "Criar limite de gasto" }).click();
  await expect(page.getByRole("cell", { name: "Mercado E2E", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Importar extrato" }).click();
  await expect(page.getByRole("heading", { name: "Importar extrato", level: 1 })).toBeVisible();
  await page.getByLabel("Conta de destino").selectOption({ label: "Conta E2E" });
  await page.getByLabel("Arquivo CSV ou OFX").setInputFiles({
    name: "extrato-e2e.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "data;descricao;valor\n22/07/2026;Mercado E2E;-75,00\n22/07/2026;Mercado E2E;-75,00\n",
    ),
  });
  await page.getByRole("button", { name: "Analisar arquivo" }).click();
  await expect(page.getByText("Duplicada")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar importacao" })).toBeEnabled();
  await page.getByRole("button", { name: "Confirmar importacao" }).click();
  await expect(page.getByText(/1 movimentacao\(oes\) importada/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "extrato-e2e.csv" })).toBeVisible();

  await page.getByRole("link", { name: "Inicio" }).click();
  await expect(page.getByRole("heading", { name: "Inicio", level: 1 })).toBeVisible();
  await expect(page.getByText("Despesas do mes")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();

  await page.getByRole("button", { name: "Analisar este mes" }).click();
  await expect(page.getByRole("heading", { name: "Assistente financeiro", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Pergunta para o assistente")).toHaveValue(
    "Resuma meu mes e destaque o maior gasto.",
  );
  await page.getByLabel("Pergunta para o assistente").fill("Como posso reduzir meus gastos?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText(/nao executo alteracoes/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Numeros usados nesta analise" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Despesas/ })).toBeVisible();
  await expect(page.getByText("Modo seguro por regras").last()).toBeVisible();
  await page.getByRole("button", { name: "Resposta util" }).last().click();
  await expect(page.getByRole("button", { name: "Resposta util" }).last()).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
