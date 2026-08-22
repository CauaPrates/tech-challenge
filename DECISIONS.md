# Decisões

Registro das decisões estruturantes do projeto. Cada uma traz a alternativa que foi considerada e
descartada, porque é a comparação que explica a escolha.

Este arquivo deveria ter nascido no primeiro PR. Nasceu no quarto, consolidando as decisões
tomadas até aqui — o histórico de commits é que mostra quando cada uma foi de fato tomada.

## Organização do projeto

**Decisão:** monorepo com pnpm workspaces, sem orquestrador de tarefas. Três aplicações em `apps/`
e o código compartilhado em `packages/`. O quality gate encadeia as etapas com `pnpm -r`.

**Alternativas consideradas:** Turborepo e repositórios separados por serviço.

**Por quê:** o Turborepo foi montado de fato e removido depois de medir. `pnpm -r run` já executa
em ordem topológica e `--filter` é nativo do pnpm, então o que restava era cache de tarefa — num
gate que roda em 2,6s, isso não paga uma ferramenta a mais para explicar e manter. Repositórios
separados triplicariam o tooling e obrigariam a publicar o contrato de evento em npm ou duplicá-lo,
que é justamente o acoplamento que o enunciado pede para evitar.

O limite conhecido: `pnpm -r` garante ordem topológica _dentro_ de uma tarefa, mas não expressa
"build do pacote A antes do typecheck do pacote B". O `dependsOn: ["^build"]` do Turborepo faria
isso. Contornei ordenando o gate — `format:check`, `build`, `lint`, `typecheck`, `test` — que é
mais grosseiro, e escolhi o grosseiro por ser uma linha em vez de uma dependência.

## Modelagem de dados

**Decisão:** status como enum do Postgres, tipo de transferência como tabela de referência com id
explícito, e valor monetário em `numeric(18,2)`.

**Alternativas consideradas:** ambos como tabela de referência, ou ambos como enum.

**Por quê:** status é regra, tipo é dado. O status tem conjunto fechado e máquina de estado, então
o enum dá exaustividade checada pelo compilador nos `switch` e recusa valor inválido no próprio
banco. O tipo chega como id numérico no contrato de entrada (`transferTypeId: 1`) e pode crescer
sem deploy, o que é a definição de dado de referência — e o id é fixado no seed, sem
autoincremento, para o valor `1` significar a mesma coisa em qualquer ambiente.

Dinheiro em `numeric` e nunca em ponto flutuante, porque o limite de 1000 decide aprovação e é
exatamente na fronteira que o float falha. O custo é o `Decimal` do Prisma precisar de conversão
explícita na borda HTTP.

## Formato dos eventos

**Decisão:** envelope versionado — `eventId`, `eventName`, `eventVersion`, `occurredAt`, `payload`
— em JSON, com o schema Zod morando em `packages/contracts` e importado pelo produtor e pelo
consumidor. O valor monetário viaja como string decimal.

**Alternativas consideradas:** payload plano validado apenas no consumo, e Avro com schema
registry.

**Por quê:** o enunciado exige consistência entre quem publica e quem consome. Um schema
compartilhado transforma essa consistência de acordo verbal em erro de compilação. O `eventId` é o
que sustenta toda a idempotência do fluxo — sem envelope, ele não teria onde morar. Avro seria a
resposta de produção, mas o `docker-compose` entregue não tem registry, e mexer na infraestrutura
base custaria um dia por algo que o enunciado não pede.

A string decimal existe porque é a única forma de o `numeric(18,2)` chegar ao antifraude sem passar
por ponto flutuante binário no meio do caminho.

## Escrita e evento na mesma transação

**Decisão:** outbox transacional. A transação e a linha de `outbox_message` são gravadas no mesmo
`COMMIT` do Postgres; um dispatcher lê o outbox e publica.

**Alternativas consideradas:** publicar direto no Kafka depois do commit, com retry e um job de
reconciliação; e transações do Kafka.

**Por quê:** com publicação direta existe um instante em que a transação está commitada e o evento
não saiu. Se o processo morre ali, a transação fica pendente para sempre e só um job de
reconciliação a recupera. O outbox elimina esse instante. Transações do Kafka resolvem duplicação
_dentro_ do Kafka, mas não abrangem o Postgres — complexidade alta resolvendo o problema errado.

## Publicação fora da transação de banco

**Decisão:** o dispatcher reivindica o lote numa transação curta que commita, e só então publica no
Kafka. Marcar como publicada é uma segunda operação.

**Alternativas consideradas:** publicar dentro da transação que reivindicou o lote — que foi como
ficou implementado primeiro.

