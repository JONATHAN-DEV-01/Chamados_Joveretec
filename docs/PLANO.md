# Plano — Sistema de Chamados Joveretec

> Status: **Parte 1 concluída** — backend implementado e testado (61 testes passando).
> As seções abaixo refletem o que foi implementado de fato. Parte 2: frontend, CI/CD e deploy.

## 1. Visão geral

Ferramenta web de gestão de chamados (tickets) para equipes de desenvolvimento.

| Camada | Tecnologia |
|---|---|
| Backend | Java 21 + Quarkus 3.40.1 (Quarkus REST + Jackson), Maven Wrapper (Maven 3.9.16) |
| Persistência | PostgreSQL, Hibernate ORM com Panache, Flyway |
| Autenticação | SmallRye JWT (RS256), senhas com BCrypt |
| Resiliência / saúde | SmallRye Fault Tolerance, SmallRye Health (`/q/health`) |
| Cache | Quarkus Cache (Caffeine) para configurações/paleta |
| Testes | JUnit 5 + RestAssured, PostgreSQL via Dev Services (Testcontainers) |
| Frontend (Parte 2) | Angular (última estável) + TypeScript |
| CI/CD (Parte 2) | GitHub Actions |
| Deploy (Parte 2) | Backend no Render (Dockerfile), banco no Supabase, frontend na Vercel |

### Estrutura do monorepo

```
/backend              projeto Quarkus (Maven, com Maven Wrapper)
/frontend             projeto Angular (Parte 2)
/docs/PLANO.md        este documento
/.github/workflows    pipelines (Parte 2)
README.md  .env.example  .gitignore
```

### Pacotes do backend (BCE)

```
br.com.joveretec.chamados
├── auth/          boundary · control
├── usuario/       boundary · control · entity
├── projeto/       boundary · control · entity
├── chamado/       boundary · control · entity   (inclui histórico)
├── dashboard/     boundary · control             (consultas agregadas)
├── configuracao/  boundary · control · entity
└── comum/
    ├── erro/       CodigoErro, ExcecaoDeNegocio, RespostaErro e os ExceptionMappers
    ├── paginacao/  Pagina, Paginacao (@BeanParam), CondicoesConsulta (filtros dinâmicos), ParametrosEnum
    └── seguranca/  UsuarioLogado (dados do JWT), HashDeSenha (interface) + BcryptHashDeSenha
```

Regras de dependência:
- `boundary` → `control` → `entity`. Nunca o contrário.
- `boundary` recebe e devolve **apenas DTOs** (Java `record`); a conversão entidade ↔ DTO fica em mappers no `boundary`.
- `control` recebe dependências por injeção via construtor (CDI); regras de negócio só aqui. Os repositórios Panache são beans CDI (substituíveis em teste) e o hash de senha é uma interface (`HashDeSenha`).
- Erros de negócio usam `ExcecaoDeNegocio` com um `CodigoErro` (fábricas `naoEncontrado`, `conflito`, `regraDeNegocio`…), traduzida por `ExceptionMapper`s centralizados em `comum/erro`.

## 2. Modelo de dados

Convenções: tabelas e colunas em `snake_case`, PK `BIGINT GENERATED ALWAYS AS IDENTITY`, datas em `TIMESTAMPTZ` (UTC), enums gravados como `VARCHAR` com `CHECK`.

### `usuario`
| Coluna | Tipo | Regras |
|---|---|---|
| id | bigint PK | |
| nome | varchar(120) | not null |
| email | varchar(160) | not null, único (case-insensitive: índice em `lower(email)`) |
| senha_hash | varchar(100) | not null, BCrypt |
| perfil | varchar(20) | `ADMIN` \| `DESENVOLVEDOR` |
| ativo | boolean | default true |
| criado_em / atualizado_em | timestamptz | |

### `projeto`
| Coluna | Tipo | Regras |
|---|---|---|
| id | bigint PK | |
| nome | varchar(120) | not null, único (case-insensitive: índice em `lower(nome)`) |
| descricao | text | opcional |
| arquivado | boolean | default false |
| criado_em / atualizado_em | timestamptz | |

