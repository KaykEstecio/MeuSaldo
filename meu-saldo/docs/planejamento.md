# Planejamento Tecnico Oficial - MeuSaldo

## 1. Visao Geral

O MeuSaldo e um sistema web de controle financeiro pessoal com autenticacao por usuario, controle de contas, categorias, transacoes, orcamentos, dashboards e assistente de IA financeira com fallback por regras.

O MVP deve priorizar seguranca, isolamento por usuario, consistencia dos dados financeiros, rastreabilidade, arquitetura simples de evoluir e documentacao clara.

## 2. Stack Oficial

### Backend

- Python 3.12
- FastAPI
- PostgreSQL
- SQLAlchemy
- Alembic
- JWT
- Pydantic
- Docker para PostgreSQL local

### Frontend

- React
- TypeScript
- TailwindCSS
- Recharts

### IA

- Modulo atual com fallback baseado em regras
- Integracao futura por API externa
- IA sem permissao para executar acoes financeiras diretamente

## 3. Estrutura Oficial Do Projeto

```txt
meu-saldo/
  backend/
  frontend/
  docs/
```

## 4. Estrutura Oficial Do Backend

```txt
backend/
  app/
    api/
      v1/
    core/
    database/
    models/
    schemas/
    services/
    repositories/
    routes/
    tests/
      integration/
  alembic/
    versions/
  .env.example
  .python-version
  alembic.ini
  requirements.txt
  README.md
```

Responsabilidades:

- `app/api/v1/`: rotas versionadas da API.
- `app/routes/`: rotas tecnicas fora do dominio principal, como health check.
- `app/services/`: regras de negocio e orquestracao.
- `app/repositories/`: acesso ao banco de dados.
- `app/models/`: models SQLAlchemy.
- `app/schemas/`: schemas Pydantic.
- `app/core/`: configuracoes, seguranca e tratamento de excecoes.
- `app/database/`: engine, sessao, Base e dependencia de banco.
- `app/tests/`: testes automatizados.
- `alembic/`: migrations.

## 5. Estrutura Planejada Do Frontend

```txt
frontend/
  src/
    api/
    features/
    components/
    hooks/
    lib/
    types/
    styles/
```

## 6. Padroes Da API

Prefixo oficial:

```txt
/api/v1
```

Resposta de sucesso:

```json
{
  "data": {},
  "message": "Operacao realizada com sucesso"
}
```

Resposta com lista:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100
  }
}
```

Resposta de erro:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Recurso nao encontrado",
    "details": {}
  }
}
```

Codigos de erro usados:

