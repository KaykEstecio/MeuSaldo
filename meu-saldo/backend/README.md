# Backend MeuSaldo

Backend inicial do MeuSaldo usando FastAPI.

## Escopo Da Fase 2

Esta fase configura apenas a base da API:

- Aplicacao FastAPI
- CORS
- Rota `GET /health`
- Estrutura inicial de pastas

Banco de dados, autenticacao, models reais, frontend e IA ainda nao foram implementados.

## Como Rodar Localmente

Crie e ative um ambiente virtual:

```bash
python -m venv .venv
.venv\Scripts\activate
```

Instale as dependencias:

```bash
pip install -r requirements.txt
```

Copie o arquivo de ambiente:

```bash
copy .env.example .env
```

Inicie a API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
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