### `chamado`
| Coluna | Tipo | Regras |
|---|---|---|
| id | bigint PK | |
| projeto_id | bigint FK → projeto | not null |
| titulo | varchar(200) | not null |
| descricao | text | not null |
| urgencia | varchar(10) | `BAIXA` \| `MEDIA` \| `ALTA` \| `CRITICA` |
| urgencia_peso | smallint | **coluna gerada** (`CRITICA`=4 … `BAIXA`=1), usada na ordenação e indexável |
| status | varchar(15) | `ABERTO` \| `EM_ANDAMENTO` \| `CONCLUIDO`, default `ABERTO` |
| posicao | integer | ≥ 1, posição na fila do projeto |
| responsavel_id | bigint FK → usuario | opcional (permite chamado sem responsável até alguém "atribuir a si") |
| criado_por_id | bigint FK → usuario | not null |
| versao | bigint | lock otimista (evita sobrescrever edição concorrente → 409) |
| criado_em / atualizado_em | timestamptz | |

Índices:
- `(projeto_id, posicao)` — fila do projeto e reordenação
- `(urgencia_peso DESC, posicao)` — ordenação padrão da listagem
- `(responsavel_id)`, `(status)`, `(urgencia)` — filtros
- FKs indexadas

### `historico_chamado`
Uma linha por campo alterado.

| Coluna | Tipo | Regras |
|---|---|---|
| id | bigint PK | |
| chamado_id | bigint FK → chamado | not null, indexado com `alterado_em` |
| usuario_id | bigint FK → usuario | quem alterou |
| campo | varchar(30) | `CRIACAO`, `TITULO`, `DESCRICAO`, `URGENCIA`, `STATUS`, `RESPONSAVEL`, `POSICAO` |
| valor_anterior | text | opcional |
| valor_novo | text | opcional |
| alterado_em | timestamptz | not null |

### `configuracao`
Chave/valor simples, exposto como objeto estruturado pela API.

| Coluna | Tipo |
|---|---|
| chave | varchar(60) PK |
| valor | varchar(500) |
| atualizado_em | timestamptz |
| atualizado_por_id | bigint FK → usuario (opcional) |

Seed (migration Flyway):

| chave | valor | uso no frontend |
|---|---|---|
| `paleta.fundo` | `#171717` | fundo principal / barra lateral |
| `paleta.superficie` | `#444444` | superfícies secundárias, cards, bordas |
| `paleta.destaque` | `#DA0037` | botões primários, links, urgência Alta/Crítica |
| `paleta.texto` | `#EDEDED` | texto principal / fundos claros |
| `geral.nome_sistema` | `Chamados Joveretec` | título exibido |
| `geral.tamanho_pagina_padrao` | `20` | paginação padrão do frontend |

### Regras de negócio principais
- **Ordenação da listagem:** `urgencia_peso DESC, posicao ASC, id ASC` (padrão) ou `posicao ASC, id ASC` com `ordem=POSICAO`.
- **Posição:** sequencial por projeto (1..n). Ao criar, `posicao` é opcional (padrão: fim da fila); se informada, os chamados a partir dela são deslocados +1. Reordenar move o chamado e desloca os intermediários, numa transação com lock no projeto (evita corrida entre duas reordenações).
- **Responsável:** precisa ser usuário ativo. Desenvolvedor pode atribuir a outro dev ou a si mesmo.
- **Projeto arquivado:** não recebe novos chamados nem edições; continua visível para consulta.
- **Usuário desativado:** não faz login e não pode ser atribuído; chamados existentes continuam com ele.
- **Admin:** não pode desativar a si mesmo nem rebaixar o último admin ativo.
- **Permissão de edição:** qualquer usuário autenticado (dev ou admin) pode editar qualquer chamado — ferramenta de equipe.
- **Projeto do chamado:** não pode ser trocado após a criação.
- **Histórico:** gravado pelo `control` na mesma transação da alteração.
- **Admin inicial:** criado na inicialização da aplicação (seed em Java, não em SQL) se não existir nenhum admin, lendo `ADMIN_NOME`, `ADMIN_EMAIL`, `ADMIN_SENHA`. Motivo: o hash BCrypt é gerado em Java e a senha nunca fica em script versionado nem afeta o checksum do Flyway.