- `VALIDATION_ERROR`
- `AUTHENTICATION_REQUIRED`
- `INVALID_CREDENTIALS`
- `TOKEN_EXPIRED`
- `FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `CONFLICT`
- `INTERNAL_ERROR`

## 7. Entidades Do MVP

Entidades principais:

- `users`
- `accounts`
- `categories`
- `transactions`
- `budgets`

- `ai_messages`

`ai_messages` armazena o historico do assistente por usuario autenticado.

## 8. Modelagem Inicial

### users

Campos minimos:

- `id`
- `name`
- `email`
- `password_hash`
- `role`
- `is_active`
- `last_login_at`
- `created_at`
- `updated_at`

Regras:

- `email` deve ser unico.
- Senha nunca deve ser salva em texto puro.
- A API nunca deve retornar `password_hash`.
- `role` deve controlar permissao de acesso administrativo.
- Valores previstos para `role`: `user` e `admin`.
- Usuario comum nao pode acessar rotas administrativas.
- `last_login_at` deve ser atualizado a cada login bem-sucedido.

### accounts

Campos minimos:

- `id`
- `user_id`
- `name`
- `type`
- `initial_balance`
- `current_balance`
- `is_active`
- `created_at`
- `updated_at`

Tipos implementados atualmente:

- `checking`
- `savings`
- `cash`
- `credit_card`
- `investment`
- `other`

Regras:

- Toda conta pertence a um usuario.
- Usuario so acessa suas proprias contas.
- `initial_balance` e `current_balance` usam `Decimal/Numeric`.
- Nao usar `float` para valores monetarios.
- `current_balance` nao deve ser alterado livremente por rotas de contas.
- Ao criar uma conta, `current_balance` inicia com o mesmo valor de `initial_balance`.
- Exclusao usa soft delete com `is_active=false`.
- Contas inativas nao aparecem na listagem padrao.

### categories

Campos minimos:

- `id`
- `user_id`
- `name`
- `type`
- `color`
- `icon`
- `is_default`
- `is_active`
- `created_at`
- `updated_at`

Tipos permitidos:

- `income`
- `expense`

Regras:

- Toda categoria pertence a um usuario.
- Usuario so acessa suas proprias categorias.
- Categoria de receita so pode ser usada em transacoes de receita.
- Categoria de despesa so pode ser usada em transacoes de despesa.
- Exclusao usa soft delete com `is_active=false`.
- Categorias inativas nao aparecem na listagem padrao.

### transactions

Campos minimos:

- `id`
- `user_id`
- `account_id`
- `category_id`
- `type`
- `amount`
- `description`
- `transaction_date`
- `is_active`
- `deleted_at`
- `created_at`
- `updated_at`

Tipos permitidos:

- `income`
- `expense`

Regras implementadas:

- Toda transacao pertence a um usuario.
- Conta e categoria devem pertencer ao mesmo usuario.
- `amount` deve ser positivo.
- Tipo da categoria deve bater com tipo da transacao.
- Receita aumenta saldo.
- Despesa reduz saldo.
- Criar, editar ou remover transacao deve atualizar saldo de forma atomica.
- Remocao usa soft delete com `is_active=false` e `deleted_at`.
- Transacoes inativas nao aparecem na listagem padrao nem em consulta por id.
- Alteracoes de saldo usam bloqueio da linha da conta durante a transacao de banco.

### budgets

Campos implementados:

- `id`
- `user_id`
- `category_id`
- `month`
- `year`
- `limit_amount`
- `is_active`
- `created_at`
- `updated_at`

Regras implementadas:

- Orcamento pertence a um usuario.
- Orcamento deve ser vinculado a categoria de despesa.
- Orcamento deve ser por mes, ano e categoria.
- Usuario so acessa seus proprios orcamentos.
- Nao pode existir mais de um orcamento ativo para a mesma categoria no mesmo mes e ano.
- Exclusao usa soft delete com `is_active=false`.
- A API retorna gasto realizado, valor restante, percentual de uso e indicador de limite ultrapassado.

### ai_messages

Campos implementados:

- `id`
- `user_id`
- `role`
- `content`
- `source`
- `created_at`

Regras:

- IA deve receber preferencialmente dados agregados.
- IA nao deve receber dados sensiveis desnecessarios.
- Fallback por regras deve funcionar sem provedor externo.
- IA nao deve executar acoes financeiras diretamente.

## 9. Regras Globais

- Cada usuario acessa apenas seus proprios dados.
- Toda entidade financeira deve ter `user_id`.
- Toda busca sensivel deve filtrar pelo `user_id` do usuario autenticado.
- Valores monetarios devem usar `Decimal/Numeric`, nunca `float`.
- Senhas devem ser protegidas com hash.
- Autenticacao usa JWT.
- Dados sensiveis nao devem ser expostos nas respostas.
- Dashboard deve usar dados agregados no backend.
- Frontend nao deve calcular regras financeiras criticas.
- Alteracoes em saldo devem ser centralizadas no backend.
- Erros devem seguir o envelope oficial da API.

## 10. Decisao Tecnica Sobre Saldo

O sistema usa:

- `initial_balance`
- `current_balance`

Regras:

- `initial_balance` representa o saldo informado na criacao da conta.
- `current_balance` representa o saldo atual calculado a partir das transacoes.
- `current_balance` nao deve ser alterado diretamente pelo CRUD comum de contas.
- Alteracoes no saldo devem ocorrer apenas no service de transacoes.
- Operacoes de transacao devem ser atomicas.

## 11. Ordem Oficial De Implementacao

1. Setup backend, configuracao, PostgreSQL e Alembic.
2. Models base: `users`, `accounts`, `categories` e `transactions`.
3. Autenticacao JWT: registro, login e usuario atual.
4. Revisao inicial de seguranca.
5. CRUD de contas.
6. Revisao tecnica do CRUD de contas.
7. CRUD de categorias.
8. Revisao tecnica do CRUD de categorias.
9. CRUD de transacoes com atualizacao de saldo.
10. Testes basicos do backend financeiro.
11. Dashboard backend. Concluido.
12. Orcamentos mensais. Concluido.
13. Setup frontend. Concluido.
14. Telas de autenticacao. Concluido.
15. Dashboard frontend. Concluido.
16. Telas de contas, categorias e transacoes. Concluido.
17. Tela de orcamentos. Concluido.
18. Assistente IA com fallback por regras. Concluido.
19. Refinamento, seguranca e documentacao. Concluido.

## 12. Status Atual Do Projeto

Status atual:

```txt
Fase 19 - Refinamento, seguranca e documentacao concluido
```

Ja foram implementados:

- Backend FastAPI.
- PostgreSQL via Docker.
- SQLAlchemy.
- Alembic.
- Models base `users`, `accounts`, `categories` e `transactions`.
- Registro de usuario.
- Login JWT.
- Rota de usuario atual.
- CRUD de contas com isolamento por usuario.
- CRUD de categorias com isolamento por usuario.
- CRUD de transacoes com isolamento por usuario.
- Atualizacao automatica de saldo ao criar, editar e remover transacoes.
- Remocao logica de transacoes.
- Bloqueio de conta durante recalculo de saldo em transacoes.
- Dashboard backend com resumo financeiro agregado por usuario.
- CRUD de orcamentos mensais com isolamento por usuario.
- Comparacao de limite planejado vs gasto realizado por categoria.
- Testes de integracao para autenticacao, contas e categorias.
- Testes de integracao para transacoes e regras principais de saldo.
- Testes de integracao para dashboard.
- Testes de integracao para orcamentos.
- Frontend React com TypeScript, Vite, TailwindCSS e Recharts.
- Estrutura inicial do frontend.
- Cliente HTTP base para consumir a API versionada.
- Armazenamento local de JWT preparado para as telas autenticadas.
- Tela de login conectada ao backend.
- Tela de cadastro conectada ao backend.
- Rotas publicas e protegidas configuradas no frontend.
- Logout implementado.
- Dashboard frontend conectado ao endpoint `GET /api/v1/dashboard/summary`.
- Cards financeiros do periodo.
- Graficos de fluxo de caixa diario e despesas por categoria com Recharts.
- Filtro mensal do dashboard.
- Tela de contas conectada ao CRUD de contas.
- Tela de categorias conectada ao CRUD de categorias.
- Tela de transacoes conectada ao CRUD de transacoes.
- Tela de orcamentos conectada ao CRUD de orcamentos.
- Assistente financeiro com fallback por regras.
- Historico de mensagens em `ai_messages`.
- Rota `POST /api/v1/ai-assistant/messages`.
- Rota `GET /api/v1/ai-assistant/messages`.
- Tela do assistente em `/ai-assistant`.
- Navegacao autenticada entre dashboard, contas, categorias, transacoes, orcamentos e assistente.
- Revisao final do MVP em `docs/revisao-final-mvp.md`.
- Checklist de seguranca, deploy e validacao pos-deploy.

Ainda nao foram implementados:

- Integracao com provedor externo de IA.

## 13. Dashboard Backend Implementado

Endpoint oficial:

```txt
GET /api/v1/dashboard/summary?year=2026&month=6
```

Resposta:

- `period`: ano, mes, data inicial e data final.
- `total_balance`: soma do saldo atual das contas ativas do usuario.
- `monthly_income`: soma das receitas ativas no periodo.
- `monthly_expense`: soma das despesas ativas no periodo.
- `monthly_net`: receitas menos despesas no periodo.
- `active_accounts`: total de contas ativas.
- `transactions_count`: total de transacoes ativas no periodo.
- `expense_by_category`: despesas agrupadas por categoria.
- `cashflow_by_day`: receitas, despesas e saldo liquido por dia.

Regras:

- Todas as consultas filtram pelo `user_id` autenticado.
- Apenas contas ativas entram em `total_balance` e `active_accounts`.
- Apenas transacoes ativas entram nas agregacoes do periodo.
- Dados financeiros criticos sao agregados no backend.
- O frontend deve consumir esses dados prontos para cards e graficos.

## 14. Orcamentos Mensais Implementados

Endpoint oficial:

```txt
/api/v1/budgets
```

Rotas:

- `POST /api/v1/budgets`
- `GET /api/v1/budgets`
- `GET /api/v1/budgets/{budget_id}`
- `PATCH /api/v1/budgets/{budget_id}`
- `DELETE /api/v1/budgets/{budget_id}`

Resposta:

- `category_id`
- `category_name`
- `month`
- `year`
- `limit_amount`
- `spent_amount`
- `remaining_amount`
- `usage_percent`
- `is_over_limit`
- `is_active`

Regras:

- Todo orcamento pertence a um usuario.
- Usuario so acessa seus proprios orcamentos.
- Orcamento deve usar categoria de despesa ativa do proprio usuario.
- Nao pode existir mais de um orcamento ativo para a mesma categoria no mesmo mes e ano.
- Duplicidade ativa tambem e protegida por indice unico parcial no PostgreSQL.
- Remocao usa soft delete com `is_active=false`.
- Orcamentos inativos nao aparecem na listagem padrao.
- Gasto realizado considera apenas transacoes ativas de despesa no periodo.
- Valores monetarios usam `Decimal/Numeric`.

## 15. Comandos Oficiais Do Backend

Criar venv:

```bash
py -3.12 -m venv venv
```

Ativar no Windows:

```bash
.\venv\Scripts\Activate.ps1
```

Instalar dependencias:

```bash
pip install -r requirements.txt
```

Rodar API:

```bash
python -m uvicorn app.main:app --reload
```

Rodar testes:

```bash
pytest
```

Rodar migrations:

```bash
alembic upgrade head
```

Checar migrations:

```bash
alembic check
```

Criar migration futura:

```bash
alembic revision --autogenerate -m "mensagem"
```

## 16. Setup Frontend Implementado

Estrutura oficial:

```txt
frontend/
  src/
    api/
    features/
    components/
    hooks/
    lib/
    types/
    styles/
