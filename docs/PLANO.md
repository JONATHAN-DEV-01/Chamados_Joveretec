# Plano — Sistema de Chamados Joveretec

> Status: **rascunho para aprovação** (Parte 1 — planejamento e backend).
> Este documento será atualizado ao final da Parte 1 com os endpoints realmente implementados.

## 1. Visão geral

Ferramenta web de gestão de chamados (tickets) para equipes de desenvolvimento.

| Camada | Tecnologia |
|---|---|
| Backend | Java 21 + Quarkus (Quarkus REST + Jackson) |
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
└── comum/         erros (exceções + ExceptionMapper), paginação, segurança (usuário logado)
```

Regras de dependência:
- `boundary` → `control` → `entity`. Nunca o contrário.
- `boundary` recebe e devolve **apenas DTOs** (Java `record`); a conversão entidade ↔ DTO fica em mappers no `boundary`.
- `control` depende de interfaces de repositório (CDI), não de detalhes de persistência; regras de negócio só aqui.
- Exceções de negócio (`RecursoNaoEncontradoException`, `RegraDeNegocioException`, `ConflitoException`, `AcessoNegadoException`) são traduzidas por `ExceptionMapper`s centralizados.

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
| nome | varchar(120) | not null, único |
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
- **Ordenação da listagem:** `urgencia_peso DESC, posicao ASC, id ASC`.
- **Posição:** sequencial por projeto (1..n). Ao criar, `posicao` é opcional (padrão: fim da fila); se informada, os chamados a partir dela são deslocados +1. Reordenar move o chamado e desloca os intermediários, numa transação com lock no projeto (evita corrida entre duas reordenações).
- **Responsável:** precisa ser usuário ativo. Desenvolvedor pode atribuir a outro dev ou a si mesmo.
- **Projeto arquivado:** não recebe novos chamados nem edições; continua visível para consulta.
- **Usuário desativado:** não faz login e não pode ser atribuído; chamados existentes continuam com ele.
- **Admin:** não pode desativar a si mesmo nem rebaixar o último admin ativo.
- **Permissão de edição:** qualquer usuário autenticado (dev ou admin) pode editar qualquer chamado — ferramenta de equipe. *(confirmar)*
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
Códigos: `VALIDACAO` (400), `NAO_AUTENTICADO` (401), `ACESSO_NEGADO` (403), `NAO_ENCONTRADO` (404), `CONFLITO` (409), `REGRA_NEGOCIO` (422), `INDISPONIVEL` (503), `ERRO_INTERNO` (500).

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
| GET | `/api/chamados?projetoId&responsavelId&semResponsavel&status&urgencia&busca&pagina&tamanho` | Autenticado | `status` e `urgencia` aceitam múltiplos valores; `busca` procura em título e descrição (case-insensitive) | `200 Página<ChamadoResumoDTO>` ordenada por urgência e posição |
| GET | `/api/chamados/{id}` | Autenticado | — | `200 ChamadoDTO` |
| POST | `/api/chamados` | Autenticado | `{ projetoId, titulo, descricao, urgencia, responsavelId?, posicao? }` | `201 ChamadoDTO` |
| PUT | `/api/chamados/{id}` | Autenticado | `{ titulo, descricao, urgencia, responsavelId?, versao }` | `200 ChamadoDTO` · 409 versão desatualizada |
| PATCH | `/api/chamados/{id}/status` | Autenticado | `{ status }` | `200 ChamadoDTO` |
| POST | `/api/chamados/{id}/atribuir-a-mim` | Autenticado | — | `200 ChamadoDTO` |
| PUT | `/api/chamados/{id}/posicao` | Autenticado | `{ posicao }` (1..n) | `200 ChamadoDTO` |
| GET | `/api/chamados/{id}/historico?pagina&tamanho` | Autenticado | — | `200 Página<HistoricoDTO>` (mais recente primeiro) |

A listagem usa consulta com `JOIN FETCH` de projeto e responsável (ou projeção direta no DTO) para evitar N+1, e `count` separado sem fetch.

### Dashboard
Todos aceitam `projetoId` opcional. Agregações feitas no banco (`GROUP BY`).

| Método | Rota | Perfil | Response |
|---|---|---|---|
| GET | `/api/dashboard/por-status` | Autenticado | `200 [ { status, total } ]` (inclui zeros) |
| GET | `/api/dashboard/por-urgencia` | Autenticado | `200 [ { urgencia, total } ]` |
| GET | `/api/dashboard/por-desenvolvedor` | Autenticado | `200 [ { usuario: { id, nome }, abertos, emAndamento, concluidos, total } ]` |
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
- **Fault tolerance:** `@Timeout` + `@CircuitBreaker` + `@Fallback` na leitura de configurações (endpoint público, chamado em toda carga do frontend); `@Timeout` nas consultas do dashboard. Sem `@Retry` em escritas (não são idempotentes).
- **Cache:** `@CacheResult` na leitura de configurações, `@CacheInvalidateAll` na alteração.
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

## 5. Testes previstos (backend)
- **Auth:** login válido, senha errada, usuário inativo, token ausente/inválido → 401.
- **Permissões:** dev recebe 403 em rotas de admin (usuários, projetos, configurações PUT); admin acessa.
- **Chamados:** criação (posição padrão e posição informada), validação, atribuição a outro dev, autoatribuição, mudança de status, lock otimista (409), reordenação (para cima/baixo, limites), histórico gerado.
- **Filtros:** cada filtro isolado e combinados; ordenação por urgência + posição; paginação.
- **Dashboard:** contagens por status, urgência, desenvolvedor e "meus chamados".
- **Configurações:** leitura pública, alteração restrita ao admin, validação de cor.
- PostgreSQL real via Dev Services (Testcontainers).

## 6. Telas previstas para o frontend (Parte 2)

| Tela | Perfil | Conteúdo |
|---|---|---|
| Login | Público | email/senha; aplica a paleta antes do login |
| Layout principal | Autenticado | barra lateral (cor `fundo`), cabeçalho com usuário e sair |
| Dashboard | Autenticado | cards/gráficos por status, urgência, desenvolvedor; "meus chamados"; filtro por projeto |
| Lista de chamados | Autenticado | tabela paginada, filtros combináveis (projeto, responsável, status, urgência, busca), badges de urgência |
| Novo chamado | Autenticado | formulário: projeto, título, descrição, urgência, responsável (ou "eu mesmo"), posição na fila |
| Detalhe/edição do chamado | Autenticado | edição, mudança de status, "atribuir a mim", histórico em linha do tempo |
| Fila do projeto | Autenticado | lista ordenada do projeto com arrastar-e-soltar para reordenar |
| Projetos | Admin | lista, criar, editar, arquivar/desarquivar |
| Usuários | Admin | lista, criar, editar, alterar perfil, desativar/reativar |
| Configurações | Admin | editor da paleta com pré-visualização e configurações gerais |
| Meu perfil | Autenticado | dados e troca de senha |
| Páginas de erro | — | 403 e 404 |

## 7. Ordem de execução (Parte 1)
1. Plano (este documento) — **aguardando aprovação**
2. Estrutura do monorepo
3. Entidades + migrations Flyway + seeds
4. Autenticação JWT e perfis
5. Módulos usuario e projeto
6. Módulo chamado
7. Módulos dashboard e configuracao
8. Erros, fault tolerance, health, Dockerfile
9. Testes (rodar e corrigir)
10. Atualizar este plano e o README

## 8. Notas para a Parte 2
*(preenchido ao final da Parte 1)*
