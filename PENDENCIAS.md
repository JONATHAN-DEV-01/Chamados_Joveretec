# Pendências manuais

Tudo o que precisa ser feito à mão para colocar o sistema no ar, mais o que ficou de fora e os problemas conhecidos.
O código, os testes, o CI e os arquivos de deploy (`backend/Dockerfile`, `render.yaml`, `frontend/vercel.json`) já estão no repositório.

**Ordem recomendada:** 1. Supabase → 2. Chaves JWT → 3. Render → 4. Vercel → 5. Voltar ao Render para ajustar o CORS → 6. Segurança pós-deploy.

---

## 1. Banco de dados — Supabase

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

1. Em <https://vercel.com/new>, importe o repositório `JONATHAN-DEV-01/Chamados_Joveretec`.
2. **Root Directory:** `frontend`. O resto (build `npm run build:producao`, saída `dist/frontend/browser`, rewrite da SPA, cabeçalhos) vem do `frontend/vercel.json`.
3. **Environment Variables:** `API_URL` = URL do Render **sem** `/api` e sem barra final (ex.: `https://chamados-backend.onrender.com`). Marque *Production* e *Preview*.
4. Em **Settings → General → Node.js Version**, selecione **24.x**. O Angular 22 exige Node ≥ 24.15.
5. **Deploy**. A **Production Branch** (em *Settings → Git*) deve ser `main`.
6. Anote o domínio final (ex.: `https://chamados-joveretec.vercel.app`) para o próximo passo.

> Sem `API_URL`, o build falha de propósito, com a mensagem "Defina a variável de ambiente API_URL".

## 5. Ajustar o CORS no Render

1. No Render, edite `CORS_ORIGINS` com o domínio da Vercel, sem barra final. Para vários domínios, separe por vírgula:
   ```
   CORS_ORIGINS=https://chamados-joveretec.vercel.app
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
| `CORS_ORIGINS` | sim | Origens permitidas, separadas por vírgula | `https://chamados-joveretec.vercel.app` |
| `ADMIN_NOME` | não | Nome do admin inicial. Padrão `Administrador` | `Administrador` |
| `ADMIN_EMAIL` | sim | E-mail do admin inicial | `admin@joveretec.com.br` |
| `ADMIN_SENHA` | sim | Senha **inicial** do admin (8 a 72 caracteres) | — |
| `PORT` | automática | Porta HTTP, definida pelo Render | — |

