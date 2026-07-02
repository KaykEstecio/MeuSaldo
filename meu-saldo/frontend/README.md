# Frontend MeuSaldo

Frontend do MeuSaldo usando React, TypeScript, Vite, TailwindCSS e Recharts.

## Escopo Da Fase 16

Esta fase cobre a base tecnica do frontend, as telas de autenticacao, o dashboard financeiro e as telas financeiras operacionais:

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
- Armazenamento local do JWT
- Logout

Orcamentos e IA ainda nao foram implementadas no frontend.

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