## 3. Endpoints

Prefixo `/api`. Autenticação por header `Authorization: Bearer <jwt>`.
Perfis: **Público**, **Autenticado** (`DESENVOLVEDOR` ou `ADMIN`), **Admin**.

### Formatos comuns

Página:
```json
{ "itens": [ ... ], "pagina": 0, "tamanho": 20, "totalItens": 57, "totalPaginas": 3 }
```
Query params de paginação: `pagina` (default 0), `tamanho` (default 20, máx. 100).

Erro (todas as respostas 4xx/5xx):
```json
{
  "codigo": "VALIDACAO",
  "mensagem": "Dados inválidos.",
  "detalhes": [ { "campo": "titulo", "mensagem": "O título é obrigatório." } ],
  "timestamp": "2026-10-23T18:00:00Z"
}
```
Códigos: `VALIDACAO` (400), `NAO_AUTENTICADO` (401), `ACESSO_NEGADO` (403), `NAO_ENCONTRADO` (404), `METODO_NAO_PERMITIDO` (405), `CONFLITO` (409), `REGRA_NEGOCIO` (422), `ERRO_INTERNO` (500), `INDISPONIVEL` (503).

`detalhes` vem preenchido em erros de Bean Validation (um item por campo) e em JSON com valor de tipo errado (ex.: urgência inexistente → `{ "campo": "urgencia" }`). Valores de enum inválidos em query string (`status`, `urgencia`, `perfil`, `ordem`) retornam 400 com a lista de valores aceitos na mensagem. Todo `POST` de criação responde `201` com header `Location`.

### Auth
| Método | Rota | Perfil | Request | Response |
|---|---|---|---|---|
| POST | `/api/auth/login` | Público | `{ email, senha }` | `200 { token, expiraEm, usuario: UsuarioDTO }` · 401 credenciais inválidas/usuário inativo |
| GET | `/api/auth/me` | Autenticado | — | `200 UsuarioDTO` |
| PUT | `/api/auth/me/senha` | Autenticado | `{ senhaAtual, novaSenha }` | `204` |

JWT: claims `sub` (id), `upn` (email), `groups` ([perfil]), `name`; expiração configurável.

### Usuários
`UsuarioDTO = { id, nome, email, perfil, ativo, criadoEm }`

| Método | Rota | Perfil | Request | Response |
|---|---|---|---|---|
| GET | `/api/usuarios?busca&ativo&perfil&pagina&tamanho` | Autenticado | — | `200 Página<UsuarioDTO>` (devs usam para escolher responsável) |
| GET | `/api/usuarios/{id}` | Autenticado | — | `200 UsuarioDTO` |
| POST | `/api/usuarios` | Admin | `{ nome, email, senha, perfil }` | `201 UsuarioDTO` · 409 email já existe |
| PUT | `/api/usuarios/{id}` | Admin | `{ nome, email, perfil, novaSenha? }` | `200 UsuarioDTO` |
| POST | `/api/usuarios/{id}/desativar` | Admin | — | `200 UsuarioDTO` |
| POST | `/api/usuarios/{id}/reativar` | Admin | — | `200 UsuarioDTO` |

### Projetos
`ProjetoDTO = { id, nome, descricao, arquivado, criadoEm, atualizadoEm }`

