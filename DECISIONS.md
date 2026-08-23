# Decisões

Uma seção por decisão estruturante, na ordem em que o README as lista, mais a resposta sobre
volume alto no fim.

## Organização do projeto

**Decisão:** monorepo com pnpm workspaces, três aplicações em `apps/` e o código compartilhado em
`packages/`, sem orquestrador de tarefas. O quality gate encadeia as etapas com `pnpm -r`.

**Alternativas consideradas:** Turborepo e repositórios separados por serviço.

**Por quê:** montei com Turborepo e removi depois de medir. `pnpm -r run` já executa em ordem
topológica, `--filter` é nativo do pnpm, e o que restava era cache de tarefa num gate que roda em
2,6s. Repositórios separados triplicariam o tooling e forçariam duplicar o contrato de evento ou
publicá-lo em npm. O limite conhecido: `pnpm -r` não expressa "build do pacote A antes do typecheck
do pacote B", então o gate roda build antes das checagens — mais grosseiro que o `dependsOn` do
Turborepo, e uma linha em vez de uma ferramenta.

## Modelagem de dados

**Decisão:** status como enum do Postgres, tipo de transferência como tabela de referência com id
fixado no seed, e valor monetário em `numeric(18,2)`.

**Alternativas consideradas:** ambos como tabela de referência, ou ambos como enum.

**Por quê:** status é regra, tipo é dado. O status tem conjunto fechado e máquina de estado, então o
enum dá exaustividade checada pelo compilador e recusa valor inválido no próprio banco; o tipo chega
como id numérico no contrato de entrada e cresce sem deploy. O id é fixo, sem autoincremento, para
`transferTypeId: 1` significar a mesma coisa em qualquer ambiente. `numeric` e nunca ponto
flutuante, porque o limite de 1000 decide aprovação e é na fronteira que o float falha.

## Formato dos eventos

**Decisão:** envelope versionado — `eventId`, `eventName`, `eventVersion`, `occurredAt`, `payload` —
em JSON, com o schema Zod em `packages/contracts` importado pelo produtor e pelo consumidor. Valor
monetário viaja como string decimal.

**Alternativas consideradas:** payload plano validado apenas no consumo, e Avro com schema registry.

**Por quê:** o enunciado exige consistência entre quem publica e quem consome; um schema
compartilhado transforma isso de acordo verbal em erro de compilação. O `eventId` sustenta toda a
idempotência do fluxo e, sem envelope, não teria onde morar. Avro seria a resposta de produção, mas
o `docker-compose` entregue não tem registry. A string decimal é o que impede o `numeric(18,2)` de
passar por ponto flutuante no trânsito entre os serviços.

## Tratamento de falha na mensageria

**Decisão:** outbox transacional na escrita, consumo idempotente por `eventId` e DLQ apenas para
falha definitiva.

**Alternativas consideradas:** publicar direto no Kafka depois do commit, com retry e um job de
reconciliação; transações do Kafka; e mandar toda falha para a DLQ depois de N tentativas.

**Por quê:** com publicação direta existe um instante em que a transação está commitada e o evento
não saiu — morrer ali deixa a transação pendente para sempre. O outbox elimina esse instante
gravando transação e evento no mesmo `COMMIT`. Transações do Kafka não abrangem o Postgres, então
resolvem o problema errado.

No consumo, Kafka entrega ao menos uma vez, então o `eventId` é registrado em `processed_event` na
mesma transação do efeito. Falha definitiva — payload inválido, transação inexistente, transição
proibida — vai para a DLQ e confirma o offset, para não travar a partição; falha transitória é
retentada e, se não ceder, relançada sem confirmar, porque banco fora não é problema da mensagem.

Duas coisas aqui vieram de teste, não de projeto: publicar dentro da transação de banco não
funciona, porque o retry interno do kafkajs estoura o timeout de 5s do `$transaction`; e conectar ao
broker em `onModuleInit` derrubava a subida da API. O furo assumido é observabilidade — health verde
com outbox crescendo é silencioso.

