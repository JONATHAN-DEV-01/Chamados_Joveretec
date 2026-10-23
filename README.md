# Chamados Joveretec

Ferramenta web de gestão de chamados para equipes de desenvolvimento: filas priorizáveis por projeto, atribuição, histórico de alterações, dashboard e paleta de cores configurável.

| Pasta | Conteúdo |
|---|---|
| `backend/` | API REST em Java 21 + Quarkus (arquitetura BCE) |
| `frontend/` | Aplicação Angular (Parte 2) |
| `docs/` | Planejamento, modelo de dados e endpoints: [PLANO.md](docs/PLANO.md) |

## Backend

### Pré-requisitos
- **JDK 21** (ex.: Eclipse Temurin)
- **Docker** em execução: em dev e nos testes o Quarkus sobe um PostgreSQL sozinho (Dev Services)
- Maven **não** é necessário (use o wrapper `./mvnw`)

### Rodar localmente (modo dev)
```bash
cd backend
./mvnw quarkus:dev          # Windows: mvnw.cmd quarkus:dev
```
- API em `http://localhost:8080/api`
- Health check em `http://localhost:8080/q/health`
- Dev UI em `http://localhost:8080/q/dev-ui`
- Admin inicial de dev: `admin@joveretec.local` / `admin12345` (pode ser trocado com `ADMIN_EMAIL` / `ADMIN_SENHA`)
- Chaves JWT temporárias são geradas automaticamente, e o banco é recriado a cada execução do modo dev

Teste rápido:
```bash
curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@joveretec.local","senha":"admin12345"}'
```

### Testes
```bash
cd backend
./mvnw test
```
São 61 testes de API (JUnit 5 + RestAssured) contra um PostgreSQL real em container.

### Usar um PostgreSQL próprio no modo dev
Se você passar a URL do banco, o Dev Services não sobe o container:
```bash
./mvnw quarkus:dev -Dquarkus.datasource.jdbc.url=jdbc:postgresql://localhost:5432/chamados \
  -Dquarkus.datasource.username=postgres -Dquarkus.datasource.password=...
```

### Produção (Docker)
```bash
cd backend
docker build -t chamados-backend .
docker run -p 8080:8080 --env-file ../.env chamados-backend
```
Todas as variáveis estão documentadas em [`.env.example`](.env.example). Em produção são obrigatórias as de banco, as chaves JWT (`JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` em PEM), o admin inicial e `CORS_ORIGINS`. Instruções de deploy (Render + Supabase) estão em [docs/PLANO.md](docs/PLANO.md#8-notas-para-a-parte-2).

### Endpoints
Resumo; a lista completa com request/response está em [docs/PLANO.md](docs/PLANO.md#3-endpoints).

| Recurso | Rotas |
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me`, `PUT /api/auth/me/senha` |
| Usuários | `GET/POST /api/usuarios`, `GET/PUT /api/usuarios/{id}`, `POST /api/usuarios/{id}/desativar` · `/reativar` |
| Projetos | `GET/POST /api/projetos`, `GET/PUT /api/projetos/{id}`, `POST /api/projetos/{id}/arquivar` · `/desarquivar` |
| Chamados | `GET/POST /api/chamados`, `GET/PUT /api/chamados/{id}`, `PATCH .../status`, `POST .../atribuir-a-mim`, `PUT .../posicao`, `GET .../historico` |
| Dashboard | `GET /api/dashboard/por-status` · `/por-urgencia` · `/por-desenvolvedor` · `/meus-chamados` |
| Configurações | `GET /api/configuracoes` (público), `PUT /api/configuracoes` (admin) |