| Método | Rota | Perfil | Request | Response |
|---|---|---|---|---|
| GET | `/api/projetos?busca&incluirArquivados&pagina&tamanho` | Autenticado | — | `200 Página<ProjetoDTO>` |
| GET | `/api/projetos/{id}` | Autenticado | — | `200 ProjetoDTO` |
| POST | `/api/projetos` | Admin | `{ nome, descricao? }` | `201 ProjetoDTO` |
| PUT | `/api/projetos/{id}` | Admin | `{ nome, descricao? }` | `200 ProjetoDTO` |
| POST | `/api/projetos/{id}/arquivar` | Admin | — | `200 ProjetoDTO` |
| POST | `/api/projetos/{id}/desarquivar` | Admin | — | `200 ProjetoDTO` |

### Chamados
```
ChamadoResumoDTO = { id, titulo, urgencia, status, posicao,
                     projeto: { id, nome }, responsavel: { id, nome } | null, atualizadoEm }
ChamadoDTO       = ChamadoResumoDTO + { descricao, criadoPor: { id, nome }, criadoEm, versao }
HistoricoDTO     = { id, campo, valorAnterior, valorNovo, usuario: { id, nome }, alteradoEm }
```

| Método | Rota | Perfil | Request | Response |
|---|---|---|---|---|
| GET | `/api/chamados?projetoId&responsavelId&semResponsavel&status&urgencia&busca&ordem&pagina&tamanho` | Autenticado | `status` e `urgencia` aceitam vários valores (`?status=A&status=B` ou `?status=A,B`); `busca` procura em título e descrição (case-insensitive); `ordem` = `URGENCIA` (padrão) ou `POSICAO` | `200 Página<ChamadoResumoDTO>` |
| GET | `/api/chamados/{id}` | Autenticado | — | `200 ChamadoDTO` |
| POST | `/api/chamados` | Autenticado | `{ projetoId, titulo, descricao, urgencia, responsavelId?, posicao? }` | `201 ChamadoDTO` |
| PUT | `/api/chamados/{id}` | Autenticado | `{ titulo, descricao, urgencia, responsavelId?, versao }` | `200 ChamadoDTO` · 409 versão desatualizada |
| PATCH | `/api/chamados/{id}/status` | Autenticado | `{ status }` | `200 ChamadoDTO` |
| POST | `/api/chamados/{id}/atribuir-a-mim` | Autenticado | — | `200 ChamadoDTO` |
| PUT | `/api/chamados/{id}/posicao` | Autenticado | `{ posicao }` (1..n) | `200 ChamadoDTO` · 422 fora do intervalo |
| GET | `/api/chamados/{id}/historico?pagina&tamanho` | Autenticado | — | `200 Página<HistoricoDTO>` (mais recente primeiro) |

A listagem usa consulta com `JOIN FETCH` de projeto e responsável para evitar N+1, e `count` separado sem fetch. O detalhe também faz fetch do autor; o histórico faz fetch do usuário de cada registro.

Erros específicos: criação/edição com projeto arquivado ou responsável inativo → 422; usuário desativado com token ainda válido tentando alterar → 403.

### Dashboard
Todos aceitam `projetoId` opcional. Agregações feitas no banco (`GROUP BY`).

| Método | Rota | Perfil | Response |
|---|---|---|---|
| GET | `/api/dashboard/por-status` | Autenticado | `200 [ { status, total } ]` (inclui zeros) |
| GET | `/api/dashboard/por-urgencia` | Autenticado | `200 [ { urgencia, total } ]` |
| GET | `/api/dashboard/por-desenvolvedor` | Autenticado | `200 [ { usuario: { id, nome }, abertos, emAndamento, concluidos, total } ]` (só quem tem chamados atribuídos; ordenado por nome) |
| GET | `/api/dashboard/meus-chamados` | Autenticado | `200 { total, porStatus: [...], porUrgencia: [...] }` do usuário logado |

### Configurações
```
ConfiguracaoDTO = { paleta: { fundo, superficie, destaque, texto },
                    geral:  { nomeSistema, tamanhoPaginaPadrao } }
```