```

Stack:

- React
- TypeScript
- Vite
- TailwindCSS
- React Router
- Recharts
- Lucide React

Arquivos principais:

- `src/api/client.ts`
- `src/api/endpoints.ts`
- `src/lib/auth.ts`
- `src/lib/routes.ts`
- `src/types/api.ts`
- `src/App.tsx`
- `src/main.tsx`

Regras:

- Frontend consome a API pelo prefixo configurado em `VITE_API_URL`.
- Token JWT fica isolado em helper proprio em `src/lib/auth.ts`.
- Cliente HTTP entende envelope padrao de sucesso e erro da API.
- Frontend nao calcula regras financeiras criticas.
- Telas reais de autenticacao com formularios foram implementadas na fase 14.

## 17. Telas De Autenticacao Implementadas

Rotas:

- `/login`
- `/register`
- `/dashboard`

Arquivos principais:

- `src/features/auth/LoginPage.tsx`
- `src/features/auth/RegisterPage.tsx`
- `src/features/auth/AuthenticatedStartPage.tsx`
- `src/features/auth/components/AuthLayout.tsx`
- `src/components/navigation/GuestRoute.tsx`
- `src/components/navigation/ProtectedRoute.tsx`

Regras:

- Login chama `POST /api/v1/auth/login`.
- Cadastro chama `POST /api/v1/auth/register`.
- JWT retornado no login e salvo pelo helper `src/lib/auth.ts`.
- Rotas publicas redirecionam usuario autenticado para `/dashboard`.
- Rota protegida redireciona usuario sem token para `/login`.
- Logout remove o token local.
- Dashboard real foi implementado na fase 15 consumindo agregados financeiros do backend.

## 18. Dashboard Frontend Implementado

Rota:

- `/dashboard`

Arquivos principais:

- `src/features/dashboard/DashboardPage.tsx`
- `src/api/endpoints.ts`
- `src/types/api.ts`
- `src/lib/formatters.ts`

Regras:

- Dashboard chama `GET /api/v1/dashboard/summary`.
- Periodo e enviado por query string com `year` e `month`.
- Cards e graficos usam somente agregados retornados pelo backend.
- Frontend nao recalcula regras financeiras criticas.
- Erro `401` remove o token local e redireciona para `/login`.
- Graficos usam Recharts para fluxo de caixa diario e despesas por categoria.

## 19. Telas Financeiras Operacionais Implementadas

Rotas:

- `/accounts`
- `/categories`
- `/transactions`

Arquivos principais:

- `src/components/layout/FinanceShell.tsx`
- `src/features/finance/AccountsPage.tsx`
- `src/features/finance/CategoriesPage.tsx`
- `src/features/finance/TransactionsPage.tsx`
- `src/lib/financeLabels.ts`
- `src/api/endpoints.ts`
- `src/types/api.ts`

Regras:

- Todas as rotas ficam protegidas por JWT.
- Contas, categorias e transacoes consomem a API versionada.
- O frontend nao recalcula saldo de conta.
- Criacao, edicao e remocao chamam os services do backend via endpoints oficiais.
- Transacoes exigem conta e categoria existentes.
- Remocao usa os endpoints de delete do backend, mantendo a regra de soft delete quando aplicavel.

## 20. Comandos Oficiais Do Frontend

Instalar dependencias:

```bash
npm install
```

Rodar frontend:

```bash
npm run dev
```

Build de producao:

```bash
npm run build
```

Checagem TypeScript:

```bash
npm run typecheck
```

Preview do build:

```bash
npm run preview
```

Variavel de ambiente:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## 19. Criterio Para Avancar Para Dashboard Frontend

Antes da fase de dashboard frontend, validar:

- CRUD de contas funcional.
- CRUD de categorias funcional.
- CRUD de transacoes funcional.
- Isolamento por usuario testado para contas e categorias.
- Isolamento por usuario testado para transacoes.
- Soft delete implementado para contas e categorias.
- Contas e categorias inativas fora da listagem padrao.
- Erros padronizados.
- Valores monetarios usando `Decimal/Numeric`.
- `current_balance` atualizado por regras de transacao.
- Criar receita aumenta saldo.
- Criar despesa reduz saldo.
- Editar transacao recalcula saldo.
- Remover transacao desfaz impacto no saldo.
- Remover transacao usa soft delete.
- Operacoes que alteram saldo travam a conta ate o commit.
- Tipo da categoria bate com tipo da transacao.
- Dashboard backend autenticado.
- Dashboard filtra dados por usuario.
- Dashboard ignora transacoes removidas logicamente.
- Dashboard entrega dados agregados para graficos.
- CRUD de orcamentos funcional.
- Orcamentos filtram dados por usuario.
- Orcamentos exigem categoria de despesa.
- Orcamentos calculam gasto realizado do periodo.
- Orcamentos bloqueiam duplicidade ativa por categoria, mes e ano.
- Frontend instala dependencias sem vulnerabilidades conhecidas.
- Frontend executa `npm run typecheck`.
- Frontend executa `npm run build`.
- Estrutura oficial de pastas existe.
- Cliente HTTP base esta configurado.
- `.env.example` do frontend existe com `VITE_API_URL`.
- Tela de login renderiza.
- Tela de cadastro renderiza.
- Login salva token JWT.
- Cadastro redireciona para login.
- Rota protegida bloqueia usuario sem token.
- Logout remove token local.
- Testes passando.
- `alembic check` sem diferencas pendentes.

## 20. Fora Do MVP

- Open Finance.
- Importacao automatica de extratos.
- OCR de comprovantes.
- Contas compartilhadas.
- Assinaturas pagas.
- Notificacoes push/email.
- Recorrencia avancada.
- Parcelamento.
- Cartao de credito completo.
- Metas complexas.
- Relatorios PDF.
- App mobile nativo.
- Offline sync.
- IA executando acoes financeiras.
- Recomendacoes de investimento personalizadas.
- Integracao contabil ou fiscal.

## 21. Descricao Para Portfolio

Sistema web de gestao financeira pessoal desenvolvido com FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT, React, TypeScript e TailwindCSS.

O projeto possui autenticacao de usuarios, isolamento de dados por usuario, controle de contas, categorias, transacoes, orcamentos mensais, dashboard financeiro com dados agregados e assistente financeiro com fallback por regras.

A arquitetura foi organizada em camadas, separando rotas, regras de negocio, acesso a dados, models e schemas, com foco em seguranca, consistencia financeira e evolucao futura.

## 22. Melhorias E Atualizacoes Do Sistema

Este topico registra melhorias futuras apos o fechamento do MVP. Nenhum item abaixo deve ser tratado como bug bloqueante do MVP, mas como evolucao planejada para aumentar seguranca, qualidade, usabilidade e maturidade operacional.

### Prioridade Alta

- Substituir armazenamento de JWT em `localStorage` por estrategia mais segura, preferencialmente cookies `HttpOnly`, `Secure` e `SameSite`.
- Implementar refresh token com rotacao, expiracao, revogacao e documentacao de sessao.
- Criar autorizacao por perfil com `role=user|admin` no backend, usando dependencia/middleware para bloquear rotas administrativas.
- Criar rota protegida `/api/v1/admin` exclusiva para usuarios com `role=admin`.
- Criar painel frontend `/admin` protegido, impedindo acesso de usuarios comuns tambem no roteamento do frontend.
- Criar listagem administrativa de usuarios com `id`, `name`, `email` e `created_at`, sem expor `password_hash` ou dados financeiros.
- Registrar `last_login_at` no usuario a cada login bem-sucedido para auditoria basica.
- Criar testes frontend automatizados para login, dashboard, contas, categorias, transacoes, orcamentos e assistente.
- Criar testes end-to-end para o fluxo real do usuario: cadastro, login, conta, categoria, transacao, dashboard, orcamento e assistente.
- Adicionar pipeline de CI para rodar `pytest`, `alembic check`, `npm run typecheck`, `npm run build` e `npm audit`.
- Otimizar bundle frontend com code splitting por rota, principalmente por causa de Recharts e telas autenticadas.
- Adicionar rate limit nas rotas sensiveis: login, cadastro e assistente.
- Melhorar observabilidade do backend com logs estruturados sem dados sensiveis.
- Criar checklist automatizado de pos-deploy para Render, Neon e Vercel.

### Painel Administrativo

Ordem recomendada de implementacao:

1. Atualizar model, schema e migration de `users` com `role` e `last_login_at`, se ainda nao existirem no banco.
2. Atualizar login para registrar `last_login_at` somente em autenticacao bem-sucedida.
3. Criar dependencia de backend para exigir usuario autenticado com `role=admin`.
4. Criar endpoints administrativos sob `/api/v1/admin`.
5. Implementar metricas gerais: total de usuarios cadastrados e novos registros no mes atual.
6. Implementar listagem de usuarios com dados minimos: `id`, `name`, `email` e `created_at`.
7. Criar rota frontend `/admin` protegida por autenticacao e permissao de admin.
8. Adicionar bloqueio visual e redirecionamento para usuarios comuns.
9. Criar testes de backend para garantir que usuarios comuns recebam `403 Forbidden`.
10. Criar testes frontend para validar que usuario comum nao visualiza o painel admin.

Regras obrigatorias:

- Rotas administrativas devem retornar `403 Forbidden` para usuario autenticado sem permissao.
- Usuario nao autenticado deve receber `401 Unauthorized`.
- O frontend pode bloquear navegacao por experiencia de uso, mas a protecao real deve permanecer no backend.
- O painel admin nao deve exibir saldos, transacoes, categorias, contas ou dados financeiros individuais de outros usuarios.
- Metricas administrativas devem ser agregadas e nao devem quebrar isolamento financeiro por usuario.
- Logs de auditoria devem registrar horario do ultimo login sem salvar senha, token JWT ou dados sensiveis.
- A role `admin` nao deve ser atribuida por rota publica de cadastro.
- A criacao do primeiro admin deve ser feita por seed, script controlado ou ajuste manual seguro no banco.

### Prioridade Media

- Integrar provedor externo de IA atras de service/provider isolado, mantendo `AI_PROVIDER=rules` como fallback.
- Criar politica de minimizacao de contexto para IA externa, evitando envio de dados brutos quando agregados forem suficientes.
- Adicionar tela de perfil do usuario com troca de senha.
- Adicionar recuperacao de senha por email.
- Criar filtros avancados em transacoes por periodo, conta, categoria, tipo e valor.
- Adicionar paginacao real nas tabelas do frontend.
- Melhorar confirmacoes destrutivas com modal proprio no lugar de `window.confirm`.
- Criar componentes reutilizaveis de formulario, tabela, estado vazio, erro e confirmacao.
- Adicionar exportacao CSV simples para transacoes.
- Adicionar seed opcional de categorias padrao por usuario.
- Criar documentacao de arquitetura separada para backend, frontend, banco, seguranca e IA.

### Prioridade Baixa

- Adicionar temas visuais ou modo escuro.
- Criar relatorios PDF.
- Adicionar metas financeiras simples.
- Adicionar transacoes recorrentes.
- Adicionar parcelamento basico.
- Melhorar onboarding inicial do usuario apos cadastro.
- Adicionar notificacoes internas para orcamentos acima do limite.
- Criar painel de saude operacional com status de API, banco e ultima migration.
- Adicionar internacionalizacao futura, mantendo portugues como idioma principal.

### Atualizacoes Tecnicas Recomendadas

- Revisar periodicamente versoes de FastAPI, Starlette, SQLAlchemy, Alembic, Vite, React, TypeScript, TailwindCSS e Recharts.
- Manter Python 3.12 como versao oficial ate validacao completa de compatibilidade com versoes futuras.
- Rodar `npm audit --audit-level=moderate` antes de cada deploy frontend.
- Rodar `python -m alembic check` antes de cada deploy backend.
- Rodar `python -m pytest` antes de aplicar migrations em producao.
- Atualizar `.env.example` sempre que uma nova variavel de ambiente for criada.
- Atualizar este planejamento sempre que uma fase nova for concluida ou uma decisao estrutural mudar.

### Itens Fora Do Escopo Atual

- Open Finance.
- OCR de comprovantes.
- App mobile nativo.
- Assinaturas pagas.
- Recomendacoes de investimento personalizadas.
- IA executando acoes financeiras automaticamente.
- Integracao contabil ou fiscal.
