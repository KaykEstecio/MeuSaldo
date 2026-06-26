# Backend MeuSaldo

Backend inicial do MeuSaldo usando Python 3.12, FastAPI, PostgreSQL, SQLAlchemy e Alembic.

## Escopo Da Fase 6

Esta fase configura a base da API, autenticacao inicial e CRUD de contas:

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
- Testes de integracao da autenticacao e contas
- Estrutura inicial de pastas

CRUD de categorias, transacoes, dashboard, orcamentos, frontend e IA ainda nao foram implementados.

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

Nesta fase existe apenas a migration inicial dos models base. Novas alteracoes de schema devem gerar novas migrations.

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

## Testes

Rodar todos os testes:

```bash
pytest
```