| Método | Rota | Perfil | Request | Response |
|---|---|---|---|---|
| GET | `/api/configuracoes` | Público | — | `200 ConfiguracaoDTO` (cacheado; fallback para a paleta padrão se o banco estiver indisponível) |
| PUT | `/api/configuracoes` | Admin | `ConfiguracaoDTO` (cores validadas como `#RRGGBB`) | `200 ConfiguracaoDTO` (invalida o cache) |

### Infraestrutura
| Método | Rota | Perfil | Descrição |
|---|---|---|---|
| GET | `/q/health`, `/q/health/live`, `/q/health/ready` | Público | SmallRye Health (readiness inclui o banco) |

## 4. Requisitos transversais

- **Segurança:** `@RolesAllowed` em todos os recursos; `@PermitAll` só em login, configurações (GET) e health. Senhas com BCrypt (custo 12). Chaves RSA do JWT via variável de ambiente (em dev/test o Quarkus gera um par temporário).
- **CORS:** `quarkus.http.cors.origins=${CORS_ORIGINS}`.
- **Validação:** Bean Validation nos DTOs de entrada, mensagens em português.
- **Fault tolerance:** `@Timeout(2s)` + `@CircuitBreaker` + `@Fallback` (paleta padrão) na leitura de configurações (endpoint público, chamado em toda carga do frontend); `@Timeout(5s)` nas consultas do dashboard. Timeout/circuito aberto sem fallback → 503 `INDISPONIVEL`. Sem `@Retry` em escritas (não são idempotentes).
- **Cache:** `@CacheResult` em `LeitorDeConfiguracoes.carregar()` (bean separado, para o fallback nunca ser cacheado); a alteração invalida o cache **depois** do commit.
- **Autenticação sob demanda** (`quarkus.http.auth.proactive=false`): permite que token inválido/ausente responda 401 no formato padrão.
- **Logs:** JSON (`quarkus-logging-json`) no perfil `prod`, texto legível em dev; nunca logar senha, hash ou token.
- **Docker:** build multi-stage (Maven + JDK 21 → JRE 21), escuta em `${PORT}` (Render).

### Variáveis de ambiente (`.env.example`)
| Variável | Descrição |
|---|---|
| `DB_URL` | JDBC do PostgreSQL (ex.: Supabase `jdbc:postgresql://...:5432/postgres?sslmode=require`) |
| `DB_USER` / `DB_PASSWORD` | credenciais do banco |
| `JWT_ISSUER` | emissor do token |
| `JWT_DURACAO_MINUTOS` | validade do token (padrão 480) |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | chaves RSA em PEM (apenas prod) |
| `CORS_ORIGINS` | origens permitidas, separadas por vírgula |
| `ADMIN_NOME` / `ADMIN_EMAIL` / `ADMIN_SENHA` | admin inicial |
| `PORT` | porta HTTP (Render define automaticamente) |

## 5. Testes (backend) — 61 testes, todos passando
PostgreSQL real via Dev Services (Testcontainers, imagem `postgres:18`). Cada teste cria os próprios dados (nomes únicos), então não há dependência de ordem. Helper comum: `src/test/java/.../ApiTeste.java`.

| Classe | Cobertura |
|---|---|
| `AuthResourceTest` (10) | login, e-mail sem diferenciar maiúsculas, senha errada/e-mail inexistente (mesma mensagem), validação, usuário inativo, sem token/token inválido → 401, `/me`, troca de senha |
| `PermissoesTest` (6) | dev recebe 403 em usuários/projetos/configurações; dev consulta tudo; admin gerencia; usuário desativado com token válido → 403 |
| `ChamadoResourceTest` (16) | criação no fim e em posição informada, validação, urgência inválida, JSON malformado, posição fora da fila, atribuição a outro/autoatribuição, "atribuir a mim" + histórico, responsável inativo, status, edição com histórico só do que mudou, lock otimista (409), reordenação para cima/baixo e limites, projeto arquivado, 404 |
| `FiltrosChamadoTest` (12) | ordenação por urgência+posição e por posição, cada filtro, filtros combinados, busca em título/descrição, paginação, limites de página, enum inválido |
| `DashboardResourceTest` (4) | por status (com zeros), por urgência, por desenvolvedor, meus chamados |
| `ConfiguracaoResourceTest` (4) | leitura pública, alteração pelo admin refletida na leitura (cache invalidado), cor inválida, sem token |
| `UsuarioProjetoResourceTest` (9) | e-mail duplicado, alteração de perfil, admin não se desativa, filtros, arquivar/desarquivar, nome duplicado, `/q/health/ready`, rota inexistente 404 |

