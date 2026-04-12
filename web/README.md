# VibeHub Web (P1 + P2-1)

Next.js full-stack implementation for VibeHub.

Current scope:
- P1: discussions, project gallery, creator pages, MCP v1 read tools
- P2-1: admin RBAC, moderation queue, user list, reports + audit APIs

## 1. Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## 2. Quality Gate

```bash
npm run check
```

Runs `lint + test + build`.

## 3. API Conventions

- Base path: `/api/v1`
- Success shape:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "ISO8601"
  }
}
```

- Error shape:

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

## 4. P1 Public Endpoints

- `GET /api/v1/health`
- `GET /api/v1/projects`
- `GET /api/v1/projects/:slug`
- `GET /api/v1/creators`
- `GET /api/v1/creators/:slug`
- `GET /api/v1/posts` (approved posts only)
- `POST /api/v1/posts` (requires login; new post enters moderation queue)
- `POST /api/v1/comments` (requires login; approved post only)

### Demo Auth
- `GET /api/v1/auth/demo-login?role=user|admin&redirect=/`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/logout`

### MCP v1
- `GET /api/v1/mcp/search_projects`
- `GET /api/v1/mcp/get_project_detail?slug=...`
- `GET /api/v1/mcp/search_creators`

## 5. P2-1 Admin Endpoints (admin role required)

- `GET /api/v1/admin/overview`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/moderation/posts?status=pending|approved|rejected|all`
- `POST /api/v1/admin/moderation/posts/:postId/review` with body:

```json
{
  "action": "approve",
  "note": "optional moderation note"
}
```

- `GET /api/v1/admin/reports`
- `GET /api/v1/admin/audit-logs`

## 6. PostgreSQL / Prisma

If you want real database mode:

```bash
# 1) set USE_MOCK_DATA=false and DATABASE_URL in .env.local
# 2) set SESSION_SECRET in .env.local
npm run prisma:generate
npm run prisma:migrate -- --name p2_1_admin_moderation
npm run prisma:seed
npm run dev
```

## 7. Self-Hosted Deployment

See:
- `infra/docker-compose.yml` (PostgreSQL)
- `infra/nginx/vibehub.conf` (reverse proxy)
- `infra/pm2/ecosystem.config.cjs` (Node process)
