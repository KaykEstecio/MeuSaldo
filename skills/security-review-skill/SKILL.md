---
name: security-review-skill
description: Security review guidance for MeuSaldo. Use when reviewing JWT authentication, app/api/deps.py authorization, user isolation in repositories/services, API error contracts, env secrets, frontend storage, PostgreSQL financial data access, logging, CORS, Alembic changes, or AI assistant privacy and fallback flows.
---

# Security Review Skill

## Objetivo

Revisar o MeuSaldo com foco em proteção de dados financeiros pessoais, autenticação JWT, autorização por usuário, controle de secrets, privacidade da IA e consistência do contrato de erros.

## Quando Usar

Use esta skill antes de aprovar mudanças em `backend/app/core/security.py`, `backend/app/api/deps.py`, rotas protegidas, repositories, services financeiros, models, migrations, `.env.example`, frontend auth, API client, logs, CORS ou integração futura com IA externa.

## Superfícies Oficiais De Segurança

- Backend auth: `app/core/security.py`, `app/api/deps.py`, `app/api/v1/auth.py`, `app/services/auth_service.py`.
- Dados financeiros: `accounts`, `categories`, `transactions`, `budgets`, `ai_messages` sempre com escopo por `user_id`.
- API client frontend: `frontend/src/api/client.ts` deve aplicar token sem expor secrets.
- Env backend: `DATABASE_URL`, `JWT_SECRET_KEY`, `JWT_ALGORITHM`, expirações JWT, `CORS_ORIGINS`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_SECONDS`.
- Env frontend: somente `VITE_APP_NAME` e `VITE_API_BASE_URL`; secrets nunca usam prefixo `VITE_`.
- IA: `app/services/ai_assistant_service.py` com provider externo isolado e fallback por regras.

## Regras Permanentes

- Trate todo dado financeiro como sensível: valores, descrições, categorias, contas, orçamento, renda, hábitos de consumo e conversas com IA.
- JWT válido autentica o usuário, mas autorização exige confirmar propriedade do recurso.
- Nunca aceite `user_id` do cliente para definir dono de `accounts`, `categories`, `transactions`, `budgets` ou `ai_messages`; use o usuário autenticado.
- Toda query sensível deve filtrar por `user_id` no backend, preferencialmente em repository ou service.
- Para recurso inexistente ou pertencente a outro usuário, retorne `RESOURCE_NOT_FOUND` com HTTP 404.
- Senhas devem ser armazenadas apenas como hash; nunca retorne `password_hash` em schemas de resposta.
- JWT deve usar algoritmo fixo de configuração, expiração e segredo forte vindo do ambiente.
- Refresh token, se implementado, precisa de estratégia de expiração, rotação ou revogação documentada.
- Logs não podem conter Authorization header, JWT, senha, `DATABASE_URL`, `AI_API_KEY`, prompts completos, respostas completas da IA ou payload financeiro bruto.
- CORS deve respeitar `CORS_ORIGINS`; não libere origens amplas em produção.
- Erros internos devem retornar envelope oficial sem stack trace, SQL, caminho local ou detalhes de infraestrutura.
- IA externa deve receber apenas contexto mínimo, agregado e necessário; fallback por regras deve funcionar sem enviar dados para terceiros.

## Contrato De Erros Seguro

Formato obrigatório:

```json
{ "error": { "code": "RESOURCE_NOT_FOUND", "message": "Recurso não encontrado", "details": {} } }
```

Códigos oficiais: `VALIDATION_ERROR`, `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `FORBIDDEN`, `RESOURCE_NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`, `INTERNAL_ERROR`, `AI_SERVICE_UNAVAILABLE`.

Use `INVALID_CREDENTIALS` para login inválido sem informar se email ou senha falhou. Use `AUTHENTICATION_REQUIRED` para ausência de token. Use `TOKEN_EXPIRED` para token expirado. Use `BUSINESS_RULE_VIOLATION` para regras financeiras negadas.

## Checklist De Revisão

- A rota sensível depende do usuário autenticado por `app/api/deps.py`?
- O service ou repository filtra por `user_id` antes de retornar, alterar ou deletar dados?
- IDs relacionados, como `account_id` e `category_id`, pertencem ao mesmo usuário?
- O erro para recurso de outro usuário é 404 e não revela existência?
- O envelope de erro usa código oficial e não vaza detalhes internos?
- O `.env.example` não contém valores reais de secrets?
- Nenhuma variável sensível foi colocada no frontend como `VITE_*`?
- Logs e mensagens de erro evitam payload financeiro, token e prompt completo?
- A integração de IA minimiza dados e preserva fallback por regras?
- Migrations novas não enfraquecem constraints, índices ou vínculo por usuário?

## Regras Para IA Financeira

- Use `AI_PROVIDER=rules` como modo seguro padrão para desenvolvimento e fallback.
- Mantenha provider externo atrás de interface/service; rotas não devem chamar API externa diretamente.
- Monte contexto com totais, tendências e categorias necessárias, não com dump de transações.
- Remova tokens, emails, chaves, headers, IDs internos desnecessários e dados de outros usuários.
- Trate prompt do usuário como entrada não confiável; ele não pode pedir secrets, bypass de autorização ou dados brutos fora do escopo.
- Se o provedor externo falhar, retorne resposta controlada com `AI_SERVICE_UNAVAILABLE` ou fallback por regras, conforme o caso.

## Comandos Relevantes Para Revisão

Backend:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pytest
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
alembic current
alembic history
alembic upgrade head
```

## Critérios De Pronto De Segurança

- Auth: senha com hash, JWT com expiração, rotas protegidas e testes para login inválido/token ausente.
- Financeiro: testes com dois usuários provam que não há vazamento entre contas.
- Dashboard: agregações filtram por usuário e período.
- IA: contexto minimizado, fallback por regras e ausência de secrets em logs.
- MVP: `.env.example` atualizado, nenhuma chave sensível no repo e erros seguindo contrato oficial.

## Boas Práticas

- Buscar transação por `id` e `user_id` juntos.
- Validar propriedade de conta e categoria antes de criar transação.
- Retornar `RESOURCE_NOT_FOUND` para recurso fora do escopo do usuário.
- Redigir logs como eventos de baixo detalhe, por exemplo `transaction_created user_id=<id>` sem descrição financeira.
- Centralizar tratamento de exceções em `app/core/exceptions.py`.

## Evite

- Decodificar JWT no frontend e usar isso como autorização real.
- Colocar `JWT_SECRET_KEY`, `DATABASE_URL` ou `AI_API_KEY` em `frontend/.env.example`.
- Logar headers, prompts completos, respostas completas da IA ou payloads financeiros.
- Permitir que o cliente envie `user_id` para criar ou filtrar recursos próprios.
- Enviar todas as transações do usuário para a IA quando agregações resolvem.
- Expor stack trace, SQL ou paths internos no envelope de erro.
