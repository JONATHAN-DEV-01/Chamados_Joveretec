# Pendências manuais

Tudo o que precisa ser feito à mão para colocar o sistema no ar, mais o que ficou de fora e os problemas conhecidos.
O código, os testes, o CI e os arquivos de deploy (`backend/Dockerfile`, `render.yaml`, `frontend/vercel.json`) já estão no repositório.

**O sistema já está no ar** (seção 0). As seções 1 a 5 e 9 ficam como referência, para refazer o deploy ou trocar uma credencial. Ordem usada: 1. Supabase (banco) → 2. Chaves JWT → 3. Render → 4. Vercel → 5. Voltar ao Render para ajustar o CORS → 9. Supabase Storage (buckets e variáveis dos anexos) → 8. Segurança pós-deploy.

---

## 0. Estado da produção (conferido em 30/10/2026)

| Parte | Endereço | Situação |
|---|---|---|
| Frontend (Vercel) | <https://chamados-joveretec-ten.vercel.app> | No ar. Cabeçalhos do `vercel.json` aplicados e bundle apontando para o backend abaixo. |
| Backend (Render, Free) | <https://chamados-backend-l7vy.onrender.com> | `/q/health` responde `UP`, com o banco `UP`. O CORS libera só o domínio da Vercel; outra origem recebe 403. |
| Banco (Supabase, região *East US*) | Session pooler `aws-0-us-east-1` | PostgreSQL 17. Migrations V1 a V3 aplicadas em 24/10. RLS ligado em todas as tabelas de `public`. Já tem uso real: usuários, projetos, chamados, acompanhamentos e anexos. |
| Storage (Supabase) | Buckets `chamados-anexos` e `sistema` | Os dois privados, com a política restritiva do `storage.sql`. O upload TUS funciona em produção (seção 9.5). |
| Repositório | `JONATHAN-DEV-01/Chamados_Joveretec` | **Público.** Deploy automático no Render e na Vercel a cada push na `main`. |

