# Chamados Joveretec

Ferramenta web de gestão de chamados para equipes de desenvolvimento: filas priorizáveis por projeto, atribuição (inclusive "atribuir a mim"), histórico de alterações, dashboard e paleta de cores configurável pelo administrador.

| Pasta | Conteúdo |
|---|---|
| `backend/` | API REST em Java 21 + Quarkus (arquitetura BCE), PostgreSQL, JWT |
| `frontend/` | Aplicação Angular 22 (standalone, zoneless, OnPush) |
| `docs/` | Planejamento, modelo de dados e endpoints: [PLANO.md](docs/PLANO.md) |
| `.github/workflows/` | CI: build e testes do backend e do frontend |
| [`PENDENCIAS.md`](PENDENCIAS.md) | Passos manuais de deploy, configuração e segurança |

## Rodar tudo localmente

### Pré-requisitos
- **JDK 21** (ex.: Eclipse Temurin)
- **Node.js ≥ 24.15** (o Angular 22 exige) e npm
- **Docker** em execução: o backend sobe um PostgreSQL sozinho em dev e nos testes (Dev Services)
- Maven **não** é necessário (use o wrapper `./mvnw`)

### 1. Backend (porta 8080)
```bash
cd backend
./mvnw quarkus:dev          # Windows: mvnw.cmd quarkus:dev
```
- API em `http://localhost:8080/api`, health check em `http://localhost:8080/q/health`
- Admin de desenvolvimento: `admin@joveretec.local` / `admin12345` (troque com `ADMIN_EMAIL` / `ADMIN_SENHA`)
- O banco de dev é um container temporário: os dados somem ao parar o backend

### 2. Frontend (porta 4200)
Em outro terminal:
```bash
cd frontend
npm install
npm start
```
Abra `http://localhost:4200` e entre com o admin de desenvolvimento. O frontend aponta para `http://localhost:8080` (`src/environments/environment.ts`), e o CORS do backend já libera `http://localhost:4200`.

### Roteiro rápido para conferir
1. Entre como admin. Em **Administração → Projetos**, crie um projeto. Em **Usuários**, crie um desenvolvedor.
2. Em **Novo chamado**, escolha projeto, urgência, responsável (outro dev ou "eu mesmo") e posição na fila.
3. Na **lista de chamados**, combine filtros e busca. A ordem é urgência e depois a posição na fila.
4. Abra um chamado: edite, mude o status, use **Atribuir a mim** e veja o histórico.
5. Em **Fila do projeto**, reordene arrastando ou com as setas.
6. Confira o **Dashboard** e troque a paleta em **Configurações**: a pré-visualização é imediata e, ao salvar, vale para todos.

## Testes
```bash
cd backend  && ./mvnw test           # 61 testes de API contra PostgreSQL real (requer Docker)
cd frontend && npm run test:ci       # 54 testes unitários (Vitest)
```
O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda os dois em todo push e pull request, além do build da imagem Docker e do build de produção do frontend.

## Build de produção
**Backend** (imagem usada no Render):
```bash
cd backend
docker build -t chamados-backend .
docker run -p 8080:8080 --env-file ../.env chamados-backend
```

**Frontend** (o mesmo comando que a Vercel executa):
```bash
cd frontend
API_URL=https://seu-backend.onrender.com npm run build:producao   # saída em dist/frontend/browser
```
`API_URL` é obrigatória no build de produção e é injetada no bundle; nenhuma URL fica fixa no código.

Todas as variáveis estão em [`.env.example`](.env.example). O passo a passo de deploy (Supabase, Render e Vercel) está em [PENDENCIAS.md](PENDENCIAS.md).

## Endpoints da API
Resumo; a lista completa com request/response está em [docs/PLANO.md](docs/PLANO.md#3-endpoints).

| Recurso | Rotas |
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me/senha` |
| Usuários | `GET/POST /api/usuarios`, `GET/PUT /api/usuarios/{id}`, `POST /api/usuarios/{id}/desativar` · `/reativar` |
| Projetos | `GET/POST /api/projetos`, `GET/PUT /api/projetos/{id}`, `POST /api/projetos/{id}/arquivar` · `/desarquivar` |
| Chamados | `GET/POST /api/chamados`, `GET/PUT /api/chamados/{id}`, `PATCH .../status`, `POST .../atribuir-a-mim`, `PUT .../posicao`, `GET .../historico` |
| Dashboard | `GET /api/dashboard/por-status` · `/por-urgencia` · `/por-desenvolvedor` · `/meus-chamados` |
| Configurações | `GET /api/configuracoes` (público), `PUT /api/configuracoes` (admin) |

## Estrutura do frontend
```
src/app/
├── core/          services HTTP tipados, modelos (DTOs), auth (sessão, interceptor, guards), tema, avisos
├── shared/        componentes (badges, paginação, confirmação), formulários, rótulos, carregamento reativo
├── layout/        shell: barra lateral + cabeçalho
└── features/      login, chamados (lista, novo, detalhe, fila), dashboard, admin, conta
```
Todas as rotas são lazy-loaded, todos os componentes usam `OnPush` e as chamadas HTTP ficam só nos services.