Além dos testes, a imagem Docker foi validada no perfil `prod` (PostgreSQL 17 em container, chaves RSA via variáveis de ambiente): health `UP`, login, rota protegida, preflight CORS e logs JSON sem senha, token ou e-mail.

## 6. Telas previstas para o frontend (Parte 2)

| Tela | Perfil | Conteúdo |
|---|---|---|
| Login | Público | email/senha; aplica a paleta antes do login |
| Layout principal | Autenticado | barra lateral (cor `fundo`), cabeçalho com usuário e sair |
| Dashboard | Autenticado | cards/gráficos por status, urgência, desenvolvedor; "meus chamados"; filtro por projeto |
| Lista de chamados | Autenticado | tabela paginada, filtros combináveis (projeto, responsável, status, urgência, busca), badges de urgência |
| Novo chamado | Autenticado | formulário: projeto, título, descrição, urgência, responsável (ou "eu mesmo"), posição na fila |
| Detalhe/edição do chamado | Autenticado | edição, mudança de status, "atribuir a mim", histórico em linha do tempo |
| Fila do projeto | Autenticado | lista do projeto com `ordem=POSICAO` e arrastar-e-soltar para reordenar |
| Projetos | Admin | lista, criar, editar, arquivar/desarquivar |
| Usuários | Admin | lista, criar, editar, alterar perfil, desativar/reativar |
| Configurações | Admin | editor da paleta com pré-visualização e configurações gerais |
| Meu perfil | Autenticado | dados e troca de senha |
| Páginas de erro | — | 403 e 404 |

## 7. Ordem de execução (Parte 1) — concluída
1. ✅ Plano (este documento)
2. ✅ Estrutura do monorepo
3. ✅ Entidades + migrations Flyway + seeds
4. ✅ Autenticação JWT e perfis
5. ✅ Módulos usuario e projeto
6. ✅ Módulo chamado (+ parâmetro `ordem=POSICAO`, adicionado depois para a tela de fila)
7. ✅ Módulos dashboard e configuracao
8. ✅ Erros, fault tolerance, health, Dockerfile
9. ✅ Testes (61 passando)
10. ✅ Atualizar este plano e o README

## 8. Notas para a Parte 2

### Contrato da API para o frontend
- **Autenticação:** `POST /api/auth/login` devolve `token` e `expiraEm`. Enviar `Authorization: Bearer <token>`. Não existe refresh token: em qualquer 401, limpar a sessão e voltar ao login. O perfil vem em `usuario.perfil` (`ADMIN` | `DESENVOLVEDOR`). Use isso para esconder menus, mas o backend é quem garante a permissão (403).
- **Usuário desativado:** o token continua válido para leitura até expirar (padrão 8h), mas qualquer alteração retorna 403.
- **Edição de chamado:** `PUT /api/chamados/{id}` exige `versao` (vem no `GET /api/chamados/{id}`). Em 409, avisar "alterado por outra pessoa" e recarregar. Status, "atribuir a mim" e posição têm endpoints próprios e **não** exigem `versao`, mas incrementam a versão: recarregue o chamado antes de abrir o formulário de edição.
- **Responsável:** enviar `responsavelId: null` remove o responsável no `PUT`. Na criação, autoatribuição = enviar o próprio `id` (de `/api/auth/me`).
- **Fila do projeto:** listar com `?projetoId=X&ordem=POSICAO&tamanho=100`. Ao soltar um item, chamar `PUT /api/chamados/{id}/posicao` com a nova posição (1-based) e recarregar a lista.
- **Paginação:** `pagina` começa em 0; `tamanho` máximo 100. O tamanho padrão sugerido vem de `geral.tamanhoPaginaPadrao` em `/api/configuracoes`.
- **Paleta:** `GET /api/configuracoes` é público. Aplicar antes do login, por exemplo `--cor-fundo: paleta.fundo`, `--cor-superficie: paleta.superficie`, `--cor-destaque: paleta.destaque`, `--cor-texto: paleta.texto`. As cores voltam sempre em maiúsculas `#RRGGBB`.
- **Erros:** sempre `{ codigo, mensagem, detalhes[], timestamp }`. `mensagem` já está em português e pode ser exibida; `detalhes[].campo` casa com o nome do campo do formulário.
- **Datas:** ISO-8601 em UTC (`2026-10-23T18:00:00Z`); converter para o fuso local no frontend.
- **Histórico:** `valorAnterior`/`valorNovo` são texto; para `RESPONSAVEL` é o nome do usuário, para `POSICAO` é o número, para `CRIACAO` `valorNovo` é o título.

