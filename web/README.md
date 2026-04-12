# VibeHub Web (P1 MVP)

Next.js full-stack implementation for VibeHub P1:
- 讨论广场（Posts API + 页面）
- 项目画廊（Projects API + 页面）
- 创作者页（Creators API + 页面）
- MCP v1 只读工具接口

## 1. Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## 2. API Conventions

- Base path: `/api/v1`
- Success response:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

- Error response:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

## 3. P1 Endpoints

### REST
- `GET /api/v1/health`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:slug`
- `GET /api/v1/creators`
- `GET /api/v1/creators/:slug`
- `GET /api/v1/posts`
- `POST /api/v1/posts` (requires demo login cookie)
- `POST /api/v1/comments` (requires demo login cookie)

### Auth (Demo)
- `GET /api/v1/auth/demo-login?role=user|admin&redirect=/`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`

### MCP v1
- `GET /api/v1/mcp/search_projects`
- `GET /api/v1/mcp/get_project_detail?slug=...`
- `GET /api/v1/mcp/search_creators`

## 4. PostgreSQL / Prisma

If you want real database mode:

```bash
# 1) set USE_MOCK_DATA=false and DATABASE_URL in .env.local
# 2) set SESSION_SECRET in .env.local
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

## 5. Self-Hosted Deployment

See:
- `infra/docker-compose.yml` (PostgreSQL)
- `infra/nginx/vibehub.conf` (reverse proxy)
- `infra/pm2/ecosystem.config.cjs` (Node process)