**Por quê:** o kafkajs faz retry interno com recuo próprio, o que com o broker fora leva cerca de
17 segundos; o `$transaction` do Prisma expira em 5. Publicando dentro, a transação morria e nem a
falha era registrada — a contagem de tentativas ficava em zero para sempre. Além disso, manter
transação aberta durante I/O de rede prende lock de linha por segundos.

O custo assumido: um crash entre publicar e marcar reentrega a mensagem depois. É entrega
ao-menos-uma-vez, que é a garantia que o consumo idempotente do outro lado já assume.

A coluna `next_attempt_at` faz dois trabalhos: é o recuo exponencial (1s, 2s, 4s, até o teto de
60s) e é um lease — ao reivindicar, o dispatcher a empurra para frente, para outra instância não
pegar a mesma mensagem enquanto ele publica fora da transação. `FOR UPDATE SKIP LOCKED` entrega
lotes disjuntos a instâncias concorrentes, sem lock global e sem coordenação externa.

## Disponibilidade da API independente do broker

**Decisão:** a conexão com o Kafka é preguiçosa e não-fatal. O serviço sobe, avisa que o broker
está indisponível, e reconecta na próxima publicação.

**Alternativas consideradas:** conectar em `onModuleInit` e falhar a subida — que foi a primeira
implementação.

**Por quê:** o enunciado diz que a criação não pode esperar a validação. Derrubar a API porque o
broker está fora viola isso diretamente, e foi o que aconteceu: o app não subia. Verificado depois
da correção — com o Kafka parado, a criação responde 201 e o evento é publicado sozinho quando o
broker volta.

O furo desta escolha, assumido: health verde com outbox crescendo é um cenário silencioso. A
resposta é alerta sobre a contagem de mensagens não publicadas, que está fora do escopo local.

## Antifraude sem banco

**Decisão:** o serviço antifraude não tem persistência. O `eventId` do evento que ele publica é
derivado do identificador da transação avaliada, por uuidv5.

**Alternativas consideradas:** uma tabela de eventos processados no antifraude, com `eventId`
aleatório.

**Por quê:** a avaliação é uma função pura — mesma entrada, mesmo veredito. Com `eventId`
determinístico, reprocessar a mesma mensagem produz um evento idêntico, e a guarda de idempotência
do serviço de transações descarta o segundo. Entrega ao-menos-uma-vez mais determinismo mais
consumo idempotente dá efeito de exatamente-uma-vez, sem transações do Kafka e sem um Postgres a
mais só para registrar o que já foi avaliado.

Isso deixa de valer no dia em que a regra depender de histórico — algo como "mais de três
transações na última hora". Aí o serviço deixa de ser puro e passa a precisar de estado.

## Tratamento de falha na mensageria

**Decisão:** consumo idempotente por `eventId` registrado na mesma transação do efeito, mais DLQ
para falhas definitivas, com distinção explícita entre falha transitória e definitiva.

**Alternativas consideradas:** confiar na entrega exatamente-uma-vez do broker; e mandar toda falha
para a DLQ depois de N tentativas.

**Por quê:** Kafka entrega ao menos uma vez. Em vez de fingir o contrário, o consumo registra o
`eventId` em `processed_event` na mesma transação que aplica o efeito — separados, existiria uma
janela em que um crash perderia a atualização.

A classificação é o que decide se o offset é confirmado:

- **Definitiva** — payload que não passa no schema, transação que não existe, transição de estado
  proibida. Vai para a DLQ e confirma o offset, para uma mensagem envenenada não travar a partição.
- **Transitória** — banco fora, broker instável, timeout. Retenta com recuo e, se não ceder,
  relança **sem** confirmar o offset, para o Kafka reentregar depois.

Mandar falha transitória para a DLQ inundaria a DLQ de mensagens perfeitamente válidas: banco fora
não é problema da mensagem. Um consumidor visivelmente parado é melhor que uma mensagem
silenciosamente descartada — o preço é que isso exige alerta sobre o lag do grupo de consumidores.

## Pacote compartilhado de mensageria

**Decisão:** produtor, criação de tópicos e o runner de consumo moram em `packages/messaging`,
consumido pelos dois serviços.

**Alternativas consideradas:** duplicar a camada de mensageria em cada serviço.

**Por quê:** o pacote foi extraído no quarto PR, quando apareceu o segundo consumidor — extrair no
primeiro uso é adivinhar a abstração. O argumento contra é legítimo: microserviço que compartilha
biblioteca de infraestrutura acopla o deploy dos dois. Escolhi compartilhar porque a classificação
entre falha transitória e definitiva é a lógica que mais precisa estar testada em um lugar só;
duplicá-la significa corrigir o mesmo bug duas vezes. Em repositórios separados, eu duplicaria.

O pacote recebe a configuração pronta em vez de ler o ambiente, porque não conhece — nem deve
conhecer — o schema de variáveis de nenhum dos serviços.
