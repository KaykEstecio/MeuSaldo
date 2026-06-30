# Backend MeuSaldo

Backend inicial do MeuSaldo usando Python 3.12, FastAPI, PostgreSQL, SQLAlchemy e Alembic.

## Escopo Da Fase 9

Esta fase configura a base da API, autenticacao inicial, CRUD de contas, CRUD de categorias e CRUD de transacoes:

- Aplicacao FastAPI
- CORS
- Rota `GET /health`
- Rota `GET /health/db`
- Configuracao de conexao com PostgreSQL
- Base SQLAlchemy
- Alembic configurado com migration inicial
- Models base: `users`, `accounts`, `categories` e `transactions`
- Autenticacao JWT com registro, login e usuario atual
- Senhas armazenadas com hash
- Erros padronizados para auth e validacao
- CRUD de contas em `/api/v1/accounts`
- Isolamento de contas por usuario autenticado
- Remocao logica de contas com `is_active=false`
- CRUD de categorias em `/api/v1/categories`
- Isolamento de categorias por usuario autenticado
- Remocao logica de categorias com `is_active=false`
- CRUD de transacoes em `/api/v1/transactions`
- Isolamento de transacoes por usuario autenticado
- Validacao de conta e categoria do mesmo usuario
- Atualizacao automatica do saldo da conta
- Remocao logica de transacoes com `is_active=false`
- Bloqueio da linha da conta ao recalcular saldo em criacao, edicao e remocao de transacoes
- Dashboard backend em `/api/v1/dashboard/summary`
- Agregacoes financeiras por usuario para saldo, receitas, despesas, categorias e fluxo diario
- CRUD de orcamentos em `/api/v1/budgets`
- Orcamentos mensais vinculados a categorias de despesa
- Comparacao de limite planejado vs gasto realizado
- Testes de integracao da autenticacao, contas, categorias, transacoes, dashboard e orcamentos
- Estrutura inicial de pastas

Frontend e IA ainda nao foram implementados.

## Como Rodar Localmente

Versao oficial do Python para o backend: `3.12`.

Crie o ambiente virtual:

```bash
py -3.12 -m venv venv
```

Ative no Windows:

```bash
.\venv\Scripts\Activate.ps1
```

Instale as dependencias:

```bash
pip install -r requirements.txt
```

Copie o arquivo de ambiente:

```bash
copy .env.example .env
```

## PostgreSQL Local

Opcao recomendada para desenvolvimento: subir PostgreSQL com Docker a partir da raiz do projeto:

```bash
cd ..
docker compose up -d postgres
```

Isso cria automaticamente:

- Database: `meusaldodb`
- Usuario: `postgres`
- Senha: `postgres`
- Porta local: `5432`

Opcao manual: instale e inicie o PostgreSQL localmente. Depois crie o banco do projeto:

```sql
CREATE DATABASE meusaldodb;
```

Configure a variavel `DATABASE_URL` no arquivo `.env`:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/meusaldodb
```

Altere usuario, senha, host ou porta conforme sua instalacao local.

## Rodar A API

Inicie a API:

```bash
python -m uvicorn app.main:app --reload
```

## Health Check

Abra no navegador ou use curl:

```bash
curl http://localhost:8000/health
```

Resposta esperada:

```json
{
  "success": true,
  "message": "API MeuSaldo online",
  "data": {
    "status": "healthy"
  }
}
```

## Health Check Do Banco

Com o PostgreSQL rodando e o `.env` configurado:

```bash
curl http://localhost:8000/health/db
```

Resposta esperada:

```json
{
  "success": true,
  "message": "Conexão com banco de dados ativa",
  "data": {
    "database": "connected"
  }
}
```

Se o banco estiver indisponivel, a API retorna erro padronizado sem detalhes sensiveis.

## Alembic

Aplicar migrations existentes:

```bash
alembic upgrade head
```

Criar nova migration futuramente:

```bash
alembic revision --autogenerate -m "mensagem"
```

As migrations atuais cobrem os models base e o soft delete de transacoes. Novas alteracoes de schema devem gerar novas migrations.

## Autenticacao

Registrar usuario:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Usuario Teste\",\"email\":\"usuario@example.com\",\"password\":\"SenhaForte123\"}"
```

