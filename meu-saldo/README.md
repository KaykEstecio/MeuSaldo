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
- IA: integracao futura por API externa, com fallback baseado em regras

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

Fase atual concluida: telas financeiras operacionais no frontend.

Ja existem backend FastAPI completo ate orcamentos mensais, PostgreSQL via Docker, SQLAlchemy, Alembic, autenticacao JWT, CRUDs financeiros, dashboard backend e frontend com React, TypeScript, Vite, TailwindCSS, tela de login, tela de cadastro, dashboard financeiro com cards e graficos e telas de contas, categorias e transacoes.

Ainda nao foram implementadas a tela de orcamentos nem IA.