### Deploy
- **Render (backend):** serviço Docker com *Root Directory* `backend` (o Dockerfile está lá). Health check path: `/q/health/ready`. Variáveis obrigatórias em prod: `DB_URL`, `DB_USER`, `DB_PASSWORD`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `ADMIN_EMAIL`, `ADMIN_SENHA`, `CORS_ORIGINS`. Opcionais: `JWT_ISSUER`, `JWT_DURACAO_MINUTOS`, `ADMIN_NOME`. `PORT` é injetada pelo Render. Sem as obrigatórias, a aplicação não sobe (proposital).
- **Chaves JWT:** gerar com `openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out priv.pem` e `openssl pkey -in priv.pem -pubout -out pub.pem`. Colar o conteúdo PEM completo (com BEGIN/END) nas variáveis. Não versionar (`*.pem` está no `.gitignore`).
- **Supabase (banco):** o Render não tem IPv6 e a conexão direta do Supabase é IPv6. Use a string do **Session pooler** (IPv4, porta 5432), ex.: `jdbc:postgresql://aws-0-<regiao>.pooler.supabase.com:5432/postgres?sslmode=require`, com usuário `postgres.<ref-do-projeto>`. Evite o *Transaction pooler* (6543), que não lida bem com prepared statements do JDBC. O pool da aplicação está em 10 conexões (`quarkus.datasource.jdbc.max-size`). O Flyway roda na subida e cria tudo, inclusive no Postgres do Supabase (testado com PG 17 e 18).
- **Vercel (frontend):** incluir o domínio da Vercel (e o de preview, se for usar) em `CORS_ORIGINS`, separado por vírgula. O CORS já libera `Authorization` e `Content-Type` e expõe `Location`.
- **Render free** hiberna depois de um tempo ocioso. A primeira requisição pode levar cerca de 30 a 60 s. Vale mostrar um "carregando" no login.

### CI (GitHub Actions)
- Backend: `cd backend && ./mvnw -B verify` com JDK 21 (Temurin). Os testes precisam de Docker (Dev Services), que já existe nos runners `ubuntu-latest`. Não é preciso nenhum serviço de banco no workflow.
- O repositório força LF (`.gitattributes`), e o `mvnw` precisa disso para rodar em Linux.

### Pendências e decisões conhecidas
- Busca textual usa `ILIKE` sem índice de trigramas. Está ok para o volume esperado; se crescer, criar `pg_trgm` + índice GIN em `titulo`/`descricao`.
- Não há exclusão de chamados nem de usuários/projetos (só desativar/arquivar), para preservar o histórico.
- Não há refresh token nem revogação de token. Desativar um usuário bloqueia alterações na hora, mas não a leitura até o token expirar.
- O cache de configurações é local a cada instância. Com mais de uma instância no Render, a troca de paleta pode demorar a aparecer nas outras até elas reiniciarem. Hoje é uma instância só.
