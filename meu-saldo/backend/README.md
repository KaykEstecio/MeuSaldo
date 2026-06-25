# Backend MeuSaldo

Backend inicial do MeuSaldo usando FastAPI, PostgreSQL, SQLAlchemy e Alembic.

## Escopo Da Fase 4

Esta fase configura apenas a base da API:

- Aplicacao FastAPI
- CORS
- Rota `GET /health`
- Rota `GET /health/db`
- Configuracao de conexao com PostgreSQL
- Base SQLAlchemy
- Alembic configurado com migration inicial
- Models base: `users`, `accounts`, `categories` e `transactions`
- Estrutura inicial de pastas

Autenticacao, endpoints de CRUD, services financeiros, frontend e IA ainda nao foram implementados.

## Como Rodar Localmente

Crie o ambiente virtual:

```bash
python -m venv venv
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
