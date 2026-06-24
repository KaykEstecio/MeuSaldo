---
name: testing-quality-skill
description: Testing and quality guidance for MeuSaldo. Use when adding or reviewing pytest tests, FastAPI integration tests, SQLAlchemy/PostgreSQL fixtures, Alembic migration checks, React TypeScript tests, API contract tests, Recharts rendering checks, JWT/user-isolation tests, CI commands, or AI assistant fallback and privacy quality gates.
---

# Testing Quality Skill

## Objetivo

Garantir que o MeuSaldo evolua com testes úteis e critérios de pronto alinhados ao contrato técnico oficial de backend, frontend, banco, autenticação, regras financeiras, dashboard e IA.

## Quando Usar

Use esta skill ao criar, corrigir ou revisar testes em `backend/app/tests`, testes de API FastAPI, fixtures PostgreSQL/SQLAlchemy, migrations Alembic, testes React/TypeScript, validações de Recharts, comandos de qualidade, critérios de fase ou testes do assistente de IA com fallback por regras.

## Estrutura Oficial De Testes

Backend:

```txt
backend/app/tests/unit/
backend/app/tests/integration/
```

Frontend:

```txt
frontend/src/tests/
```

Padrões de nome: arquivos backend começam com `test_`; testes devem refletir domínio e comportamento, como `test_transactions_service.py`, `test_auth_routes.py`, `test_dashboard_service.py`. No frontend, agrupe por feature ou componente e teste comportamento observável do usuário.

## Comandos Oficiais

Backend:

```bash
cd backend
pytest
pytest app/tests/unit
pytest app/tests/integration
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run lint
npm run test
npm run build
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

Execução local esperada:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

cd frontend
npm install
npm run dev
```

## Convenções Permanentes

- Teste regras financeiras no nível de service, contratos HTTP no nível de rota e persistência crítica no nível de integração.
- Cubra sempre usuário autenticado, usuário não autenticado, usuário dono, usuário não dono e recurso inexistente para endpoints financeiros.
- Use dados de pelo menos dois usuários em testes de isolamento para `accounts`, `categories`, `transactions`, `budgets`, dashboard e IA.
- Teste envelopes oficiais de sucesso: item único com `data` e `message`; listas com `data` e `meta`.
- Teste envelope oficial de erro com `error.code`, `error.message` e `error.details`.
- Use os códigos oficiais: `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`, `INTERNAL_ERROR`, `AI_SERVICE_UNAVAILABLE`.
- Teste migrations quando models mudarem; `alembic upgrade head` deve funcionar em banco limpo de teste.
- Teste valores monetários com `Decimal`, incluindo receita, despesa, alteração e remoção de transação.
- No frontend, teste loading, empty, error, validação de formulário e submissão por comportamento visível, não por classes Tailwind.
- Para Recharts, valide presença de título/contexto, dados formatados e estados vazios; evite acoplar testes a detalhes frágeis do SVG.
- Testes de IA não devem chamar provedor externo real; valide builder de contexto, minimização de dados, fallback por regras e tratamento de falha.

## Matriz Mínima Por Fase

Backend base:
- FastAPI inicia sem erro.
- PostgreSQL conecta em ambiente de teste.
- Alembic aplica migrations.
- `.env.example` contém variáveis oficiais sem secrets reais.

Autenticação:
- `POST /api/v1/auth/register` cria usuário e não retorna `password_hash`.
- `POST /api/v1/auth/login` retorna token para credenciais válidas.
- Credenciais inválidas retornam `INVALID_CREDENTIALS`.
- Rota protegida sem token retorna `AUTHENTICATION_REQUIRED`.

Financeiro:
- CRUD de `accounts`, `categories`, `transactions` filtra por usuário.
- Criar receita aumenta saldo; criar despesa reduz saldo.
- Alterar ou remover transação recalcula saldo corretamente.
- Categoria de outro usuário não pode ser usada em transação.

Dashboard:
- `/dashboard/summary`, `/dashboard/cash-flow` e `/dashboard/by-category` agregam no backend.
- Filtros de período não vazam dados entre usuários.
- Respostas ficam prontas para Recharts.

Frontend:
- Login usa `api/auth.ts` e API client central.
- Dashboard trata loading, empty e error.
- Formulários validam dinheiro, data, conta e categoria antes de chamar API.
- `npm run typecheck`, `npm run lint`, `npm run test` e `npm run build` passam.

IA:
- `AI_PROVIDER=rules` funciona sem API externa.
- Provider externo é mockado em testes.
- Contexto enviado à IA exclui tokens, secrets, email quando desnecessário e dados de outro usuário.
- Falha de IA retorna fallback ou erro oficial controlado.

## Contratos Que Devem Ser Testados

Sucesso único:

```json
{ "data": {}, "message": "Operação realizada com sucesso" }
```

Lista:

```json
{ "data": [], "meta": { "page": 1, "page_size": 20, "total": 100 } }
```

Erro:

```json
{ "error": { "code": "RESOURCE_NOT_FOUND", "message": "Recurso não encontrado", "details": {} } }
```

## Checklist De Validação

- A mudança tem teste no nível certo: unitário, integração, componente ou contrato?
- Há teste com dois usuários para qualquer dado financeiro novo?
- Rotas protegidas testam ausência de token e recurso de outro usuário?
- Regras de saldo cobrem criar, alterar e remover transação?
- Erros usam códigos oficiais e envelope oficial?
- Migrations foram criadas e `alembic upgrade head` foi considerado?
- Frontend executa typecheck, lint, test e build?
- Componentes tratam loading, empty e error?
- Testes de IA usam mock/fallback e não provedor externo real?
- A impossibilidade de executar algum comando foi registrada claramente?

## Critérios De Pronto

- Backend base pronto: servidor sobe, DB conecta, migration aplica e env está documentado.
- Auth pronto: register/login, JWT, hash de senha e testes negativos estão cobertos.
- Financeiro pronto: CRUD principal, saldo correto e isolamento por usuário têm testes.
- Dashboard pronto: agregações backend e contratos para Recharts estão testados.
- Frontend pronto: fluxo de login, dashboard responsivo, formulários e comandos de qualidade passam.
- IA pronta para MVP: fallback por regras, contexto minimizado e testes de privacidade passam.

## Boas Práticas

- Criar fixtures/factories pequenas para `User`, `Account`, `Category`, `Transaction` e `Budget`.
- Usar valores financeiros explícitos e casos com receita/despesa.
- Testar `GET /api/v1/transactions` com dois usuários e confirmar que cada um vê apenas seus dados.
- Mockar `api/client.ts` ou handlers HTTP no frontend para validar estados sem backend real.
- Testar `ai_assistant_service.py` com provider falso e fallback por regras.

## Evite

- Testar apenas status `200` sem validar envelope, dados e escopo por usuário.
- Usar o mesmo usuário em todos os testes de autorização.
- Depender de ordem implícita do banco sem ordenação definida.
- Acoplar testes frontend a classes Tailwind.
- Chamar API externa de IA em teste unitário ou CI.
- Ignorar falha de migration porque os models locais parecem corretos.
- Criar snapshots grandes de dashboards ou respostas de IA.
