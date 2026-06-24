---
name: frontend-ui-skill
description: Frontend UI guidance for MeuSaldo. Use when building or reviewing the official React TypeScript frontend structure, src/api clients, feature folders, TailwindCSS layouts, Recharts dashboard views, auth screens, API response/error handling, .env config, financial forms, or AI assistant UI.
---

# Frontend UI Skill

## Objetivo

Orientar a interface oficial do MeuSaldo em React, TypeScript, TailwindCSS e Recharts, garantindo uma experiência financeira clara, responsiva, segura e alinhada ao contrato da API.

## Quando Usar

Use esta skill ao criar ou revisar arquivos em `frontend/src`, rotas, componentes, features, API clients, telas de autenticação, dashboard, formulários financeiros, gráficos Recharts, estados de loading/erro/vazio e interface do assistente de IA.

## Estrutura Oficial

Use esta estrutura como contrato:

```txt
frontend/
  src/
    main.tsx
    app/App.tsx
    app/router.tsx
    api/client.ts
    api/auth.ts
    api/accounts.ts
    api/categories.ts
    api/transactions.ts
    api/budgets.ts
    api/dashboard.ts
    api/aiAssistant.ts
    components/ui/
    components/layout/
    components/charts/
    components/forms/
    components/feedback/
    features/auth/
    features/dashboard/
    features/accounts/
    features/categories/
    features/transactions/
    features/budgets/
    features/ai-assistant/
    hooks/
    lib/formatters.ts
    lib/validators.ts
    lib/constants.ts
    types/api.ts
    types/finance.ts
    types/auth.ts
    styles/index.css
    tests/
  public/
  package.json
  vite.config.ts
  tailwind.config.ts
  .env.example
```

## Convenções Permanentes

- Use componentes React em `PascalCase.tsx`, hooks com prefixo `use`, utilitários em arquivos descritivos e pastas de feature em kebab-case quando compostas, como `ai-assistant`.
- Mantenha chamadas HTTP em `src/api/*`; componentes não devem montar URLs manualmente nem conhecer detalhes de headers.
- Centralize o cliente HTTP em `src/api/client.ts`, usando `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
- Modele envelopes de API em `src/types/api.ts`: sucesso com `data`, listas com `data` e `meta`, erros com `error.code`, `error.message`, `error.details`.
- Modele tipos financeiros em `src/types/finance.ts` e tipos de autenticação em `src/types/auth.ts`; evite `any` para payloads da API.
- Use `src/lib/formatters.ts` para moeda BRL, datas e percentuais; use `src/lib/validators.ts` para validações comuns de formulário.
- Mantenha telas de domínio em `src/features/*`; componentes reaproveitáveis ficam em `src/components/*`.
- Dashboard deve consumir dados agregados do backend em `/dashboard/summary`, `/dashboard/cash-flow` e `/dashboard/by-category`, prontos para Recharts.
- Recharts deve exibir moeda, datas, percentuais, tooltip e legenda quando necessário para interpretação.
- Estados de loading, empty, error e success são obrigatórios para telas que dependem da API.
- Não armazene payload financeiro completo, prompts sensíveis ou respostas completas da IA em estado global sem necessidade.
- Na UI de IA, indique quando a resposta é sugestão, estimativa ou fallback por regras.

## Rotas E API Client

Use o prefixo `VITE_API_BASE_URL` apontando para `/api/v1`. Os arquivos oficiais de API são:

```txt
api/auth.ts          -> /auth/register, /auth/login, /auth/refresh
api/accounts.ts      -> /accounts
api/categories.ts    -> /categories
api/transactions.ts  -> /transactions
api/budgets.ts       -> /budgets
api/dashboard.ts     -> /dashboard/summary, /dashboard/cash-flow, /dashboard/by-category
api/aiAssistant.ts   -> /ai-assistant/messages
```

A UI deve tratar os códigos de erro oficiais: `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`, `INTERNAL_ERROR`, `AI_SERVICE_UNAVAILABLE`.

## Env Oficial Do Frontend

Mantenha `frontend/.env.example` compatível com:

```env
VITE_APP_NAME=MeuSaldo
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Nunca exponha no frontend `JWT_SECRET_KEY`, `DATABASE_URL`, `AI_API_KEY` ou qualquer secret do backend.

## Experiência Financeira

- Priorize saldo, receitas, despesas, fluxo de caixa e gastos por categoria.
- Formulários de transação devem validar tipo, conta, categoria, valor, descrição e data antes de chamar a API.
- Valores monetários devem usar `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })` ou helper central equivalente.
- Tabelas financeiras devem ser legíveis em mobile; use empilhamento, resumo ou paginação em vez de overflow horizontal pesado.
- Ações destrutivas, como remover conta, categoria, transação ou orçamento, precisam de confirmação visual clara.

## Comandos Oficiais

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Qualidade frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
```

Se Playwright entrar depois:

```bash
npm run test:e2e
```

## Critérios De Pronto

- Auth frontend: login funcional, token aplicado ao API client e erro de credenciais exibido sem vazar detalhes.
- Dashboard: responsivo, consome agregações do backend, usa Recharts com formatação e trata loading/empty/error.
- Financeiro: telas de contas, categorias, transações e orçamentos validam formulário e exibem erros do envelope oficial.
- IA: tela usa `api/aiAssistant.ts`, mostra fallback quando aplicável e não expõe dados sensíveis desnecessários.
- MVP frontend: `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` devem passar ou a falha deve estar registrada.

## Checklist De Validação

- O arquivo está na pasta oficial de `src/api`, `src/features`, `src/components`, `src/types`, `src/hooks` ou `src/lib`?
- A chamada usa `api/client.ts` e `VITE_API_BASE_URL`?
- O componente trata envelopes `data`, `meta` e `error`?
- O componente usa tipos explícitos de `types/api.ts`, `types/finance.ts` ou `types/auth.ts`?
- Há loading, empty e error states?
- Valores financeiros e datas usam formatadores centrais?
- Gráficos Recharts têm tooltip, legenda ou labels suficientes?
- A tela funciona em mobile sem texto sobreposto ou layout quebrado?
- Dados sensíveis não são logados no navegador?

## Evite

- Usar `any` para respostas financeiras.
- Fazer cálculo financeiro crítico no componente em vez de consumir dado validado do backend.
- Montar URLs de API diretamente em componentes.
- Guardar secrets ou chaves de IA em variáveis `VITE_*`.
- Exibir erro genérico quando o envelope da API traz código útil para o usuário.
- Criar dashboard decorativo que não ajude decisão financeira.