## Atualização do status na interface

**Decisão:** polling adaptativo do TanStack Query, ativo somente enquanto houver transação pendente
na tela e desligado quando não houver.

**Alternativas consideradas:** SSE e WebSocket.

**Por quê:** quem atualiza o status é o consumidor, que com mais de uma instância da API não é
necessariamente a instância onde o browser abriu a conexão — um SSE correto exigiria fanout, por
tópico dedicado ou `LISTEN/NOTIFY` do Postgres. A janela de pendência aqui é de segundos, então o
polling custa menos que esse fanout, e sem estado de conexão no servidor ele escala horizontalmente
de graça. WebSocket adiciona canal bidirecional que nada neste fluxo usa. Com muitas pendências
simultâneas, ou latência abaixo de um segundo importando, o SSE passa a valer.

O "adaptativo" é a parte que importa e está coberta por teste: o intervalo liga quando há pendente
na tela e desliga quando não há. Polling que não desliga é trabalho ocioso para sempre.

Os filtros e a página moram na URL, não em estado de componente. Link compartilhável, botão de
voltar e recarregar a página funcionam sem código extra.

## Estratégia de testes

**Decisão:** Vitest em todos os pacotes. Domínio puro em unidade, handlers de evento com dublês de
repositório e de produtor, e as telas com Testing Library e MSW.

**Alternativas consideradas:** e2e com Testcontainers subindo Postgres e Kafka reais, e Jest no
backend por ser o padrão do CLI do Nest.

**Por quê:** o e2e é a única prova automatizada do fluxo assíncrono ponta a ponta, e escolhi não
pagar o preço — subida lenta no CI e a maior fonte de intermitência da entrega. A contrapartida está
assumida: o fluxo assíncrono é verificado à mão, com roteiro no README, incluindo derrubar o Kafka e
rebobinar o offset do grupo para provar a idempotência. Vitest em tudo mantém uma configuração só;
Jest no backend traria duas ferramentas e dois relatórios para o gate costurar.

## Volume alto de escritas e leituras concorrentes

> A aplicação pode precisar lidar com um volume alto de escritas e leituras concorrentes. Como você
> abordaria esse requisito?

O que já está no código:

**A escrita não espera nada.** O `POST` faz um `INSERT` e responde; a avaliação acontece no tempo
dela. Nada de rede entra no caminho crítico da requisição.

**O dispatcher do outbox escala horizontalmente sem coordenação**, porque
`SELECT ... FOR UPDATE SKIP LOCKED` entrega lotes disjuntos a instâncias concorrentes. O passo
seguinte é tirá-lo do processo da API, para a publicação não disputar recursos com o tráfego HTTP.

**A partição por `transactionExternalId` é o que permite paralelizar o consumo** preservando ordem
por transação. Mais volume significa mais partições e mais réplicas no grupo de consumidores, sem
mudança de código.

O que eu mudaria, e não mudei:

**A leitura é o gargalo assumido.** `LIMIT/OFFSET` com `COUNT` degrada em página profunda, porque o
banco varre e descarta. Paginação por chave resolve, e a contagem exata cede lugar a estimativa por
`pg_class.reltuples` ou a apenas "existe próxima página". Não implementei porque o dashboard pede
número de páginas, e trocar isso sem volume medido é otimizar por palpite.

**Separar leitura de escrita** é o passo depois: réplica de leitura para a listagem, ou uma projeção
materializada mantida pelo próprio consumidor de eventos — o fluxo assíncrono que já existe é
exatamente a máquina que alimentaria essa projeção.

O limite honesto: um único Postgres continua sendo o ponto de contenção da escrita. Particionar
`transaction` por `created_at` posterga o problema; sharding por conta é a mudança estrutural, e não
se paga sem número que a justifique.