Login:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"usuario@example.com\",\"password\":\"SenhaForte123\"}"
```

Usuario atual:

```bash
curl http://localhost:8000/api/v1/users/me ^
  -H "Authorization: Bearer SEU_TOKEN"
```

## Contas

Criar conta:

```bash
curl -X POST http://localhost:8000/api/v1/accounts ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Conta Corrente\",\"type\":\"checking\",\"initial_balance\":\"100.00\"}"
```

Listar contas:

```bash
curl http://localhost:8000/api/v1/accounts ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Consultar conta:

```bash
curl http://localhost:8000/api/v1/accounts/ACCOUNT_ID ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Atualizar conta:

```bash
curl -X PATCH http://localhost:8000/api/v1/accounts/ACCOUNT_ID ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Conta Principal\"}"
```

Remover conta:

```bash
curl -X DELETE http://localhost:8000/api/v1/accounts/ACCOUNT_ID ^
  -H "Authorization: Bearer SEU_TOKEN"
```

## Categorias

Criar categoria:

```bash
curl -X POST http://localhost:8000/api/v1/categories ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Mercado\",\"type\":\"expense\",\"color\":\"#22c55e\",\"icon\":\"shopping-cart\"}"
```

Listar categorias:

```bash
curl http://localhost:8000/api/v1/categories ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Consultar categoria:

```bash
curl http://localhost:8000/api/v1/categories/CATEGORY_ID ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Atualizar categoria:

```bash
curl -X PATCH http://localhost:8000/api/v1/categories/CATEGORY_ID ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Supermercado\"}"
```

Remover categoria:

```bash
curl -X DELETE http://localhost:8000/api/v1/categories/CATEGORY_ID ^
  -H "Authorization: Bearer SEU_TOKEN"
```

## Transacoes

Criar transacao:

```bash
curl -X POST http://localhost:8000/api/v1/transactions ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"account_id\":\"ACCOUNT_ID\",\"category_id\":\"CATEGORY_ID\",\"type\":\"expense\",\"amount\":\"50.00\",\"description\":\"Mercado\",\"transaction_date\":\"2026-06-26\"}"
```

Listar transacoes:

```bash
curl http://localhost:8000/api/v1/transactions ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Consultar transacao:

```bash
curl http://localhost:8000/api/v1/transactions/TRANSACTION_ID ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Atualizar transacao:

```bash
curl -X PATCH http://localhost:8000/api/v1/transactions/TRANSACTION_ID ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"amount\":\"75.00\"}"
```

Remover transacao:

```bash
curl -X DELETE http://localhost:8000/api/v1/transactions/TRANSACTION_ID ^
  -H "Authorization: Bearer SEU_TOKEN"
```

A remocao de transacoes e logica: a linha permanece no banco com `is_active=false` e `deleted_at` preenchido, mas nao aparece em consultas comuns.

## Dashboard

Consultar resumo financeiro do mes:

```bash
curl "http://localhost:8000/api/v1/dashboard/summary?year=2026&month=6" ^
  -H "Authorization: Bearer SEU_TOKEN"
```

A resposta inclui saldo total atual, receitas do mes, despesas do mes, saldo liquido do mes, total de contas ativas, total de transacoes do periodo, despesas por categoria e fluxo diario para graficos.

## Orcamentos

Criar orcamento mensal:

```bash
curl -X POST http://localhost:8000/api/v1/budgets ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"category_id\":\"CATEGORY_ID\",\"month\":6,\"year\":2026,\"limit_amount\":\"500.00\"}"
```

Listar orcamentos:

```bash
curl "http://localhost:8000/api/v1/budgets?year=2026&month=6" ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Consultar orcamento:

```bash
curl http://localhost:8000/api/v1/budgets/BUDGET_ID ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Atualizar orcamento:

```bash
curl -X PATCH http://localhost:8000/api/v1/budgets/BUDGET_ID ^
  -H "Authorization: Bearer SEU_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"limit_amount\":\"600.00\"}"
```

Remover orcamento:

```bash
curl -X DELETE http://localhost:8000/api/v1/budgets/BUDGET_ID ^
  -H "Authorization: Bearer SEU_TOKEN"
```

Orcamentos so podem usar categorias de despesa do proprio usuario. A resposta inclui `spent_amount`, `remaining_amount`, `usage_percent` e `is_over_limit`.

## Testes

Rodar todos os testes:

```bash
pytest
```
