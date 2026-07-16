# MeuSaldo

MeuSaldo e um sistema web de controle financeiro pessoal com assistente de IA.

## Stack Definida

- Backend: Python 3.12 com FastAPI
- Banco: PostgreSQL
- ORM: SQLAlchemy
- Migrations: Alembic
- Autenticacao: JWT
- Frontend: React com TypeScript
- Estilizacao: TailwindCSS
- Graficos: Recharts
- IA: OpenAI pela Responses API, com fallback baseado em regras

## Estrutura Inicial

```txt
meu-saldo/
  backend/
  frontend/
  docs/
    planejamento.md
  docker-compose.yml
  .gitignore
  README.md
```

## Comandos Do Frontend

```bash
cd frontend
npm install
npm run dev
```

URL local:

```txt
http://localhost:5173
```

## Deploy Atual

Ambientes publicados:

- Frontend Vercel: `https://meusaldo-frontend.vercel.app`
- Backend Render: `https://meusaldo.onrender.com`
- Swagger/OpenAPI: `https://meusaldo.onrender.com/docs`
- Health da API: `https://meusaldo.onrender.com/health`
- Health do banco: `https://meusaldo.onrender.com/health/db`
- Banco de producao: Neon PostgreSQL

Variaveis esperadas no frontend da Vercel:

```env
VITE_API_URL=/api/v1
```

Variaveis esperadas no backend da Render:

```env
APP_ENV=production
APP_DEBUG=false
DATABASE_URL=postgresql+psycopg://USUARIO:SENHA@HOST/DB?sslmode=require
CORS_ORIGINS=https://meusaldo-frontend.vercel.app
JWT_SECRET_KEY=uma-chave-forte-de-producao
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_REFRESH_COOKIE_NAME=meusaldo_refresh
JWT_COOKIE_SECURE=true
JWT_COOKIE_SAMESITE=lax
AI_PROVIDER=openai
AI_API_KEY=
OPENAI_API_KEY=configure-no-painel-seguro-da-render
AI_MODEL=gpt-5-mini
AI_TIMEOUT_SECONDS=20
RATE_LIMIT_AUTH_REQUESTS=10
RATE_LIMIT_AUTH_WINDOW_SECONDS=60
RATE_LIMIT_AI_REQUESTS=20
RATE_LIMIT_AI_WINDOW_SECONDS=60
```

Observacoes do pos-deploy:

- Backend Render validado com sucesso em `/health`.
- Conexao Render -> Neon validada com sucesso em `/health/db`.
- CORS do backend validado para a origem `https://meusaldo-frontend.vercel.app`.
- O frontend publicado deve usar `VITE_API_URL=/api/v1` para acessar a API pelo proxy same-origin da Vercel.
- O arquivo `frontend/vercel.json` mantem o fallback SPA para refresh e acesso direto em rotas como `/login`.
- Em plano gratuito da Render, o primeiro acesso pode sofrer cold start.

## PostgreSQL Com Docker

Suba o banco local:

```bash
docker compose up -d postgres
```

Banco criado pelo compose:

- Host: `localhost`
- Porta: `5432`
- Database: `meusaldodb`
- Usuario: `postgres`
- Senha: `postgres`

URL usada pelo backend:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/meusaldodb
```

## Status

Fase atual concluida: refinamento, seguranca e documentacao do MVP.

Ja existem backend FastAPI completo ate assistente financeiro com fallback por regras, PostgreSQL via Docker, SQLAlchemy, Alembic, autenticacao JWT, CRUDs financeiros, dashboard backend e frontend com React, TypeScript, Vite, TailwindCSS, tela de login, tela de cadastro, dashboard financeiro com cards e graficos e telas de contas, categorias, transacoes, orcamentos e assistente.

Ainda nao foi implementada integracao com provedor externo de IA.

Checklist final do MVP:

```txt
docs/revisao-final-mvp.md
```
