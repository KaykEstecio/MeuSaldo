# Planejamento De Evolucao Do MeuSaldo Com Benchmark No Pierre IA

## 1. Objetivo

Evoluir o MeuSaldo de um controle financeiro manual com assistente para uma plataforma financeira orientada por IA, usando como benchmark publico o aplicativo **Pierre: Controle de gastos IA**, da CloudWalk.

O objetivo nao e copiar identidade, textos ou implementacao do Pierre. O benchmark serve para identificar expectativas do mercado:

- centralizacao de contas e cartoes;
- importacao automatica de transacoes;
- categorizacao inteligente;
- conversa em linguagem natural sobre os dados;
- orcamentos, alertas e projecoes;
- experiencia simples, segura e predominantemente automatizada.

Fontes publicas consultadas:

- [Pierre na App Store](https://apps.apple.com/br/app/pierre-controle-de-gastos-ia/id6749781755)
- [Pierre no Google Play](https://play.google.com/store/apps/details?id=io.cloudwalk.pierre)

## 2. Posicionamento Proposto

### Promessa Do Produto

> O MeuSaldo organiza sua vida financeira automaticamente, explica o que esta acontecendo e ajuda voce a planejar os proximos meses.

### Diferenciacao

O MeuSaldo deve evitar competir apenas por paridade de funcionalidades. A principal diferenciacao sera combinar:

1. aplicacao web completa e responsiva;
2. planejamento de receitas e despesas futuras;
3. simulacao de cenarios antes de tomar decisoes;
4. explicacoes rastreaveis, mostrando quais dados sustentam cada insight;
5. controle manual preservado para quem nao quiser conectar bancos;
6. IA somente consultiva, sem movimentar dinheiro.

## 3. Situacao Atual Do MeuSaldo

### Capacidades Ja Disponiveis

- cadastro e autenticacao por usuario;
- contas financeiras;
- categorias;
- receitas e despesas;
- orcamentos mensais;
- dashboard agregado;
- assistente financeiro integrado a OpenAI com fallback por regras;
- access token em memoria e refresh token em cookie `HttpOnly`;
- testes backend, frontend e E2E;
- deploy separado entre Render e Vercel.

### Lacunas Em Relacao Ao Benchmark

| Area | MeuSaldo atual | Estado desejado |
|---|---|---|
| Entrada de dados | Manual | Manual, arquivo e Open Finance |
| Cartoes | Tratados como conta generica | Cartao, fatura, limite e parcelas |
| Categorizacao | Escolha manual | Sugestao automatica com revisao |
| Assistente | Perguntas isoladas | Conversa contextual e explicavel |
| Insights | Sob demanda | Proativos, priorizados e acionaveis |
| Planejamento | Orcamento mensal | Receitas, despesas e saldo previstos |
| Metas | Nao disponivel | Metas com prazo e acompanhamento |
| Alertas | Nao disponivel | Alertas configuraveis e nao invasivos |
| Integracoes | Nao disponivel | Importacao de arquivos e Open Finance |
| Mobile | Web responsiva | PWA instalavel e, depois, app nativo |

## 4. Principios Do Produto

1. **Confiabilidade antes de automacao:** qualquer classificacao feita por IA deve poder ser revisada.
2. **Consentimento explicito:** dados financeiros so podem ser importados com autorizacao clara e revogavel.
3. **IA explicavel:** insights devem indicar periodo, contas e categorias utilizados.
4. **Sem execucao financeira:** a IA nao realiza transferencias, pagamentos ou investimentos.
5. **Degradacao segura:** se IA ou integracao externa falhar, o controle manual continua funcionando.
6. **Privacidade por padrao:** enviar ao modelo apenas dados agregados ou estritamente necessarios.
7. **Web como vantagem:** entregar uma experiencia excelente em computador antes de investir em aplicativo nativo.

## 5. Roadmap Recomendado

### Estado Da Execucao Em 22/07/2026

| Fase | Estado | Resultado entregue |
|---|---|---|
| Fase 0 | Parcial | Benchmark, proposta de valor, lacunas e metricas documentados; entrevistas com usuarios ainda dependem de validacao de produto. |
| Fase 1 | Concluida | Contexto curto de conversa, observabilidade segura, limite mensal, fallback identificado, sugestoes e feedback por resposta. |
| Fase 2 | Concluida | Entrada da IA no dashboard, periodos em linguagem natural, resumos semanal/mensal e cartoes rastreaveis com atalhos para os dados. |
| Fase 3 | Concluida | Importacao CSV/OFX com previa, deduplicacao transacional, revisao de categorias, aprendizado pelo historico e auditoria. |
| Fase 4 | Proxima | Cartoes, faturas, recorrencias e projecao de saldo futuro. |

### Fase 0 — Descoberta E Definicao De Metricas

Duracao estimada: 1 semana.

Entregas:

- definir publico principal e problema prioritario;
- entrevistar de 5 a 10 usuarios de controle financeiro;
- mapear jornada desde cadastro ate primeiro insight util;
- definir eventos de produto e funil;
- documentar limites legais da comunicacao financeira.

Criterio de aceite:

- publico, proposta de valor e metricas aprovados antes de ampliar o codigo.

### Fase 1 — IA Confiavel Em Producao

Duracao estimada: 1 a 2 semanas.

Prioridade: imediata.

Entregas:

- validar faturamento e disponibilidade do provedor OpenAI;
- registrar codigo de erro seguro quando houver fallback;
- medir latencia, sucesso, fallback e custo por resposta;
- preservar contexto das ultimas mensagens da conversa;
- adicionar respostas sugeridas e perguntas iniciais;
- exibir quando a resposta veio da IA externa ou do modo por regras;
- criar limite mensal de custo e alerta operacional.

Criterios de aceite:

- taxa de sucesso do provedor acima de 98% fora de indisponibilidades externas;
- nenhuma chave ou dado sensivel nos logs;
- fallback claramente identificado para o usuario;
- respostas sempre baseadas nos dados do usuario autenticado.

### Fase 2 — Experiencia IA Primeiro

Duracao estimada: 2 a 3 semanas.

Entregas:

- transformar o assistente em ponto central da experiencia;
- oferecer perguntas como “onde gastei mais?”, “quanto posso gastar?” e “como ficara meu saldo?”;
- criar cartoes de resposta com valores, categorias e atalhos para as telas relacionadas;
- permitir filtros de periodo por linguagem natural;
- gerar resumo semanal e mensal;
- permitir feedback positivo ou negativo em cada resposta;
- manter dashboard tradicional como modo analitico.

Criterios de aceite:

- perguntas financeiras principais respondidas com valores conferiveis;
- links da resposta levam aos dados que originaram o insight;
- nenhuma alucinacao de transacoes, saldos ou categorias.

### Fase 3 — Importacao E Categorizacao Inteligente

Duracao estimada: 3 a 4 semanas.

Entregas:

- importacao de CSV e OFX;
- pre-visualizacao antes de confirmar importacao;
- deteccao de duplicidades por data, valor, conta e descricao;
- normalizacao de nomes de estabelecimentos;
- sugestao automatica de categoria;
- caixa de revisao para itens com baixa confianca;
- aprendizado por usuario a partir das correcoes realizadas;
- trilha de auditoria de importacoes e alteracoes.

Criterios de aceite:

- reimportar o mesmo arquivo nao duplica transacoes;
- usuario confirma ou corrige sugestoes antes da consolidacao;
- precisao de categorizacao medida e acompanhada.

### Fase 4 — Cartoes, Recorrencias E Planejamento Futuro

Duracao estimada: 3 a 4 semanas.

Esta fase sera um diferencial importante em relacao ao benchmark.

Entregas:

- entidade propria para cartoes de credito;
- fechamento, vencimento, limite e fatura;
- compras parceladas e parcelas futuras;
- deteccao e cadastro de receitas e despesas recorrentes;
- receitas e despesas previstas;
- calendario financeiro mensal;
- projecao de saldo para 30, 60 e 90 dias;
- simulacao “se eu gastar X, como termina o mes?”.

Criterios de aceite:

- faturas e parcelas nao alteram o saldo duas vezes;
- previsoes distinguem valores realizados e previstos;
- usuario consegue identificar risco de saldo negativo antecipadamente.

### Fase 5 — Open Finance

Duracao estimada: 6 a 10 semanas, dependendo do fornecedor e da homologacao.

Pre-requisito: contratar um provedor regulado ou parceiro de Open Finance. Nao implementar conexao bancaria direta sem avaliar requisitos regulatorios, seguranca e LGPD.

Entregas:

- selecao de agregador autorizado;
- fluxo de consentimento e revogacao;
- conexao de instituicoes e contas;
- sincronizacao assincrona por jobs e webhooks;
- controle de cursor e sincronizacao incremental;
- reconciliacao e deduplicacao com dados manuais/importados;
- painel de status das conexoes;
- politica de retencao e exclusao de dados;
- plano de resposta a incidentes.

Criterios de aceite:

- consentimento rastreavel e revogavel;
- falha em um banco nao bloqueia as demais contas;
- nenhuma credencial bancaria e armazenada pelo MeuSaldo;
- sincronizacao idempotente e auditavel.

### Fase 6 — Insights Proativos, Metas E Alertas

Duracao estimada: 3 a 4 semanas.

Entregas:

- metas financeiras com valor e prazo;
- acompanhamento de progresso;
- deteccao de aumento atipico de gastos;
- alertas de limite, fatura e saldo projetado;
- comparacao entre meses;
- sugestoes priorizadas por impacto financeiro;
- preferencias de frequencia e canal;
- centro de notificacoes dentro do sistema.

Criterios de aceite:

- cada alerta explica o motivo e permite ser desativado;
- notificacoes repetidas sao agrupadas;
- nenhuma notificacao usa linguagem alarmista ou promete resultado.

### Fase 7 — PWA E Experiencia Mobile

Duracao estimada: 2 a 4 semanas.

Entregas:

- PWA instalavel;
- navegacao inferior para telas principais;
- captura rapida de despesa;
- carregamento otimizado em rede movel;
- notificacoes push, apos consentimento;
- acessibilidade e testes em aparelhos reais;
- avaliacao posterior de React Native apenas se uso justificar.

Criterios de aceite:

- principais fluxos funcionam em telas pequenas;
- instalacao e atualizacao da PWA sao confiaveis;
- desempenho mobile acompanhado por Web Vitals.

### Fase 8 — Monetizacao E Escala

Duracao estimada: 3 a 5 semanas.

Entregas:

- plano gratuito com controle manual e recursos essenciais;
- plano premium com sincronizacao, IA ampliada, projecoes e alertas;
- limites de uso claros;
- cobranca recorrente e portal do cliente;
- painel de custos por usuario;
- exclusao de conta e exportacao de dados;
- suporte e termos de uso atualizados.

Criterios de aceite:

- cobranca idempotente e testada;
- usuario entende o que esta incluido em cada plano;
- custo medio de IA e integracoes cabe na margem do plano.

## 6. Ordem De Prioridade

### Agora

1. estabilizar a OpenAI em producao;
2. adicionar observabilidade de erros e custos;
3. melhorar conversa contextual e explicabilidade;
4. importar CSV/OFX com deduplicacao;
5. implementar planejamento futuro.

### Depois

1. cartoes e recorrencias;
2. metas e alertas;
3. PWA;
4. Open Finance com parceiro regulado;
5. monetizacao.

### Nao Fazer Agora

- aplicativo nativo antes de validar uso da PWA;
- transferencias ou pagamentos iniciados pela IA;
- recomendacoes especificas de investimento;
- Open Finance desenvolvido sem parceiro e analise regulatoria;
- automacoes irreversiveis baseadas somente na resposta do modelo.

## 7. Evolucao Tecnica Necessaria

### Backend

- criar interface de provedores de IA para troca de modelo sem alterar regras de negocio;
- adicionar fila de jobs para importacao, sincronizacao e insights;
- armazenar conversas e feedback com politica de retencao;
- introduzir modelos para cartoes, faturas, parcelas, recorrencias, metas, conexoes e sincronizacoes;
- adicionar idempotency keys para importacoes e webhooks;
- implementar trilha de auditoria;
- separar metricas operacionais de dados financeiros.

### Frontend

- criar design system consistente;
- tornar componentes responsivos e acessiveis;
- adotar estados claros para sincronizando, desatualizado e com erro;
- criar central de revisao de transacoes importadas;
- exibir fontes dos insights;
- preparar manifest, service worker e estrategia de cache da PWA.

### Infraestrutura

- ambiente de staging separado;
- banco de staging sem dados reais;
- monitoramento de erros e latencia;
- backups testados;
- fila e worker separados do servidor HTTP;
- secrets apenas no provedor de deploy;
- verificacao pos-deploy automatizada.

## 8. Seguranca E LGPD

Antes de Open Finance ou monetizacao, concluir:

- inventario de dados pessoais e finalidade de uso;
- base legal e registro de consentimentos;
- politica de privacidade atualizada;
- exportacao, correcao e exclusao de dados;
- criptografia em transito e em repouso;
- rotacao de secrets;
- controle de acesso administrativo;
- auditoria de acessos sensiveis;
- avaliacao de fornecedores de IA, pagamentos e Open Finance;
- procedimento de incidente e comunicacao.

## 9. Metricas De Sucesso

### Ativacao

- percentual que cadastra ou importa a primeira transacao;
- tempo ate o primeiro insight util;
- percentual que cria o primeiro planejamento.

### Engajamento

- usuarios ativos semanais e mensais;
- perguntas ao assistente por usuario ativo;
- percentual de insights abertos;
- retorno semanal ao aplicativo.

### Qualidade

- precisao da categorizacao;
- taxa de correcao manual;
- taxa de fallback da IA;
- respostas avaliadas positivamente;
- sincronizacoes bem-sucedidas;
- duplicidades por mil transacoes.

### Negocio

- conversao para premium;
- cancelamento mensal;
- custo de IA e integracoes por usuario;
- margem por plano;
- retencao em 30, 60 e 90 dias.

## 10. Cronograma Indicativo

Sem Open Finance, as Fases 0 a 4 podem formar uma nova versao relevante em aproximadamente 10 a 14 semanas.

Com Open Finance, PWA, alertas e monetizacao, o programa completo deve ser tratado como uma evolucao de 6 a 9 meses, com entregas incrementais a cada fase.

## 11. Proxima Entrega Recomendada

Iniciar a Fase 4 com uma base financeira que diferencie claramente saldo, cartao e valores futuros:

1. criar entidades de cartao, fatura e parcela;
2. impedir dupla contabilizacao entre compra e pagamento de fatura;
3. identificar recorrencias com confirmacao do usuario;
4. separar valores realizados e previstos;
5. projetar saldo para 30, 60 e 90 dias;
6. permitir simulacoes antes de registrar uma decisao financeira.
