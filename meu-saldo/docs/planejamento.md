# Planejamento Técnico Inicial — MeuSaldo

## 1. Visão Geral

O **MeuSaldo** será um sistema web de controle financeiro pessoal com autenticação por usuário, organização de contas, categorias, transações, orçamentos, dashboards e, futuramente, um assistente de IA financeira.

O MVP deve priorizar:

* segurança;
* isolamento de dados por usuário;
* consistência dos dados financeiros;
* rastreabilidade;
* arquitetura simples de evoluir;
* documentação clara;
* facilidade de apresentação em portfólio.

O sistema deve ser tratado como um produto financeiro pessoal, não apenas como um CRUD de estudos.

---

## 2. Stack Oficial

### Backend

* Python 3.12
* FastAPI
* PostgreSQL
* SQLAlchemy
* Alembic
* JWT
* Pydantic
* Docker

### Frontend

* React
* TypeScript
* TailwindCSS
* Recharts

### IA

* Módulo futuro integrado por API externa
* Fallback baseado em regras
* IA sem permissão para executar ações financeiras diretamente

---

## 3. Estrutura Oficial Do Projeto

```txt
meu-saldo/
  backend/
  frontend/
  docs/
```

---

## 4. Estrutura Planejada Do Backend

O backend será organizado em camadas:

```txt
backend/
  app/
    api/
      v1/
        routes/
    core/
    models/
    schemas/
    services/
    repositories/
    db/
  alembic/
  tests/
```

### Responsabilidade das camadas

* `api/v1/routes/`: definição das rotas HTTP.
* `services/`: regras de negócio.
* `repositories/`: acesso ao banco de dados.
* `models/`: models SQLAlchemy.
* `schemas/`: schemas Pydantic.
* `core/`: configurações, segurança, exceções, JWT e variáveis de ambiente.
* `db/`: sessão de banco e configuração do SQLAlchemy.
* `alembic/`: migrations.
* `tests/`: testes automatizados.

As rotas não devem conter regra de negócio pesada. A regra deve ficar nos services.

---

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

### Responsabilidade das pastas

* `api/`: clientes HTTP e configuração da comunicação com backend.
* `features/`: funcionalidades por domínio.
* `components/`: componentes reutilizáveis.
* `hooks/`: hooks customizados.
* `lib/`: formatadores, validadores e constantes.
* `types/`: tipos compartilhados.
* `styles/`: estilos globais.

---

## 6. Padrões Da API

### Prefixo oficial

```txt
/api/v1
```

### Resposta de sucesso

```json
{
  "data": {},
  "message": "Operacao realizada com sucesso"
}
```

### Resposta com lista

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

