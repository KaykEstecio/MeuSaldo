# Frontend MeuSaldo

Frontend do MeuSaldo usando React, TypeScript, Vite, TailwindCSS e Recharts.

## Escopo Atual

O frontend cobre a base tecnica, autenticacao, area financeira, assistente, painel administrativo e melhorias de experiencia:

- React com TypeScript
- Vite
- TailwindCSS
- Recharts instalado para fases de graficos
- React Router configurado
- Cliente HTTP base para API
- Estrutura oficial de pastas
- Tela de login em `/login`
- Tela de cadastro em `/register`
- Dashboard financeiro em `/dashboard`
- Cards de saldo, receitas, despesas e resultado mensal
- Grafico de fluxo de caixa diario
- Grafico de despesas por categoria
- Filtro de periodo por mes e ano
- Tela de contas em `/accounts`
- Tela de categorias em `/categories`
- Tela de transacoes em `/transactions`
- Tela de orcamentos em `/budgets`
- Tela do assistente financeiro em `/ai-assistant`
- Painel administrativo em `/admin` para usuarios com permissao
- Estados vazios orientados para usuarios iniciantes
- Checklist de primeiro uso no dashboard
- Modo claro/escuro com preferencia salva no navegador
- Code splitting por rota para reduzir o bundle inicial
- Access token mantido apenas em memoria e refresh token em cookie HttpOnly
- Logout

O assistente suporta OpenAI pela Responses API e mantem fallback por regras no backend.

## Como Rodar Localmente

Instale as dependencias:

```bash
npm install
```

Copie o arquivo de ambiente:

```bash
copy .env.example .env
```

Rode o frontend:

```bash
npm run dev
```

URL local:

```txt
http://localhost:5173
```

## Variaveis De Ambiente

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
```

## Qualidade E Deploy

- `npm run typecheck` valida TypeScript.
- `npm run build` gera o build de producao e separa chunks por rota.
- `npm audit --audit-level=moderate` e executado no CI.
- O deploy na Vercel deve usar `VITE_API_URL=/api/v1`.
- O arquivo `vercel.json` encaminha `/api/*` ao backend Render no mesmo dominio do frontend e mantem o fallback SPA.

## Revisao Final

Checklist operacional do MVP:

```txt
../docs/revisao-final-mvp.md
```
