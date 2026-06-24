---
name: backend-architecture-skill
description: Backend architecture guidance for MeuSaldo. Use when changing or reviewing the official FastAPI backend structure, app/api/v1 routes, services, repositories, SQLAlchemy models, Pydantic schemas, PostgreSQL entities, Alembic migrations, JWT auth, API response/error contracts, env config, dashboard aggregations, or AI assistant backend flows.
---

# Backend Architecture Skill

## Objetivo

Orientar a arquitetura backend oficial do MeuSaldo, mantendo a API FastAPI modular, segura, testável e alinhada ao contrato técnico aprovado para controle financeiro pessoal com IA.

## Quando Usar

Use esta skill ao criar ou revisar código em `backend/app`, endpoints em `app/api/v1`, models SQLAlchemy, schemas Pydantic, services, repositories, migrations Alembic, autenticação JWT, regras financeiras, dashboard, configuração `.env.example` ou integração futura com IA.

## Estrutura Oficial

Use esta estrutura como contrato:

```txt
backend/
  app/
    main.py
    core/config.py
    core/security.py
    core/database.py
    core/exceptions.py
    api/deps.py
    api/v1/router.py
    api/v1/auth.py
    api/v1/users.py
    api/v1/accounts.py
    api/v1/categories.py
    api/v1/transactions.py
    api/v1/budgets.py
    api/v1/dashboard.py
    api/v1/ai_assistant.py
    models/user.py
    models/account.py
    models/category.py
    models/transaction.py
    models/budget.py
    models/ai_message.py
    schemas/common.py
    schemas/auth.py
    schemas/user.py
    schemas/account.py
    schemas/category.py
    schemas/transaction.py
    schemas/budget.py
    schemas/dashboard.py
    schemas/ai_assistant.py
    services/auth_service.py
    services/account_service.py
    services/category_service.py
    services/transaction_service.py
    services/budget_service.py
    services/dashboard_service.py
    services/ai_assistant_service.py
    repositories/user_repository.py
    repositories/account_repository.py
    repositories/category_repository.py
    repositories/transaction_repository.py
    repositories/budget_repository.py
    tests/unit/
    tests/integration/
  alembic/versions/
  alembic.ini
  pyproject.toml
  .env.example
```

## Convenções Permanentes

- Escreva arquivos Python em `snake_case.py`; models no singular; services com `_service.py`; repositories com `_repository.py`; testes com `test_`.
- Mantenha rotas FastAPI em `app/api/v1/*.py`; cada rota só orquestra request/response, dependências e chamadas de service.
- Centralize dependências como usuário autenticado e sessão de banco em `app/api/deps.py`.
- Coloque regras financeiras em `services/*_service.py`; coloque acesso a dados em `repositories/*_repository.py` ou queries explícitas bem localizadas.
- Use `schemas/common.py` para contratos compartilhados de resposta, paginação e erro.
- Use SQLAlchemy models em `app/models`; qualquer mudança de schema exige migration Alembic.
- Use `Decimal` e tipo PostgreSQL compatível, como `Numeric(12, 2)`, para dinheiro; nunca use `float` para valores monetários.
- Toda entidade financeira deve ter `user_id` e toda query sensível deve filtrar pelo usuário autenticado antes de retornar ou alterar dados.
- Valide que `account_id`, `category_id` e `budget.category_id` pertencem ao mesmo usuário antes de criar relações.
- Para recurso inexistente ou de outro usuário, prefira `404` para não revelar existência.
- Dashboard deve agregar no backend e entregar dados prontos para Recharts.
- IA deve ficar isolada em `ai_assistant_service.py`, com provider externo futuro e fallback por regras quando `AI_PROVIDER=rules` ou serviço externo indisponível.

## Rotas Oficiais

Use prefixo `/api/v1` e mantenha plural por recurso:

```txt
POST /auth/register
POST /auth/login
POST /auth/refresh
GET  /users/me

GET|POST /accounts
GET|PATCH|DELETE /accounts/{account_id}

GET|POST /categories
PATCH|DELETE /categories/{category_id}

GET|POST /transactions
GET|PATCH|DELETE /transactions/{transaction_id}

GET|POST /budgets
PATCH|DELETE /budgets/{budget_id}

GET /dashboard/summary
GET /dashboard/cash-flow
GET /dashboard/by-category

POST /ai-assistant/messages
GET  /ai-assistant/messages
```

