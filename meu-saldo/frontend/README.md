# Frontend MeuSaldo

Frontend do MeuSaldo usando React, TypeScript, Vite, TailwindCSS e Recharts.

## Escopo Da Fase 13

Esta fase cria apenas a base tecnica do frontend:

- React com TypeScript
- Vite
- TailwindCSS
- Recharts instalado para fases de graficos
- React Router configurado
- Cliente HTTP base para API
- Estrutura oficial de pastas
- Layout tecnico minimo para validar o setup

Telas de autenticacao, dashboard, contas, categorias, transacoes, orcamentos e IA ainda nao foram implementadas.

## Como Rodar Localmente

Instale as dependencias:

```bash
npm install
```

Copie o arquivo de ambiente:

```bash
copy .env.example .env
```

Rode o frontend:

```bash
npm run dev
```

URL local:

```txt
http://localhost:5173
```

## Variaveis De Ambiente

```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Comandos

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
```
