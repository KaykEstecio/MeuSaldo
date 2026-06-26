# Planejamento Tecnico Oficial - MeuSaldo

## 1. Visao Geral

O MeuSaldo e um sistema web de controle financeiro pessoal com autenticacao por usuario, controle de contas, categorias, transacoes, orcamentos, dashboards e, futuramente, um assistente de IA financeira.

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

- Modulo futuro integrado por API externa
- Fallback baseado em regras
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

Entidade futura:

- `ai_messages`

`ai_messages` fica planejada para a fase de IA e nao deve ser prioridade antes da implementacao do assistente.

## 8. Modelagem Inicial

### users

Campos minimos:

- `id`
- `name`
- `email`
- `password_hash`
- `is_active`
- `created_at`
- `updated_at`

Regras:

- `email` deve ser unico.
- Senha nunca deve ser salva em texto puro.
- A API nunca deve retornar `password_hash`.

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

Campos planejados:

- `id`
- `user_id`
- `category_id`
- `month`
- `year`
- `limit_amount`
- `created_at`
- `updated_at`

Regras futuras:

- Orcamento pertence a um usuario.
- Orcamento deve ser vinculado a categoria de despesa.
- Orcamento deve ser por mes, ano e categoria.

### ai_messages

Campos futuros:

- `id`
- `user_id`
- `role`
- `content`
- `created_at`

Regras futuras:

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
12. Orcamentos mensais.
13. Setup frontend.
14. Telas de autenticacao.
15. Dashboard frontend.
16. Telas de contas, categorias e transacoes.
17. Tela de orcamentos.
18. Assistente IA com fallback por regras.
19. Refinamento, seguranca e documentacao.

## 12. Status Atual Do Projeto

Status atual:

```txt
Fase 11 - Dashboard backend concluido
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
- Testes de integracao para autenticacao, contas e categorias.
- Testes de integracao para transacoes e regras principais de saldo.
- Testes de integracao para dashboard.

Ainda nao foram implementados:

- Orcamentos.
- Frontend.
- IA.

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

## 14. Comandos Oficiais Do Backend

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

## 15. Criterio Para Avancar Para Orcamentos Mensais

Antes da fase de orcamentos mensais, validar:

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
- Testes passando.
- `alembic check` sem diferencas pendentes.

## 16. Fora Do MVP

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

## 17. Descricao Para Portfolio

Sistema web de gestao financeira pessoal desenvolvido com FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT, React, TypeScript e TailwindCSS.

O projeto possui autenticacao de usuarios, isolamento de dados por usuario, controle de contas, categorias, transacoes, orcamentos mensais, dashboard financeiro com dados agregados e assistente financeiro com fallback por regras.

A arquitetura foi organizada em camadas, separando rotas, regras de negocio, acesso a dados, models e schemas, com foco em seguranca, consistencia financeira e evolucao futura.