## Respostas E Erros

Padronize sucesso com:

```json
{ "data": {}, "message": "Operação realizada com sucesso" }
```

Padronize lista com:

```json
{ "data": [], "meta": { "page": 1, "page_size": 20, "total": 100 } }
```

Padronize erro com:

```json
{ "error": { "code": "RESOURCE_NOT_FOUND", "message": "Recurso não encontrado", "details": {} } }
```

Códigos oficiais: `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`, `INTERNAL_ERROR`, `AI_SERVICE_UNAVAILABLE`.

## Env Oficial Do Backend

Mantenha `backend/.env.example` compatível com:

```env
APP_NAME=MeuSaldo
APP_ENV=development
APP_DEBUG=true
DATABASE_URL=postgresql+psycopg://meusaldo:meusaldo@localhost:5432/meusaldo
JWT_SECRET_KEY=change-me
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173
AI_PROVIDER=rules
AI_API_KEY=
AI_MODEL=
AI_TIMEOUT_SECONDS=20
```

## Entidades E Relacionamentos

Entidades MVP: `users`, `accounts`, `categories`, `transactions`, `budgets`, `ai_messages`.

Relacionamentos oficiais: `User 1:N Account`, `User 1:N Category`, `User 1:N Transaction`, `User 1:N Budget`, `User 1:N AiMessage`, `Account 1:N Transaction`, `Category 1:N Transaction`, `Category 1:N Budget`.

Campos mínimos: `users` com `name`, `email`, `password_hash`; `accounts` com `type`, `initial_balance`, `current_balance`, `is_active`; `categories` com `type`, `color`, `icon`, `is_default`; `transactions` com `type`, `amount`, `description`, `transaction_date`; `budgets` com `month`, `year`, `amount_limit`; `ai_messages` com `role`, `content`, `source`.

## Regras De Negócio

- Receita aumenta saldo; despesa reduz saldo.
- Criar, alterar ou remover transação deve recalcular o impacto no saldo da conta.
- Categorias têm tipo `income` ou `expense`; transações devem respeitar o tipo da categoria quando houver categoria.
- Orçamentos são mensais e por categoria de despesa.
- Exclusões não devem causar perda acidental de histórico financeiro.
- A IA deve receber dados mínimos e preferencialmente agregados; nunca envie tokens, senhas, chaves, logs brutos ou dados de outro usuário.

## Comandos Oficiais

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Migrations:

```bash
cd backend
alembic revision --autogenerate -m "describe_change"
alembic upgrade head
alembic downgrade -1
alembic current
alembic history
```

Testes backend:

```bash
cd backend
pytest
pytest app/tests/unit
pytest app/tests/integration
```

## Critérios De Pronto

- Backend base: FastAPI inicia, PostgreSQL conecta, Alembic aplica migrations e `.env.example` cobre variáveis.
- Auth: register/login funcionam, JWT protege rotas, senha usa hash e há testes de login inválido e rota protegida.
- Financeiro: CRUD de contas, categorias e transações filtra por usuário, atualiza saldo e testa dois usuários.
- Dashboard: agregações ficam no backend, aceitam filtros e retornam formato pronto para gráficos.
- IA: provider externo fica isolado, fallback por regras funciona e contexto é minimizado.

## Checklist De Validação

- A mudança respeita a estrutura oficial de `app/api/v1`, `services`, `repositories`, `models` e `schemas`?
- A rota usa `/api/v1` e retorna o envelope oficial de sucesso ou erro?
- Toda operação financeira filtra por `user_id` autenticado?
- Existe migration Alembic para alteração de schema?
- O cálculo financeiro usa `Decimal` e está em service?
- A regra de IA usa dados mínimos e fallback por regras?
- Os comandos oficiais de backend, migration e testes continuam válidos?

## Evite

- Criar rotas fora de `app/api/v1` sem motivo claro.
- Misturar regra financeira complexa dentro da rota.
- Retornar payloads fora do padrão `data`, `meta`, `message` ou `error`.
- Aceitar `user_id` vindo do cliente para definir propriedade.
- Fazer dashboard calcular agregações pesadas no frontend.
- Criar provider de IA acoplado diretamente às rotas.
