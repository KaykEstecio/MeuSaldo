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

Fase atual concluida: CRUD de contas no backend.

Ja existem base FastAPI, PostgreSQL via Docker, SQLAlchemy, Alembic, models base, rotas de autenticacao e CRUD de contas com isolamento por usuario.

Ainda nao foram implementados CRUD de categorias, transacoes, frontend, dashboard, orcamentos ou IA.
