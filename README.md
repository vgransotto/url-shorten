# url-shorten

Esse repositório é um hands-on de encurtador de URL. Mas o que realmente está sendo testado aqui é um conjunto de decisões de design que aparecem toda vez que se faz necessário gerar identificadores curtos e únicos em escala: como evitar colisão sem pagar o preço de ficar checando o banco a cada ecrita, como manter isso funcionando quando a aplicação passa a rodar em várias instâncias ao mesmo tempo, e qual banco de dados aguenta o tranco de leitura/escrita que um serviço desse tipo recebe no mundo real.

## Por que contador atômico em vez de hash

A forma "óbvia" de gerar um id curto seria pegar a URL, passar por um hash (MD5, SHA, o que for), truncar e usar os primeiros caracteres como id. O problema é que hash não dá garantia de unicidade, dá *probabilidade* de unicidade — e conforme a tabela cresce, essa probabilidade de colisão sobe exponencialmente. Pra lidar com isso, a prática comum é: gerar o hash, consultar o banco pra ver se já existe, e se existir, gerar outro e tentar de novo. Isso funciona, mas tem dois problemas que me interessavam evitar: adiciona uma leitura antes de toda escrita (custo de latência que não precisava existir) e abre uma janela de corrida — duas requisições concorrentes podem gerar o mesmo hash, checar o banco ao mesmo tempo, não encontrar nada e as duas tentarem inserir o mesmo id.

A saída usada aqui foi inverter o problema: em vez de gerar algo aleatório e depois provar que é único, parte-se de algo que já é único por definição — um contador que só incrementa — e só então se transforma esse número em uma string curta através de um encode reversível (`hashids`). Como o número de entrada nunca se repete, a string de saída também nunca se repete. Não existe "chance" de colisão, existe impossibilidade matemática, porque o encode é uma função bijetora (um número de entrada, uma e só uma string de saída, sem embaralhar nada). Isso elimina de vez a necessidade do SELECT-antes-do-INSERT e da lógica de retry por colisão.

Com o alfabeto usado no projeto (62 caracteres: `a-z`, `A-Z`, `0-9`), um id de 7 caracteres já cobre `62^7 ≈ 3,5 trilhões` de combinações antes de precisar crescer pra 8 — e o `hashids` vai aumentando o tamanho do id automaticamente conforme o contador sobe, sem nenhuma intervenção manual.

## Por que Redis entra no meio

Um contador que incrementa resolve a colisão, mas só se ele for um único contador compartilhado. Se cada instância da aplicação guardasse esse número na própria memória, bastaria subir uma segunda instância pra duas requisições em paralelo pegarem o mesmo valor — voltamos ao problema da colisão, só que agora entre processos em vez de entre hashes aleatórios. A alternativa seria dividir faixas de ids entre as instâncias (instância A usa 0-999999, instância B usa 1000000-1999999...), mas isso é coordenação manual, chata de operar e difícil de escalar pra cima e pra baixo sem desperdiçar faixas.

O Redis resolve isso de um jeito bem mais simples: o comando `INCR` é atômico e single-threaded no servidor, então não importa quantas instâncias da aplicação estejam chamando ele ao mesmo tempo, cada chamada recebe um valor diferente e nenhuma delas precisa de lock, de fila ou de qualquer coordenação entre si. É isso que desacopla "calcular o próximo id" de "qual processo específico está atendendo essa requisição agora" — a aplicação fica sem estado nenhum em relação à geração de id, e o estado compartilhado fica concentrado num único lugar pensado pra isso. Na prática é o que permite escalar a aplicação horizontalmente (subir e derrubar instâncias à vontade) sem nunca se preocupar com duas delas gerando o mesmo id ao mesmo tempo.

De brinde, o Redis também guarda em cache os ids mais consultados, então um redirecionamento que já passou por ali uma vez não precisa ir até o Cassandra de novo.

## Por que Cassandra e não um banco relacional comum

Encurtador de URL tem um perfil de carga bem específico: é lido o tempo inteiro (todo clique é uma leitura) e precisa estar no ar sempre, porque quando ele cai, todo link que depende dele para de funcionar — não tem fallback, a URL original simplesmente some. Então disponibilidade aqui é indispensável.

O Cassandra foi pensado desde a raiz pra esse cenário: é um banco peer-to-peer, sem nó mestre, onde os dados são replicados entre vários nós do cluster. Se um nó cai, o cluster continua respondendo — não existe aquele momento de "o primário caiu, alguém precisa assumir" que bancos relacionais tradicionais em modo primário/réplica têm. E escalar não significa trocar por uma máquina maior, significa adicionar mais um nó ao cluster, o que ele absorve de forma praticamente linear tanto pra leitura quanto pra escrita.

A outra característica que pesou na escolha foi a consistência ajustável por operação. Num banco relacional você geralmente não tem essa escolha — ou é consistente (ACID) ou não é. No Cassandra, cada leitura ou escrita pode escolher seu nível de consistência (`ONE`, `QUORUM`, `ALL`...), trocando disponibilidade/latência por garantia de consistência conforme a necessidade real daquela operação. Pra esse caso de uso específico, vale a pena abrir mão de consistência forte: se um redirecionamento ler uma réplica ligeiramente desatualizada, o pior cenário é insignificante (a URL de destino quase nunca muda depois de criada), então dá pra priorizar disponibilidade e latência baixa sem medo. Se um dia existisse uma escrita no sistema que exigisse garantia forte, a mesma base de dados permite subir o nível de consistência pontualmente, sem precisar trocar de banco.

## Sobre alta disponibilidade — o que não foi implementado (e por quê)

Tudo isso é conceito, então a infra deste repositório (`docker-compose.yml`) é deliberadamente single-node e local — ela existe pra validar a ideia, não pra simular produção. Numa aplicação real, os pontos abaixo seriam o próximo passo natural:

- **Redis em cluster/HA**: hoje é uma instância única; perder ela significa perder o contador e o cache ao mesmo tempo. Em produção isso pediria réplicas com sentinel ou Redis Cluster.
- **Cassandra com mais nós**: um cluster de um nó só não tem pra onde replicar; o `replication_factor` e o número de nós precisariam crescer junto com o requisito real de tolerância a falha.
- **Múltiplas instâncias da aplicação atrás de um load balancer**: já é possível, porque a aplicação não guarda estado local (todo estado compartilhado mora no Redis e no Cassandra), mas no docker-compose atual só roda uma instância.

Nada disso foi aplicado de propósito — o objetivo aqui era testar o algoritmo de geração de id e as decisões de banco por trás dele, não montar uma topologia de produção.

## Rodando localmente

```bash
docker compose up -d        # Cassandra, Redis e RedisInsight
cp .env.example .env
bun install
bun run migrate              # cria keyspace + tabela
bun run dev
```

Servidor em `http://localhost:3000`. Exemplos de chamadas em [`api.http`](./api.http):

- `POST /shorten` com `{ "url": "..." }` → cria o id curto
- `GET /short/:id` → redireciona (`302`) para a URL original

## Inspecionando os dados

- **Redis** — RedisInsight em `http://localhost:5540`
- **Cassandra** — `docker exec -it cassandra-db cqlsh -k my_keyspace`