**O que falta agora, por prioridade:**
- [ ] **Manter o backend acordado de verdade:** o ping do GitHub Actions está rodando só a cada ~5–6 h, e o backend continua dormindo (a primeira resposta levou ~75 s). Configure o UptimeRobot ou o cron-job.org (seção 12).
- [ ] **Criar um segundo admin**: hoje há só um ativo (seção 8).
- [ ] **Apagar as cópias locais das chaves JWT** (`jwt-privada.pem` e `jwt-publica.pem` na raiz do projeto), depois de guardar a privada num cofre (seção 2).
- [ ] Revisar o restante da checklist de [Segurança](#8-segurança).
- [ ] Testar uma vez o arrastar-e-soltar da fila com o mouse (seção 11).

## 1. Banco de dados — Supabase

> ✅ Concluído. O projeto em produção ficou na região *East US* (`aws-0-us-east-1`).

1. Acesse <https://supabase.com>, entre na conta e clique em **New project**.
2. Escolha a organização, dê um nome (ex.: `chamados-joveretec`) e escolha a região mais próxima dos usuários e do Render (ex.: *South America (São Paulo)*).
3. Defina uma **senha forte para o banco** e guarde-a num gerenciador de senhas. Ela vira o `DB_PASSWORD`.
4. Espere o projeto ficar pronto e clique em **Connect** (topo da página).
5. Escolha **Session pooler**. Não use *Direct connection*, que é IPv6 e não funciona no Render, nem *Transaction pooler*, que quebra prepared statements do JDBC.
6. Anote **host**, **porta** (5432), **database** (`postgres`) e **user** (formato `postgres.<ref-do-projeto>`) e monte a URL JDBC:
   ```
   DB_URL=jdbc:postgresql://aws-0-<regiao>.pooler.supabase.com:5432/postgres?sslmode=require
   DB_USER=postgres.<ref-do-projeto>
   DB_PASSWORD=<senha do passo 3>
   ```
7. Não é preciso criar tabelas: o Flyway cria tudo, com a paleta padrão, na primeira subida do backend.

## 2. Chaves JWT de produção

> ✅ Chaves cadastradas no Render. Falta apagar as cópias locais (`*.pem` na raiz do projeto) depois de guardar a privada num cofre.

Gere um par RSA só para produção, num terminal com OpenSSL (o Git Bash já tem):
```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt-privada.pem
openssl pkey -in jwt-privada.pem -pubout -out jwt-publica.pem
```
- `JWT_PRIVATE_KEY` = conteúdo completo de `jwt-privada.pem` (inclusive as linhas `-----BEGIN/END PRIVATE KEY-----`).
- `JWT_PUBLIC_KEY` = conteúdo completo de `jwt-publica.pem`.
- **Não versione** os arquivos (`*.pem` está no `.gitignore`). Depois de cadastrar no Render, guarde a privada num cofre e apague as cópias locais.
- Trocar as chaves invalida todas as sessões abertas. Isso é útil se houver suspeita de vazamento.

## 3. Backend — Render

> ✅ Concluído: `https://chamados-backend-l7vy.onrender.com`.

**Opção A, Blueprint (usa o `render.yaml`):**
1. Em <https://dashboard.render.com>: **New → Blueprint**, conecte o GitHub e selecione `JONATHAN-DEV-01/Chamados_Joveretec`.
2. O Render lê o `render.yaml` e pede os valores marcados como secretos. Preencha conforme a [tabela de variáveis](#6-variáveis-de-ambiente). Para `CORS_ORIGINS`, use por enquanto `http://localhost:4200`; ele é ajustado no passo 5.
3. Clique em **Apply**.

**Opção B, Web Service manual:**
1. **New → Web Service** e selecione o repositório.
2. **Branch:** `main` · **Root Directory:** `backend` · **Runtime/Language:** `Docker` (o Render encontra o `Dockerfile`) · **Instance type:** Free (ou pago, para não hibernar).
3. Em **Advanced → Health Check Path:** `/q/health/ready`.
4. Em **Environment**, cadastre todas as variáveis do backend da [tabela](#6-variáveis-de-ambiente). **Não** crie `PORT`, que o Render define sozinho.
5. **Auto-Deploy:** *On Commit*, para que cada push na `main` gere um deploy.

**Conferência:** ao fim do deploy, abra `https://<seu-servico>.onrender.com/q/health/ready`. Deve responder `"status": "UP"`, com o check do banco UP. O log mostra `Profile prod activated` e `Administrador inicial criado.` na primeira vez. Sem alguma variável obrigatória, a aplicação não sobe e o log diz qual falta. Isso é proposital.

## 4. Frontend — Vercel

> ✅ Concluído: `https://chamados-joveretec-ten.vercel.app`. O domínio `chamados-joveretec.vercel.app`, usado como exemplo nas versões anteriores deste arquivo, **não** é deste projeto (responde 404).

1. Em <https://vercel.com/new>, importe o repositório `JONATHAN-DEV-01/Chamados_Joveretec`.
2. **Root Directory:** `frontend`. O resto (build `npm run build:producao`, saída `dist/frontend/browser`, rewrite da SPA, cabeçalhos) vem do `frontend/vercel.json`.
3. **Environment Variables:** `API_URL` = URL do Render **sem** `/api` e sem barra final (ex.: `https://chamados-backend-l7vy.onrender.com`). Marque *Production* e *Preview*.
4. Em **Settings → General → Node.js Version**, selecione **24.x**. O Angular 22 exige Node ≥ 24.15.
5. **Deploy**. A **Production Branch** (em *Settings → Git*) deve ser `main`.
6. Anote o domínio final (ex.: `https://chamados-joveretec-ten.vercel.app`) para o próximo passo.

> Sem `API_URL`, o build falha de propósito, com a mensagem "Defina a variável de ambiente API_URL".

## 5. Ajustar o CORS no Render

> ✅ Concluído e conferido em 30/10: o preflight vindo da Vercel recebe `Access-Control-Allow-Origin` com o domínio dela, e outra origem recebe 403.

1. No Render, edite `CORS_ORIGINS` com o domínio da Vercel, sem barra final. Para vários domínios, separe por vírgula:
   ```
   CORS_ORIGINS=https://chamados-joveretec-ten.vercel.app
   ```
2. Se usar deploys de *Preview* da Vercel, que têm um domínio diferente a cada deploy, inclua também o domínio de preview fixo do projeto, ou teste as previews contra um backend de staging.
3. Salve. O Render reinicia o serviço. Teste o login pelo domínio da Vercel.

## 6. Variáveis de ambiente

### Backend (Render)
| Variável | Obrigatória em prod | Descrição | Exemplo |
|---|---|---|---|
| `DB_URL` | sim | URL JDBC do Supabase (Session pooler, `sslmode=require`) | `jdbc:postgresql://aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require` |
| `DB_USER` | sim | Usuário do pooler | `postgres.abcdefghijkl` |
| `DB_PASSWORD` | sim | Senha do banco (passo 1.3) | — |
| `JWT_PRIVATE_KEY` | sim | Chave privada RSA em PEM, com BEGIN/END | `-----BEGIN PRIVATE KEY-----…` |
| `JWT_PUBLIC_KEY` | sim | Chave pública RSA em PEM, com BEGIN/END | `-----BEGIN PUBLIC KEY-----…` |
| `JWT_ISSUER` | não | Emissor (`iss`) do token. Padrão `https://chamados.joveretec.com.br` | `https://chamados.joveretec.com.br` |
| `JWT_DURACAO_MINUTOS` | não | Validade do token. Padrão 480 (8h) | `480` |
| `CORS_ORIGINS` | sim | Origens permitidas, separadas por vírgula | `https://chamados-joveretec-ten.vercel.app` |
| `ADMIN_NOME` | não | Nome do admin inicial. Padrão `Administrador` | `Administrador` |
| `ADMIN_EMAIL` | sim | E-mail do admin inicial | `admin@joveretec.com.br` |
| `ADMIN_SENHA` | sim | Senha **inicial** do admin (8 a 72 caracteres) | — |
| `PORT` | automática | Porta HTTP, definida pelo Render | — |
| `ARMAZENAMENTO_TIPO` | não | `supabase` (padrão em produção) ou `local` (só dev/test: grava no disco do servidor, que no Render é apagado a cada deploy) | `supabase` |
| `SUPABASE_URL` | sim | URL do projeto (Project Settings → API) | `https://abcdefghijkl.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave **secreta** (`service_role` ou `sb_secret_…`). Só no Render, **nunca** na Vercel nem no frontend | — |
| `SUPABASE_ANON_KEY` | recomendada | Chave **pública** (`anon` ou `sb_publishable_…`), repassada ao navegador no header `apikey` do upload TUS | `eyJhbGciOi…` ou `sb_publishable_…` |
| `STORAGE_BUCKET` | não | Bucket privado dos anexos. Padrão `chamados-anexos` | `chamados-anexos` |

`ADMIN_*` só tem efeito enquanto não existe nenhum admin no banco. Depois da primeira subida, mudar essas variáveis não altera nada, mas elas precisam continuar definidas para a aplicação iniciar (veja [Segurança](#8-segurança)).

### Frontend (Vercel)
| Variável | Obrigatória | Descrição | Exemplo |
|---|---|---|---|
| `API_URL` | sim (build de produção) | URL pública do backend, sem `/api` e sem barra final | `https://chamados-backend-l7vy.onrender.com` |

Em desenvolvimento, o frontend usa `src/environments/environment.ts` (`http://localhost:8080`) e não precisa de variável. O frontend **não** recebe nenhuma chave do Supabase por variável: a chave pública necessária para o upload vem do backend junto com a autorização de cada envio.

## 7. GitHub: CI, secrets e fluxo de branches

- **Secrets do CI:** **nenhum é necessário.** O workflow `.github/workflows/ci.yml` só compila e testa: o backend usa PostgreSQL via Docker no próprio runner, e o build do frontend usa uma `API_URL` fictícia. O deploy é feito pelas integrações nativas do Render e da Vercel com o GitHub, então não há tokens no repositório.
  - *(Opcional)* Para deploy só depois do CI verde, desligue o auto-deploy do Render, crie um **Deploy Hook** no Render, cadastre-o como secret `RENDER_DEPLOY_HOOK_URL` em *Settings → Secrets and variables → Actions* e acrescente um job que faça `curl -X POST "$RENDER_DEPLOY_HOOK_URL"` após os testes na `main`. Esse job não foi implementado.
- **Estado do CI:** já rodou no GitHub e está **verde nos 3 jobs** (Backend, Backend Docker, Frontend). A primeira execução falhou porque o `mvnw` tinha sido versionado no Windows sem permissão de execução, e isso já foi corrigido. Se algum dia aparecer `exit code 126` de novo, rode `git update-index --chmod=+x backend/mvnw`.
- **Pull Request:** o trabalho das Partes 1, 2 e 3 foi feito **direto na branch `main`**, conforme autorizado durante a Parte 1, porque não havia branch de worktree. Por isso **não há PR para abrir nem merge a fazer**: a `main` já tem tudo. Se quiser revisão formal daqui em diante:
  1. Crie uma branch por mudança (`git switch -c minha-mudanca`), faça push e abra o PR para a `main` no GitHub.
  2. Em *Settings → Branches → Add rule* para `main`, marque **Require a pull request before merging** e **Require status checks to pass**, selecionando os jobs do CI.
- **Deploy a partir da `main`:** no Render, *Settings → Build & Deploy → Branch* = `main` e Auto-Deploy *On Commit*. Na Vercel, *Settings → Git → Production Branch* = `main`. Os dois já vêm assim nas instruções acima.

## 8. Segurança

- [ ] **Trocar a senha do admin inicial** logo após o primeiro login: menu do usuário (canto superior direito) → **Minha conta → Alterar senha**. Depois, troque também o valor de `ADMIN_SENHA` no Render por outro valor aleatório. A variável não é mais usada, mas precisa existir, e assim a senha antiga não fica guardada lá.
- [ ] **Chaves JWT de produção** geradas só para produção (passo 2), nunca reutilizadas de dev/test e fora do Git. **Ainda há cópias de `jwt-privada.pem` e `jwt-publica.pem` na raiz do projeto local:** guarde a privada num cofre e apague as duas.
- [x] **CORS** restrito ao domínio final da Vercel (passo 5). Nunca use `*`. *Conferido em 30/10.*
- [x] **Buckets do Storage privados**, com a política restritiva, e **RLS ligado** em todas as tabelas de `public`. *Conferido em 30/10.*
- [ ] Senha do banco forte e única. Ative 2FA nas contas do Supabase, Render, Vercel e GitHub.
- [ ] **Troque a senha do banco** se ela tiver circulado fora do gerenciador de senhas (chat, e-mail, print): *Supabase → Project Settings → Database → Reset database password*, e depois atualize `DB_PASSWORD` no Render.
- [ ] **O repositório é público:** nunca versione `.env`, `*.pem`, senhas ou chaves. O `.gitignore` já cobre `.env*` e `*.pem`.
- [ ] Criar contas individuais para cada pessoa (nada de usuário compartilhado) e deixar **no mínimo dois admins** ativos. **Hoje há só um admin ativo.**
- [ ] `npm audit` (frontend): **0 vulnerabilidades nas dependências de produção**. Há 2 alertas (1 alto, 1 baixo) no **Vite**, usado só pelo `ng serve` de desenvolvimento. Não rode `ng serve` exposto na rede (`--host 0.0.0.0`) e atualize `@angular/build` quando sair um patch da linha 22.2. *Não* aplique o `npm audit fix --force`, que faz downgrade.
- [ ] **Service role key do Supabase** só no Render (`SUPABASE_SERVICE_ROLE_KEY`). Confira que ela **não** está na Vercel, no `.env` versionado nem em logs. Ela ignora todas as políticas do Storage e do banco. Se vazar, gere uma nova em *Project Settings → API Keys* e atualize o Render.
- [ ] *(Recomendado)* Cabeçalho **Content-Security-Policy** na Vercel. Não foi adicionado para não arriscar quebrar o app sem testes no domínio final. Sugestão inicial (inclui o Supabase para upload, download e prévia de imagens): `default-src 'self'; connect-src 'self' https://<backend>.onrender.com https://<ref>.supabase.co; img-src 'self' data: https://<ref>.supabase.co; style-src 'self' 'unsafe-inline'`.

## 9. Supabase Storage (após o deploy)

> ✅ Concluído: os buckets e a política foram criados, as variáveis foram cadastradas e o upload foi validado em produção.

Os anexos ficam no Supabase Storage, em buckets **privados**. O navegador envia o arquivo direto ao Storage (upload resumível TUS), com um token de curta duração gerado pelo backend para um caminho definido por ele. O download também usa URLs assinadas de 5 minutos. O backend no Render nunca recebe o binário.

1. **Criar os buckets e as políticas.** Escolha uma das opções:
   - **Por SQL (recomendado):** *Dashboard → SQL Editor → New query*, cole o conteúdo de [`docs/supabase/storage.sql`](docs/supabase/storage.sql) e clique em **Run**. O script é idempotente. Ele cria `chamados-anexos` e `sistema` como **privados** e uma política *restritiva* que impede acesso direto de `anon`/`authenticated`, mesmo que alguém crie outra política no futuro. A última consulta deve listar os 2 buckets com `public = false`.
   - **Pela interface:** *Storage → New bucket* → nome `chamados-anexos`, **Public bucket desligado** → *Create*. Repita para `sistema`, também privado e reservado para uso futuro, como o logo do sistema. **Não** crie políticas (*Policies*) para esses buckets: sem políticas, só a service role e as URLs/tokens assinados têm acesso.
2. **Conferir a estrutura de pastas.** Depois do primeiro anexo, em *Storage → chamados-anexos* devem aparecer caminhos como:
   ```
   projetos/{projetoId}/chamados/{chamadoId}/abertura/{anexoId}-{nome-sanitizado}
   projetos/{projetoId}/chamados/{chamadoId}/acompanhamentos/{acompanhamentoId}/{anexoId}-{nome-sanitizado}
   ```
   As pastas são criadas automaticamente pelos uploads, sem nada para criar à mão.
3. **Limite de tamanho por arquivo.** A aplicação **não** impõe limite: vale o *Global file size limit* em *Storage → Settings*. No plano **Free** o máximo é **50 MB**; para arquivos maiores é preciso o plano **Pro** ou superior (configurável até **500 GB**). Se o Storage recusar um arquivo pelo tamanho, o usuário vê "O arquivo é maior que o limite permitido pelo armazenamento". Os buckets foram criados sem limite próprio (`file_size_limit = null`), para valer o global.
4. **Cadastrar as variáveis no Render** (*Environment*):
   - `SUPABASE_URL`: *Project Settings → API → Project URL*.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave **secreta** (`service_role`, ou a nova `sb_secret_…`). **Só no Render.** Nunca na Vercel, no frontend ou no Git.
   - `SUPABASE_ANON_KEY`: chave **pública** (`anon`, ou `sb_publishable_…`). Ela é segura para o navegador e vai no header `apikey` do upload.
   - `STORAGE_BUCKET` = `chamados-anexos` (opcional, é o padrão) e `ARMAZENAMENTO_TIPO` = `supabase` (opcional, é o padrão em produção).
   - Salve. Com `ARMAZENAMENTO_TIPO=supabase` e sem `SUPABASE_URL` ou a service role key, a aplicação **não sobe** e o log explica o motivo.
5. **Testar o fluxo:** abra um chamado e anexe um arquivo pequeno num acompanhamento. Ele deve chegar a "Enviado", aparecer no card depois de publicar e baixar pelo botão **Baixar**. Confira o objeto em *Storage → chamados-anexos*.
   - **Validado em produção:** o upload TUS assinado (`/storage/v1/upload/resumable/sign`, com o token no header `x-signature`) funciona contra o Supabase real. Em 30/10 havia anexos `CONCLUIDO` no banco, com os objetos correspondentes em `chamados-anexos`. Se um dia o envio falhar com 404 ou 401 logo no início, confira o log do navegador. O caminho pode ser ajustado **sem mudar código**, pela propriedade `supabase.storage.tus-path` (ex.: com a variável de ambiente `SUPABASE_STORAGE_TUS_PATH=/storage/v1/upload/resumable`).
6. **CORS do Storage:** a API do Supabase Storage já responde com CORS liberado, e o upload e o download funcionam a partir de qualquer origem com token válido. Normalmente **não há nada a configurar**. Se o navegador acusar erro de CORS no upload (aba *Console*), libere o domínio da Vercel nas configurações de CORS/API do projeto Supabase, se a opção existir no seu plano, e teste de novo.
7. **Custos.** Acompanhe em *Project Settings → Usage*: **armazenamento** (GB guardados) e **egress** (GB baixados; cada download e cada prévia de imagem conta). O plano Free tem cotas pequenas para os dois. Ao crescer, considere o plano Pro, limites de tamanho e uma rotina de arquivamento de anexos antigos.
8. **Limpeza automática:** anexos que ficaram *pendentes* (upload abandonado) e rascunhos de acompanhamento com mais de **24h** são removidos de hora em hora pelo backend, inclusive no Storage. Não é preciso configurar nada.

## 10. Não implementado / melhorias futuras

- **Sessão:** não há refresh token nem revogação. O token vale até expirar (8h). Um usuário desativado continua *lendo* até lá, mas qualquer alteração já retorna 403.
- **Recuperação de senha** ("esqueci minha senha") e convite por e-mail. Hoje o admin define a senha inicial e o usuário a troca em *Minha conta*.
- **Notificações** (e-mail, push ou integração com chat) quando um chamado é atribuído, recebe acompanhamento ou muda de status.
- **Acompanhamentos privados** (visíveis só para a equipe interna ou para admins).
- **Antivírus nos anexos** (ex.: varredura assíncrona após o upload, com quarentena antes de liberar o download).
- **Limite de tamanho por perfil** (ex.: desenvolvedores até X MB, admins sem limite), validado no pedido de envio. Hoje vale só o limite global do Storage.
- Adicionar anexos a um acompanhamento **já publicado** (hoje os anexos entram só ao criar o acompanhamento, ou na abertura do chamado).
- **Exclusão** de chamados, usuários ou projetos (hoje só arquivar/desativar, para preservar o histórico).
- **Listas de seleção com mais de 100 itens:** os selects de projeto e responsável e a tela de fila carregam até 100 registros, o limite de página do backend. Com equipes ou projetos maiores, trocar por campos com busca (autocomplete) e paginar a fila.
- **Busca textual** usa `ILIKE` sem índice. Para volume grande, criar `pg_trgm` e um índice GIN em `titulo`/`descricao`.
- **Testes end-to-end** automatizados (ex.: Playwright) no CI. O fluxo completo foi verificado manualmente no navegador (veja abaixo).
- **Rate limit** no login, contra força bruta. **Monitoramento e alertas** (logs JSON já saem prontos para um coletor).
- **Cache da paleta** é local a cada instância do backend. Com mais de uma instância, a troca de paleta demora a aparecer nas outras.
- **Internacionalização:** a interface é só em português.

## 11. Problemas conhecidos e decisões que merecem revisão

- **Testes:** todos passando. Backend: **106** (`./mvnw test`). Frontend: **99** (`npm run test:ci`). Build de produção do frontend e imagem Docker do backend OK. **Nenhum teste falhando.**
- **Parte 3, verificação ponta a ponta (manual, local, armazenamento `local`):** criação de chamado com anexo (envio logo após a criação), feed com abertura, eventos e acompanhamentos, Markdown seguro (HTML escapado), anexo em acompanhamento com publicação só depois do envio, prévia de imagem, download, Solução concluindo o chamado, tempo total, última atividade na lista e "Últimas atualizações" no dashboard. Um problema encontrado e corrigido: o resumo do dashboard mostrava a marcação do Markdown. Na época, o upload TUS contra um Supabase real não pôde ser testado. **Ele já foi validado em produção** (passo 9.5). O contrato com a API REST do Storage também tem testes contra um servidor falso.
- **Anexos de acompanhamento usam rascunho:** o primeiro arquivo escolhido cria um rascunho no backend, porque o caminho no bucket precisa do id. Se o usuário sair sem publicar, o rascunho e os arquivos são removidos pela limpeza de 24h. Até lá eles ocupam espaço no Storage.
- **Armazenamento `local`** é só para desenvolvimento: no Render o disco é efêmero e os arquivos somem a cada deploy. Em produção use sempre `supabase`, que já é o padrão.
- **"Mostrar itens anteriores" no feed** pagina a partir do mais recente. Se alguém publicar enquanto você navega por páginas antigas, um item pode aparecer repetido ou ser pulado até recarregar a página.
- **Datas relativas** ("há 5 minutos") são calculadas na renderização e não se atualizam sozinhas com a página parada.
- **Verificação ponta a ponta (manual, local):** login como admin, criar projeto, criar dev, criar chamados (com responsável, "eu mesmo" e posição), filtros e busca, detalhe com edição, status, "atribuir a mim", histórico, aviso de conflito 409, reordenação pelos botões, dashboard, troca e restauração da paleta, login como dev (sem menus de admin e com `/admin` bloqueado), e layout em 390px sem rolagem horizontal. Foram encontrados e corrigidos 3 problemas visuais. **Não deu para verificar o arrastar-e-soltar com o mouse:** a automação do navegador não conseguia enviar cliques à página nessa sessão, então a fila foi testada pelos botões subir/descer e por testes unitários. Teste o arrasto manualmente uma vez.
- **Render Free hiberna** depois de ~15 min sem tráfego, e a subida a frio leva ~55 s. O ping periódico (seção 12) ainda **não** resolve sozinho: em 30/10 a primeira resposta levou ~75 s. Se a instância ainda estiver dormindo, o app mostra o splash e a tela de carregamento com o aviso "O servidor pode estar acordando". Para garantia total, use uma instância paga.
- **Sessão em `sessionStorage`:** fechar a aba desloga. É mais seguro, mas pode incomodar. Trocar para `localStorage` em `core/auth/auth.service.ts` é uma linha, ao custo de manter o token entre abas.
- **Cores de status nos gráficos e badges** (azul, âmbar, verde-água) foram validadas para legibilidade e daltonismo sobre o **fundo escuro padrão**. Se o admin escolher uma paleta clara, elas continuam visíveis, mas não foram revalidadas. A tela de configurações avisa apenas sobre o contraste de texto e destaque.
- **Qualquer usuário autenticado pode editar qualquer chamado.** Foi uma decisão da Parte 1 (ferramenta de equipe). Se só o criador, o responsável ou o admin deveriam editar, é preciso uma regra no backend.
- **Requisito de Node ≥ 24.15** (Angular 22): máquinas ou CI com Node mais antigo falham no `ng` com uma mensagem clara. A Vercel precisa estar em 24.x (passo 4.4).
- **Datas** são exibidas no fuso do navegador (`pt-BR`), a partir de UTC vindo da API.

## 12. Manter o backend acordado (Render Free)

O Render gratuito "dorme" depois de ~15 min sem requisições, e a primeira requisição seguinte espera a subida (~55 s). Para evitar isso, algo precisa chamar `https://chamados-backend-l7vy.onrender.com/q/health` a cada 10 minutos. Essa rota é do SmallRye Health, é pública e também testa o banco, o que mantém o Supabase ativo.

**Já configurado no repositório:** o workflow [`.github/workflows/manter-acordado.yml`](.github/workflows/manter-acordado.yml) faz esse ping a cada 10 min, com 3 tentativas de 90 s para cobrir a subida a frio. Não precisa de secret nem de conta nova.
- Para conferir: *GitHub → Actions → "Manter backend acordado"*. Execuções verdes indicam que o backend respondeu 200. Dá para rodar na hora em **Run workflow**.
- Se a URL do backend mudar: *Settings → Secrets and variables → Actions → Variables → New repository variable* `BACKEND_HEALTH_URL` com a nova URL, sem editar o arquivo.
- **Limitações do GitHub:** o agendamento é "melhor esforço". **Na prática, ele está rodando a cada ~5–6 h, não a cada 10 min.** Em 30/10 as execuções foram às 00:20, 06:17, 13:12 e 18:40 (UTC). Todas verdes, mas o Render dorme entre elas. O agendamento também é **desativado automaticamente após 60 dias sem commits** no repositório. Contando do último commit, em 23/10/2026, isso acontece por volta de 22/12/2026. O GitHub avisa por e-mail; reative em *Actions → Manter backend acordado → Enable workflow*.

**Necessário, porque o GitHub sozinho não basta: UptimeRobot** (gratuito, intervalo mínimo de 5 min no plano Free):
1. Crie uma conta em <https://uptimerobot.com>. Precisa ser feito por você, porque envolve cadastro e senha.
2. **Add New Monitor** → *Monitor Type*: **HTTP(s)**.
3. *Friendly Name*: `Chamados backend` · *URL*: `https://chamados-backend-l7vy.onrender.com/q/health` · *Monitoring Interval*: **10 minutes**, ou 5.
4. *(Opcional)* Em *Alert Contacts*, deixe seu e-mail: você recebe um aviso se o backend cair, o que vira um monitoramento de graça.
5. **Create Monitor**.

Alternativa equivalente: <https://cron-job.org> → *Create cronjob* → URL acima → *Every 10 minutes* → *Save*.

> **Horas grátis do Render:** uma instância Free acordada o mês inteiro consome cerca de 730 h das **750 h/mês** gratuitas da conta. Cabe, mas não sobra para um segundo serviço gratuito sempre ligado.