### Resposta de erro

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Recurso nao encontrado",
    "details": {}
  }
}
```

---

## 7. Entidades Do MVP

### Entidades principais

* `users`
* `accounts`
* `categories`
* `transactions`
* `budgets`

### Entidade futura

* `ai_messages`

A entidade `ai_messages` ficará planejada para a fase de IA, mas não deve ser prioridade nas primeiras migrations se ainda não houver implementação do assistente.

---

## 8. Modelagem Inicial Das Entidades

### 8.1. users

Campos mínimos:

```txt
id
name
email
password_hash
created_at
updated_at
```

Regras:

* `email` deve ser único.
* Senha nunca deve ser salva em texto puro.
* A API nunca deve retornar `password_hash`.

---

### 8.2. accounts

Campos mínimos:

```txt
id
user_id
name
type
initial_balance
current_balance
is_active
created_at
updated_at
```

Tipos permitidos inicialmente:

```txt
checking
savings
cash
other
```

Observação:

* Conta do tipo `credit` não será incluída no MVP inicial, pois cartão de crédito envolve fatura, fechamento, vencimento, limite e regras específicas.

Regras principais:

* Toda conta pertence a um usuário.
* Um usuário só pode acessar suas próprias contas.
* `initial_balance` e `current_balance` devem usar `Decimal/Numeric`.
* Não usar `float` para valores monetários.
* `current_balance` não deve ser alterado livremente por qualquer rota.
* O saldo deve ser atualizado apenas por regras controladas no service de transações.
* Exclusão de conta deve ser feita por soft delete usando `is_active = false`.
* Contas inativas não devem aparecer nas listagens principais.
* Conta com transações não deve ser removida fisicamente do banco.

---

### 8.3. categories

Campos mínimos:

```txt
id
user_id
name
type
color
icon
is_default
is_active
created_at
updated_at
```

Tipos permitidos:

```txt
income
expense
```

Regras:

* Categoria pertence a um usuário.
* Categoria de receita só pode ser usada em transações de receita.
* Categoria de despesa só pode ser usada em transações de despesa.
* Categorias com transações não devem ser removidas fisicamente.
* Exclusão deve ser preferencialmente soft delete.
* Categorias padrão podem ser criadas automaticamente ao registrar usuário.

Categorias padrão sugeridas:

Receitas:

```txt
Salário
Freelance
Investimentos
Outros
```

Despesas:

```txt
Alimentação
Transporte
Moradia
Saúde
Lazer
Educação
Assinaturas
Outros
```

---

### 8.4. transactions

Campos mínimos:

```txt
id
user_id
account_id
category_id
type
amount
description
transaction_date
created_at
updated_at
```

Tipos permitidos:

```txt
income
expense
```

Regras:

* Toda transação pertence a um usuário.
* Toda transação deve estar vinculada a uma conta do mesmo usuário.
* Toda transação deve estar vinculada a uma categoria do mesmo usuário.
* O valor `amount` deve ser sempre positivo.
* O campo `type` define se a transação soma ou subtrai do saldo.
* Receita aumenta o saldo da conta.
* Despesa reduz o saldo da conta.
* Criar, editar ou remover transação deve atualizar o saldo da conta de forma consistente.
* A atualização do saldo deve acontecer dentro de uma transação atômica no banco.
* Um usuário nunca pode criar transação em conta ou categoria de outro usuário.

---

### 8.5. budgets

Campos mínimos:

```txt
id
user_id
category_id
month
year
limit_amount
created_at
updated_at
```

Regras:

* Orçamento pertence a um usuário.
* Orçamento deve ser vinculado a uma categoria de despesa.
* O orçamento será definido por mês, ano e categoria.
* O sistema deve permitir comparar limite planejado vs gasto realizado.

---

### 8.6. ai_messages

Campos futuros:

```txt
id
user_id
role
content
created_at
```

Regras futuras:

* A IA deve receber preferencialmente dados agregados.
* A IA não deve receber dados sensíveis desnecessários.
* O fallback por regras deve funcionar sem provedor externo.
* A IA não deve executar ações financeiras diretamente, apenas sugerir análises.

---

## 9. Regras Globais Do Sistema

* Cada usuário acessa apenas seus próprios dados.
* Toda entidade financeira deve ter `user_id`.
* Toda busca sensível deve filtrar pelo `user_id` do usuário autenticado.
* Valores monetários devem usar `Decimal/Numeric`, nunca `float`.
* Senhas devem ser protegidas com hash.
* Autenticação deve usar JWT.
* Dados sensíveis não devem ser expostos nas respostas.
* Dashboard deve usar dados agregados no backend.
* O frontend não deve calcular regras financeiras críticas.
* Alterações em saldo devem ser centralizadas no backend.
* O sistema deve ter tratamento padronizado de erros.
* O sistema deve ser documentado por fase.

---

## 10. Decisão Técnica Sobre Saldo

O sistema usará dois campos na conta:

```txt
initial_balance
current_balance
```

### Regra

* `initial_balance` representa o saldo informado na criação da conta.
* `current_balance` representa o saldo atual calculado a partir das transações.
* `current_balance` não deve ser alterado diretamente pelo CRUD comum de contas.
* Alterações no saldo devem ocorrer apenas no service de transações.
* Ao criar uma conta, `current_balance` deve iniciar com o mesmo valor de `initial_balance`.

### Motivo da decisão

Essa abordagem melhora a performance das consultas e dashboards, mas exige controle rigoroso para evitar inconsistência.

Por isso, as operações de transação devem ser feitas de forma atômica.

---

## 11. Ordem De Implementação Atualizada

### Fase 1 — Setup Backend

Objetivo:

Configurar a base técnica do backend.

Entregas:

* FastAPI configurado.
* Estrutura de pastas criada.
* PostgreSQL via Docker.
* SQLAlchemy configurado.
* Alembic configurado.
* Variáveis de ambiente configuradas.
* Health check da API.

Status: concluída.

---

### Fase 2 — Models Base

Objetivo:

Criar os models iniciais do banco.

Entregas:

* Model `users`.
* Model `accounts`.
* Model `categories`.
* Model `transactions`.
* Primeira migration com Alembic.

Status: concluída.

---

### Fase 3 — Autenticação JWT

Objetivo:

Implementar autenticação segura.

Entregas:

* Registro de usuário.
* Login.
* Geração de token JWT.
* Rota de usuário atual.
* Hash de senha.
* Proteção de rotas autenticadas.

Status: concluída.

---

### Fase 4 — Revisão De Segurança Inicial

Objetivo:

Garantir que a autenticação e a estrutura base estão seguras antes dos dados financeiros.

Entregas:

* Revisar se senha não é retornada na API.
* Revisar configuração do JWT.
* Revisar variáveis sensíveis no `.env`.
* Revisar tratamento de erro.
* Revisar estrutura de services e repositories.

Status: concluída ou parcialmente concluída.

---

### Fase 5 — CRUD De Contas

Objetivo:

Criar o CRUD de contas do usuário autenticado.

Entregas:

* Criar conta.
* Listar contas do usuário logado.
* Buscar conta por ID.
* Atualizar conta.
* Desativar conta com soft delete.
* Validar `Decimal/Numeric`.
* Garantir isolamento por `user_id`.

Status: em andamento/concluída.

---

### Fase 6 — Revisão Técnica Do CRUD De Contas

Objetivo:

Revisar a implementação de contas antes de avançar para categorias e transações.

Essa fase é obrigatória porque contas serão base para transações, saldo e dashboard.

Checklist obrigatório:

```txt
[ ] Todas as rotas de contas exigem autenticação
[ ] Todas as buscas filtram pelo user_id do usuário logado
[ ] Usuário não consegue acessar conta de outro usuário
[ ] Usuário não consegue editar conta de outro usuário
[ ] Usuário não consegue desativar conta de outro usuário
[ ] Valores monetários usam Decimal/Numeric
[ ] Não existe uso de float para saldo
[ ] initial_balance e current_balance estão definidos corretamente
[ ] current_balance não é alterado livremente fora das regras previstas
[ ] Exclusão usa soft delete com is_active = false
[ ] Contas inativas não aparecem na listagem padrão
[ ] Erros seguem o padrão oficial da API
[ ] Schemas Pydantic validam nome, tipo e saldo
[ ] Estrutura api -> service -> repository está sendo respeitada
[ ] Existe teste ou validação manual para isolamento por usuário
```

Entregas:

* Revisão do código de contas.
* Correção de falhas de isolamento por usuário, se existirem.
* Ajuste para soft delete, se ainda não existir.
* Ajuste de validações monetárias.
* Registro no README ou docs do comportamento de contas.

Status: etapa atual.

---

### Fase 7 — CRUD De Categorias

Objetivo:

Criar categorias de receitas e despesas.

Entregas:

* Criar categoria.
* Listar categorias do usuário.
* Buscar categoria por ID.
* Atualizar categoria.
* Desativar categoria com soft delete.
* Separar categorias por tipo: `income` e `expense`.
* Criar categorias padrão para novos usuários, se definido.

Regras:

* Usuário só acessa suas categorias.
* Categoria de receita não deve ser usada em despesa.
* Categoria de despesa não deve ser usada em receita.
* Categoria com transações futuras não deve ser excluída fisicamente.

---

### Fase 8 — CRUD De Transações Com Atualização De Saldo

Objetivo:

Implementar o coração financeiro do sistema.

Entregas:

* Criar receita.
* Criar despesa.
* Listar transações.
* Filtrar por conta, categoria, tipo e período.
* Buscar transação por ID.
* Atualizar transação.
* Remover/desativar transação.
* Atualizar saldo da conta automaticamente.

Regras críticas:

* Transação deve pertencer ao usuário.
* Conta deve pertencer ao usuário.
* Categoria deve pertencer ao usuário.
* Valor deve ser positivo.
* Tipo da categoria deve bater com tipo da transação.
* Receita soma no saldo.
* Despesa subtrai do saldo.
* Edição de transação deve desfazer impacto antigo e aplicar impacto novo.
* Remoção deve desfazer impacto no saldo.
* Operação deve ser atômica.

---

### Fase 9 — Testes Básicos Do Backend Financeiro

Objetivo:

Garantir que as regras financeiras principais funcionam.

Testes mínimos:

```txt
[ ] Usuário A não acessa conta do usuário B
[ ] Usuário A não acessa categoria do usuário B
[ ] Usuário A não acessa transação do usuário B
[ ] Criar receita aumenta saldo
[ ] Criar despesa reduz saldo
[ ] Editar valor de receita recalcula saldo corretamente
[ ] Editar valor de despesa recalcula saldo corretamente
[ ] Excluir/desativar transação desfaz impacto no saldo
[ ] Categoria de despesa não pode ser usada em receita
[ ] Categoria de receita não pode ser usada em despesa
[ ] Valores monetários não usam float
```

---

### Fase 10 — Dashboard Backend

Objetivo:

Criar endpoints agregados para dashboard.

Entregas:

* Resumo mensal.
* Total de receitas.
* Total de despesas.
* Saldo do mês.
* Gastos por categoria.
* Fluxo mensal.
* Últimas transações.
* Comparativo por período.

Regras:

* O dashboard deve ser calculado no backend.
* O frontend apenas consome dados prontos.
* Consultas devem respeitar `user_id`.

---

### Fase 11 — Orçamentos Mensais

Objetivo:

Permitir controle de limite de gastos por categoria.

Entregas:

* Criar orçamento mensal.
* Listar orçamentos.
* Atualizar orçamento.
* Remover/desativar orçamento.
* Comparar limite planejado vs gasto real.
* Alertar categorias próximas ou acima do limite.

Regras:

* Orçamento deve ser vinculado a categoria de despesa.
* Orçamento deve ser por mês e ano.
* Usuário só acessa seus orçamentos.

---

### Fase 12 — Setup Frontend

Objetivo:

Criar a base visual e estrutural do frontend.

Entregas:

* React com TypeScript.
* TailwindCSS.
* Configuração de rotas.
* Layout base.
* API client.
* Controle de autenticação.
* Proteção de rotas privadas.

---

### Fase 13 — Telas De Autenticação

Objetivo:

Criar fluxo de login e cadastro.

Entregas:

* Tela de login.
* Tela de cadastro.
* Armazenamento seguro do token.
* Redirecionamento após login.
* Logout.
* Tratamento de erros.

---

### Fase 14 — Dashboard Frontend

Objetivo:

Criar a visão principal do usuário.

Entregas:

* Cards de resumo.
* Gráfico de receitas vs despesas.
* Gráfico de gastos por categoria.
* Listagem de últimas transações.
* Filtros por período.

---

### Fase 15 — Telas De Contas, Categorias E Transações

Objetivo:

Criar telas operacionais do sistema.

Entregas:

* Tela de contas.
* Tela de categorias.
* Tela de transações.
* Formulários.
* Edição.
* Desativação.
* Filtros.
* Feedback visual.

---

### Fase 16 — Tela De Orçamentos

Objetivo:

Permitir controle visual dos limites mensais.

Entregas:

* Listagem de orçamentos.
* Cadastro de orçamento.
* Edição de orçamento.
* Comparação planejado vs realizado.
* Indicador de limite ultrapassado.

---

### Fase 17 — Assistente IA Com Fallback Por Regras

Objetivo:

Adicionar análise financeira assistida.

Entregas:

* Endpoint de resumo financeiro.
* Fallback por regras.
* Integração futura com API externa de IA.
* Tela de assistente.
* Histórico simples, se necessário.

Regras:

* IA deve receber dados mínimos.
* Preferir dados agregados.
* IA não deve executar ações financeiras.
* IA não deve recomendar investimento personalizado.
* O sistema deve funcionar sem provedor externo.

Exemplos de respostas por regras:

```txt
Você gastou mais de 30% da sua renda com alimentação neste mês.
Suas despesas aumentaram em relação ao mês anterior.
Você ultrapassou o orçamento da categoria transporte.
Você economizou uma parte da sua renda este mês.
```

---

### Fase 18 — Refinamento, Segurança E Documentação

Objetivo:

Preparar o projeto para portfólio.

Entregas:

* README completo.
* Prints do sistema.
* Documentação das rotas.
* Documentação da modelagem.
* Documentação das decisões técnicas.
* Testes principais.
* Deploy backend.
* Deploy frontend.
* Ajustes de responsividade.
* Revisão de segurança.
* Atualização do portfólio.

---

## 12. Fora Do MVP

* Open Finance.
* Importação automática de extratos.
* OCR de comprovantes.
* Contas compartilhadas.
* Assinaturas pagas.
* Notificações push/email.
* Recorrência avançada.
* Parcelamento.
* Cartão de crédito completo.
* Metas complexas.
* Relatórios PDF.
* App mobile nativo.
* Offline sync.
* IA executando ações financeiras.
* Recomendações de investimento personalizadas.
* Integração contábil ou fiscal.

---

## 13. Status Atual Do Projeto

### Status declarado

O projeto está atualmente na:

```txt
Fase 6 — Revisão Técnica Do CRUD De Contas
```

Já foram configurados:

* backend FastAPI;
* PostgreSQL via Docker;
* SQLAlchemy;
* Alembic;
* models base `users`, `accounts`, `categories` e `transactions`;
* registro de usuário;
* login JWT;
* rota de usuário atual;
* CRUD de contas com isolamento por usuário.

Ainda não devem existir:

* CRUD de categorias;
* CRUD de transações;
* frontend;
* dashboard;
* orçamentos;
* IA.

---

## 14. Critério Para Avançar Da Fase 6 Para A Fase 7

A Fase 6 só pode ser considerada finalizada quando:

```txt
[ ] O CRUD de contas estiver funcional
[ ] O isolamento por usuário estiver validado
[ ] O soft delete estiver implementado
[ ] Os saldos estiverem usando Decimal/Numeric
[ ] current_balance não puder ser manipulado indevidamente
[ ] Os erros estiverem padronizados
[ ] As validações estiverem corretas
[ ] A estrutura em camadas estiver respeitada
[ ] Houver teste ou validação documentada
```

Se algum item falhar, a Fase 7 não deve começar.

---

## 15. Descrição Para Portfólio

Quando o projeto estiver finalizado, a descrição recomendada será:

```txt
Sistema web de gestão financeira pessoal desenvolvido com FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT, React, TypeScript e TailwindCSS.

