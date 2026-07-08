# Revisao Final Do MVP - MeuSaldo

## Objetivo

Este documento fecha a Fase 19 do MeuSaldo: refinamento, seguranca e documentacao do MVP.

O sistema possui:

- Backend FastAPI com PostgreSQL, SQLAlchemy e Alembic.
- Autenticacao JWT.
- Isolamento de dados por usuario.
- CRUD de contas, categorias, transacoes e orcamentos.
- Dashboard financeiro agregado.
- Assistente financeiro com fallback por regras.
- Frontend React com TypeScript, TailwindCSS e Recharts.

## Checklist De Seguranca

- `.env` esta fora do Git.
- `.env.example` nao contem secrets reais.
- `JWT_SECRET_KEY` deve ser forte em producao.
- `DATABASE_URL` de producao deve usar Neon com `sslmode=require`.
- `CORS_ORIGINS` deve permitir apenas a origem publicada da Vercel.
- Frontend nao contem `DATABASE_URL`, `JWT_SECRET_KEY` ou `AI_API_KEY`.
- Rotas financeiras exigem usuario autenticado.
- Dados financeiros filtram por usuario no backend.
- Assistente usa dados agregados e nao executa acoes financeiras.
- Provedor externo de IA ainda nao esta ativo.
- Testes automatizados bloqueiam execucao quando a `DATABASE_URL` parece apontar para producao/remoto.
- CI executa migrations, testes backend, audit, typecheck e build frontend.
- Rotas de cadastro, login e assistente possuem rate limit com erro `RATE_LIMIT_EXCEEDED`.

## Checklist De Deploy

### Backend Render

Variaveis esperadas:

```env
APP_ENV=production
APP_DEBUG=false
DATABASE_URL=postgresql+psycopg://USUARIO:SENHA@HOST/DB?sslmode=require
CORS_ORIGINS=https://meusaldo-frontend.vercel.app
JWT_SECRET_KEY=chave-forte-de-producao
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
AI_PROVIDER=rules
AI_API_KEY=
AI_MODEL=
AI_TIMEOUT_SECONDS=20
RATE_LIMIT_AUTH_REQUESTS=10
RATE_LIMIT_AUTH_WINDOW_SECONDS=60
RATE_LIMIT_AI_REQUESTS=20
RATE_LIMIT_AI_WINDOW_SECONDS=60
```

Depois de alterar backend ou migrations:

```bash
cd backend
python -m alembic upgrade head
```

Em seguida, fazer deploy da Render.

### Frontend Vercel

Variavel esperada:

```env
VITE_API_URL=https://meusaldo.onrender.com/api/v1
```

O arquivo `frontend/vercel.json` deve continuar versionado para fallback SPA.

## Checklist De Validacao Pos-Deploy

Backend:

```text
GET https://meusaldo.onrender.com/health
GET https://meusaldo.onrender.com/health/db
GET https://meusaldo.onrender.com/docs
```

Frontend:

```text
https://meusaldo-frontend.vercel.app/login
https://meusaldo-frontend.vercel.app/dashboard
https://meusaldo-frontend.vercel.app/accounts
https://meusaldo-frontend.vercel.app/categories
https://meusaldo-frontend.vercel.app/transactions
https://meusaldo-frontend.vercel.app/budgets
https://meusaldo-frontend.vercel.app/ai-assistant
```

Fluxo real recomendado:

1. Criar usuario de teste.
2. Fazer login.
3. Criar conta.
4. Criar categoria de despesa.
5. Criar transacao.
6. Ver dashboard.
7. Criar orcamento.
8. Enviar pergunta ao assistente.
9. Confirmar que o historico do assistente aparece apenas para o usuario autenticado.

## Comandos De Qualidade

Backend:

```bash
cd backend
python -m alembic current
python -m alembic heads
python -m alembic check
python -m pytest
```

Antes de rodar `python -m pytest`, confirme que o `.env` aponta para PostgreSQL local ou banco descartavel de teste.
Nunca use a URL do Neon de producao para testes automatizados.

Frontend:

```bash
cd frontend
npm audit --audit-level=moderate
npm run typecheck
npm run build
```

## Riscos Conhecidos

- O token JWT fica em `localStorage`; aceitavel para MVP, mas cookies HttpOnly seriam uma evolucao de seguranca.
- O frontend usa code splitting por rota; monitore novos avisos de bundle conforme o app crescer.
- Render pode ter cold start em plano gratuito.
- Provedor externo de IA ainda nao foi integrado; o modo atual e `AI_PROVIDER=rules`.
- Nao ha testes automatizados de componente no frontend; a validacao atual usa typecheck, build e smoke manual.

## Criterio De Pronto Do MVP

O MVP esta pronto quando:

- Migrations aplicam no banco de producao.
- Backend responde health e health/db.
- Frontend usa a API de producao.
- Usuario consegue executar o fluxo real de contas, categorias, transacoes, orcamentos, dashboard e assistente.
- Testes backend passam.
- TypeScript e build frontend passam.