`ADMIN_*` só tem efeito enquanto não existe nenhum admin no banco. Depois da primeira subida, mudar essas variáveis não altera nada, mas elas precisam continuar definidas para a aplicação iniciar (veja [Segurança](#8-segurança)).

### Frontend (Vercel)
| Variável | Obrigatória | Descrição | Exemplo |
|---|---|---|---|
| `API_URL` | sim (build de produção) | URL pública do backend, sem `/api` e sem barra final | `https://chamados-backend.onrender.com` |

Em desenvolvimento, o frontend usa `src/environments/environment.ts` (`http://localhost:8080`) e não precisa de variável.

## 7. GitHub: CI, secrets e fluxo de branches

- **Secrets do CI:** **nenhum é necessário.** O workflow `.github/workflows/ci.yml` só compila e testa: o backend usa PostgreSQL via Docker no próprio runner, e o build do frontend usa uma `API_URL` fictícia. O deploy é feito pelas integrações nativas do Render e da Vercel com o GitHub, então não há tokens no repositório.
  - *(Opcional)* Para deploy só depois do CI verde, desligue o auto-deploy do Render, crie um **Deploy Hook** no Render, cadastre-o como secret `RENDER_DEPLOY_HOOK_URL` em *Settings → Secrets and variables → Actions* e acrescente um job que faça `curl -X POST "$RENDER_DEPLOY_HOOK_URL"` após os testes na `main`. Esse job não foi implementado.
- **Estado do CI:** já rodou no GitHub e está **verde nos 3 jobs** (Backend, Backend Docker, Frontend). A primeira execução falhou porque o `mvnw` tinha sido versionado no Windows sem permissão de execução, e isso já foi corrigido. Se algum dia aparecer `exit code 126` de novo, rode `git update-index --chmod=+x backend/mvnw`.
- **Pull Request:** o trabalho das Partes 1 e 2 foi feito **direto na branch `main`**, conforme autorizado durante a Parte 1, porque não havia branch de worktree. Por isso **não há PR para abrir nem merge a fazer**: a `main` já tem tudo. Se quiser revisão formal daqui em diante:
  1. Crie uma branch por mudança (`git switch -c minha-mudanca`), faça push e abra o PR para a `main` no GitHub.
  2. Em *Settings → Branches → Add rule* para `main`, marque **Require a pull request before merging** e **Require status checks to pass**, selecionando os jobs do CI.
- **Deploy a partir da `main`:** no Render, *Settings → Build & Deploy → Branch* = `main` e Auto-Deploy *On Commit*. Na Vercel, *Settings → Git → Production Branch* = `main`. Os dois já vêm assim nas instruções acima.

## 8. Segurança

- [ ] **Trocar a senha do admin inicial** logo após o primeiro login: menu do usuário (canto superior direito) → **Minha conta → Alterar senha**. Depois, troque também o valor de `ADMIN_SENHA` no Render por outro valor aleatório. A variável não é mais usada, mas precisa existir, e assim a senha antiga não fica guardada lá.
- [ ] **Chaves JWT de produção** geradas só para produção (passo 2), nunca reutilizadas de dev/test e fora do Git.
- [ ] **CORS** restrito ao domínio final da Vercel (passo 5). Nunca use `*`.
- [ ] Senha do banco forte e única. Ative 2FA nas contas do Supabase, Render, Vercel e GitHub.
- [ ] Criar contas individuais para cada pessoa (nada de usuário compartilhado) e deixar **no mínimo dois admins** ativos.
- [ ] `npm audit` (frontend): **0 vulnerabilidades nas dependências de produção**. Há 2 alertas (1 alto, 1 baixo) no **Vite**, usado só pelo `ng serve` de desenvolvimento. Não rode `ng serve` exposto na rede (`--host 0.0.0.0`) e atualize `@angular/build` quando sair um patch da linha 22.2. *Não* aplique o `npm audit fix --force`, que faz downgrade.
- [ ] *(Recomendado)* Cabeçalho **Content-Security-Policy** na Vercel. Não foi adicionado para não arriscar quebrar o app sem testes no domínio final. Sugestão inicial: `default-src 'self'; connect-src 'self' https://<backend>.onrender.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:`.

## 9. Não implementado / melhorias futuras

- **Sessão:** não há refresh token nem revogação. O token vale até expirar (8h). Um usuário desativado continua *lendo* até lá, mas qualquer alteração já retorna 403.
- **Recuperação de senha** ("esqueci minha senha") e convite por e-mail. Hoje o admin define a senha inicial e o usuário a troca em *Minha conta*.
- **Notificações** (e-mail ou similar) quando um chamado é atribuído ou muda de status.
- **Comentários e anexos** em chamados. **Exclusão** de chamados, usuários ou projetos (hoje só arquivar/desativar, para preservar o histórico).
- **Listas de seleção com mais de 100 itens:** os selects de projeto e responsável e a tela de fila carregam até 100 registros, o limite de página do backend. Com equipes ou projetos maiores, trocar por campos com busca (autocomplete) e paginar a fila.
- **Busca textual** usa `ILIKE` sem índice. Para volume grande, criar `pg_trgm` e um índice GIN em `titulo`/`descricao`.
- **Testes end-to-end** automatizados (ex.: Playwright) no CI. O fluxo completo foi verificado manualmente no navegador (veja abaixo).
- **Rate limit** no login, contra força bruta. **Monitoramento e alertas** (logs JSON já saem prontos para um coletor).
- **Cache da paleta** é local a cada instância do backend. Com mais de uma instância, a troca de paleta demora a aparecer nas outras.
- **Internacionalização:** a interface é só em português.

## 10. Problemas conhecidos e decisões que merecem revisão

- **Testes:** todos passando. Backend: 61 (`./mvnw test`). Frontend: 54 (`npm run test:ci`). Build de produção do frontend e imagem Docker do backend OK. **Nenhum teste falhando.**
- **Verificação ponta a ponta (manual, local):** login como admin, criar projeto, criar dev, criar chamados (com responsável, "eu mesmo" e posição), filtros e busca, detalhe com edição, status, "atribuir a mim", histórico, aviso de conflito 409, reordenação pelos botões, dashboard, troca e restauração da paleta, login como dev (sem menus de admin e com `/admin` bloqueado), e layout em 390px sem rolagem horizontal. Foram encontrados e corrigidos 3 problemas visuais. **Não deu para verificar o arrastar-e-soltar com o mouse:** a automação do navegador não conseguia enviar cliques à página nessa sessão, então a fila foi testada pelos botões subir/descer e por testes unitários. Teste o arrasto manualmente uma vez.
- **Render Free hiberna** após inatividade: o primeiro acesso pode levar cerca de 30 a 60 s. A tela de login avisa disso. Para uso diário, considere uma instância paga.
- **Sessão em `sessionStorage`:** fechar a aba desloga. É mais seguro, mas pode incomodar. Trocar para `localStorage` em `core/auth/auth.service.ts` é uma linha, ao custo de manter o token entre abas.
- **Cores de status nos gráficos e badges** (azul, âmbar, verde-água) foram validadas para legibilidade e daltonismo sobre o **fundo escuro padrão**. Se o admin escolher uma paleta clara, elas continuam visíveis, mas não foram revalidadas. A tela de configurações avisa apenas sobre o contraste de texto e destaque.
- **Qualquer usuário autenticado pode editar qualquer chamado.** Foi uma decisão da Parte 1 (ferramenta de equipe). Se só o criador, o responsável ou o admin deveriam editar, é preciso uma regra no backend.
- **Requisito de Node ≥ 24.15** (Angular 22): máquinas ou CI com Node mais antigo falham no `ng` com uma mensagem clara. A Vercel precisa estar em 24.x (passo 4.4).
- **Datas** são exibidas no fuso do navegador (`pt-BR`), a partir de UTC vindo da API.