O projeto possui autenticação de usuários, isolamento de dados por usuário, controle de contas, categorias, transações, orçamentos mensais, dashboard financeiro com dados agregados e assistente financeiro com fallback por regras.

A arquitetura foi organizada em camadas, separando rotas, regras de negócio, acesso a dados, models e schemas, com foco em segurança, consistência financeira e evolução futura.
```

---

## 16. Prompt Oficial Para Revisar A Fase 6

```txt
Atue como engenheiro backend sênior especializado em FastAPI, SQLAlchemy, PostgreSQL, Alembic e segurança de APIs financeiras.

Revise a Fase 6 do projeto MeuSaldo, que corresponde à revisão técnica do CRUD de contas.

Contexto do projeto:
- Backend em FastAPI
- Banco PostgreSQL
- ORM SQLAlchemy
- Migrations com Alembic
- Autenticação JWT implementada
- Cada usuário só pode acessar seus próprios dados
- Entidade accounts possui user_id
- Valores monetários devem usar Decimal/Numeric, nunca float
- O sistema é financeiro, então segurança, consistência e isolamento são prioridade

Verifique especificamente:

1. Se todas as rotas de contas exigem autenticação.
2. Se todas as operações de contas filtram pelo user_id do usuário logado.
3. Se não existe risco de um usuário acessar, editar ou desativar conta de outro usuário.
4. Se os campos initial_balance e current_balance estão implementados corretamente.
5. Se current_balance não pode ser alterado livremente por rotas indevidas.
6. Se os valores monetários usam Decimal no Python e Numeric no PostgreSQL.
7. Se não existe uso de float em regras financeiras.
8. Se a exclusão de contas usa soft delete com is_active = false.
9. Se contas inativas são ignoradas na listagem padrão.
10. Se os schemas Pydantic validam nome, tipo e saldo.
11. Se os erros seguem o padrão oficial da API.
12. Se a estrutura api -> service -> repository está sendo respeitada.
13. Se existe risco futuro ao atualizar saldo diretamente no CRUD de contas.
14. Se há testes ou validações para isolamento por usuário.
15. Se a implementação está pronta para servir de base para categorias e transações.

Não implemente CRUD de categorias.
Não implemente CRUD de transações.
Não implemente frontend.
Não avance de fase.

Apenas revise a Fase 6, corrija problemas pequenos e seguros se necessário, e entregue ao final:

- O que foi verificado
- O que foi corrigido
- Quais riscos foram encontrados
- Quais arquivos foram alterados
- Se a Fase 6 pode ser considerada concluída ou não
```
