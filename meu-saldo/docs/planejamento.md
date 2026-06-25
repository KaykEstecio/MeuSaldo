# Planejamento Tecnico Inicial Do MeuSaldo

## Visao Geral

O MeuSaldo sera um sistema web de controle financeiro pessoal com autenticacao por usuario, organizacao de contas, categorias, transacoes, orcamentos, dashboards e um assistente de IA financeira.

O MVP deve priorizar seguranca, isolamento por usuario, rastreabilidade, clareza dos dados financeiros e arquitetura simples de evoluir.

## Stack Oficial

- Backend: Python com FastAPI
- Banco: PostgreSQL
- ORM: SQLAlchemy
- Migrations: Alembic
- Autenticacao: JWT
- Frontend: React com TypeScript
- Estilizacao: TailwindCSS
- Graficos: Recharts
- IA: modulo futuro integrado por API externa, com fallback baseado em regras

## Estrutura Oficial Planejada

```txt
meu-saldo/
  backend/
  frontend/
  docs/
```

## Backend Planejado

O backend sera organizado com FastAPI em camadas:

- `app/api/v1/` para rotas
- `app/services/` para regras de negocio
- `app/repositories/` para acesso a dados
- `app/models/` para models SQLAlchemy
- `app/schemas/` para schemas Pydantic
- `app/core/` para configuracao, seguranca, banco e excecoes
- `alembic/` para migrations

## Frontend Planejado

O frontend sera organizado com React e TypeScript:

- `src/api/` para clientes da API
- `src/features/` para funcionalidades por dominio
- `src/components/` para componentes reutilizaveis
- `src/hooks/` para hooks
- `src/lib/` para formatadores, validadores e constantes
- `src/types/` para tipos compartilhados
- `src/styles/` para estilos globais

## Padroes Da API

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

## Entidades Do MVP

- `users`
- `accounts`
- `categories`
- `transactions`
- `budgets`
- `ai_messages`

## Regras Principais

- Cada usuario acessa apenas seus proprios dados.
- Toda entidade financeira deve ter isolamento por `user_id`.
- Valores monetarios devem usar `Decimal`, nunca `float`.
- Receitas aumentam saldo.
- Despesas reduzem saldo.
- Alterar ou remover transacoes deve recalcular impacto no saldo.
- Dashboard deve usar dados agregados no backend.
- IA deve receber apenas dados minimos, preferencialmente agregados.
- O fallback por regras deve funcionar sem provedor externo de IA.

## Ordem De Implementacao

1. Setup backend, configuracao, PostgreSQL e Alembic.
2. Models base: users, accounts, categories e transactions.
3. Autenticacao JWT: register, login e usuario atual.
4. CRUD de contas.
5. CRUD de categorias.
6. CRUD de transacoes com atualizacao de saldo.
7. Dashboard com resumo, fluxo mensal e gastos por categoria.
8. Orcamentos mensais.
9. Setup frontend com rotas, layout e API client.
10. Telas de autenticacao.
11. Dashboard frontend.
12. Telas de contas, categorias e transacoes.
13. Tela de orcamentos.
14. Assistente IA com fallback por regras.
15. Testes, refinamento, seguranca e documentacao.

## Fora Do MVP

- Open Finance
- Importacao automatica de extratos
- OCR de comprovantes
- Contas compartilhadas
- Assinaturas pagas
- Notificacoes push/email
- Recorrencia avancada
- Parcelamento
- Metas complexas
- Relatorios PDF
- App mobile nativo
- Offline sync
- IA executando acoes financeiras
- Recomendacoes de investimento personalizadas
- Integracao contabil ou fiscal

## Status Da Etapa Atual

Etapa 1: criar estrutura inicial do repositorio.

Nesta etapa nao devem ser implementados backend, frontend, banco, migrations ou funcionalidades.

