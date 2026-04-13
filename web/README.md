# VibeHub Web (P1 + P2)

Next.js full-stack implementation for VibeHub.

**P3 is officially closed** (2026-04-13): team collaboration slices P3-1…P3-7 plus status-column task board are frozen on `main`. Deferred: in-app team notifications, finer task RBAC, billing/subscriptions — see `docs/03_项目日志.md`.

**P4-1 / P4-2 (2026-04-13)**: User **API keys** with **scopes** (`ApiKey.scopes` JSON); manage at **`/settings/api-keys`**. **`Authorization: Bearer <vh_...>`** works on scoped **GET** routes (projects, teams, team tasks/milestones, creators, collection-topics, `me/teams`, MCP `search_projects` / `search_creators` / `get_project_detail`) when the key includes the route’s required scope. **Cookie session** still grants full access on those routes. **Breaking:** unauthenticated anonymous `GET` on those paths now returns **401** (browser pages keep working via session cookie).

Current scope:
- P1: discussions, project gallery, creator pages, MCP v1 read tools
- P3-1: teams (list/create/detail, owner invite by email, member leave / owner remove)
- P3-2: team join **requests** (apply → owner approve/reject); `POST .../join` creates a pending request
- P3-3: optional **project ↔ team** link (`teamId`), discover filter `team=`, creator `PATCH` to bind
- P3-4: **TeamTask** board per team (`todo` / `doing` / `done`), members-only API + UI on team page
- P3-5: **TeamMilestone** timeline (target date, completed, sortOrder), members-only API + UI on team page
- P3-6: **TeamTask.sortOrder** + list ordering; optional `sortOrder` on create/PATCH; `POST .../tasks/:taskId/reorder` for up/down
- P3-7: optional **task → milestone** link (`TeamTask.milestoneId`), validated per team; cleared on milestone delete (FK SetNull + mock parity)
- P3 sweep: **status-column kanban** on team task board; `reorder` applies **within the same status** only
- P2-1: admin RBAC, moderation queue, user list, reports + audit APIs
- P2-2: collaboration intent submit/review workflow
- P2-3: topic collections, leaderboards, collaboration funnel metrics
- P2-4: discover page (investor/ops radar), extended project filters + facets API
- P2-5: weekly leaderboards (UTC Monday week) with optional materialized snapshots + admin materialize API

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
- `GET /api/v1/projects` (optional `team=<teamSlug>`)
- `GET /api/v1/projects/:slug`
- `PATCH /api/v1/projects/:slug` (login required, **creator only**) body `{ "teamSlug": "my-team" | null }` — unlink with `null`
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
- `GET /api/v1/mcp/search_projects` (optional `team=`) (optional `query`, `tag`, `tech`, `status`, `page`, `limit`; invalid `status` returns `400`)
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
- Collaboration moderation (P2-2):
  - `GET /api/v1/admin/collaboration-intents`
  - `POST /api/v1/admin/collaboration-intents/:intentId/review` with body `{ "action": "approve" | "reject", "note": "optional" }`
- Weekly leaderboard materialization (P2-5):
  - `POST /api/v1/admin/leaderboards/weekly/materialize` with JSON body:

```json
{
  "weekStart": "2026-04-06",
  "kind": "discussions_by_weekly_comment_count",
  "limit": 15
}
```

  - `kind` may be `discussions_by_weekly_comment_count` or `projects_by_weekly_collaboration_intent_count`; `weekStart` must be a UTC Monday (`YYYY-MM-DD`) or omit for the current week.

## 6. P2 Public Endpoints (non-admin)

- Collaboration:
  - `GET /api/v1/projects/:slug/collaboration-intents?status=approved|pending|rejected|all`
  - `POST /api/v1/projects/:slug/collaboration-intents`
- Topics:
  - `GET /api/v1/collection-topics`
  - `GET /api/v1/collection-topics/:slug`
- Leaderboards:
  - `GET /api/v1/leaderboards/discussions?limit=10`
  - `GET /api/v1/leaderboards/projects?limit=10`
  - `GET /api/v1/leaderboards/weekly/discussions?limit=10&week=YYYY-MM-DD` (Monday, UTC; omit `week` for current week)
  - `GET /api/v1/leaderboards/weekly/projects?limit=10&week=YYYY-MM-DD`
- Metrics:
  - `GET /api/v1/metrics/collaboration-intent-funnel`
- Discovery filters:
  - `GET /api/v1/projects?query=&tag=&tech=&status=&team=&page=&limit=` (**P4-2**: session cookie or Bearer key with scope `read:projects:list`)
  - `GET /api/v1/projects/facets` (still public; no scope gate in P4-2)
- Current user teams (for project team picker):
  - `GET /api/v1/me/teams` (session cookie or Bearer with `read:teams:self`)
- API keys (P4-1 + P4-2, session cookie only for manage endpoints):
  - `GET /api/v1/me/api-keys`
  - `POST /api/v1/me/api-keys` body `{ "label", "scopes"? }` — response includes `key.secret` **once**; default `scopes` include all P4-2 read scopes + `read:public`
  - `DELETE /api/v1/me/api-keys/:keyId`
- Team milestones (P3-5, team members only):
  - `GET /api/v1/teams/:slug/milestones` (**P4-2**: GET also accepts Bearer with `read:team:milestones` when caller is a member)
  - `POST /api/v1/teams/:slug/milestones` body `{ "title", "description"?, "targetDate" (ISO), "sortOrder"? }`
  - `PATCH /api/v1/teams/:slug/milestones/:milestoneId` body partial `{ "title", "description"|null, "targetDate", "completed", "sortOrder" }`
  - `DELETE /api/v1/teams/:slug/milestones/:milestoneId`
- Team tasks (P3-4 + P3-6 sort + P3-7 milestone link, team members only):
  - `GET /api/v1/teams/:slug/tasks` (ordered by `sortOrder` asc, then `updatedAt` desc; **P4-2** Bearer needs `read:team:tasks`)
  - `POST /api/v1/teams/:slug/tasks` body `{ "title", "description"?, "status"?, "assigneeUserId"?, "sortOrder"?, "milestoneId"?|null }`
  - `PATCH /api/v1/teams/:slug/tasks/:taskId` body partial `{ "title", "description"|null, "status", "assigneeUserId"|null, "sortOrder"?, "milestoneId"|null }`
  - `POST /api/v1/teams/:slug/tasks/:taskId/reorder` body `{ "direction": "up" | "down" }` — swaps `sortOrder` with the adjacent task **in the same status column** (todo / doing / done)
  - `DELETE /api/v1/teams/:slug/tasks/:taskId`
- Teams (P3-1 + P3-2):
  - `GET /api/v1/teams?page=&limit=` (**P4-2**: cookie or Bearer `read:teams:list`)
  - `POST /api/v1/teams` (login required) body `{ "name", "slug"?, "mission"? }`
  - `GET /api/v1/teams/:slug` (cookie or Bearer `read:team:detail`; viewer-specific fields use the authenticated user id)
  - `POST /api/v1/teams/:slug/join` (login required) body `{ "message"? }` — creates a **pending join request** (not immediate membership)
  - `POST /api/v1/teams/:slug/join-requests/:requestId/review` (owner only) body `{ "action": "approve" | "reject" }`
  - `POST /api/v1/teams/:slug/members` (owner only) body `{ "email" }` — user must exist (direct add; clears pending request for that user)
  - `DELETE /api/v1/teams/:slug/members/:userId` (self or owner; cannot remove owner)

## 7. PostgreSQL / Prisma

If you want real database mode:

```bash
# 1) set USE_MOCK_DATA=false and DATABASE_URL in .env.local
# 2) set SESSION_SECRET in .env.local
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Apply all pending migrations in `prisma/migrations/` (P2 adds collaboration intents, weekly snapshot tables, and prior admin schema).

**Production / staging:** after setting `DATABASE_URL`, run `npx prisma migrate deploy` (same command CI uses) before starting the app; avoid `migrate dev` on shared databases.

## 8. Self-Hosted Deployment

See:
- `infra/docker-compose.yml` (PostgreSQL)
- `infra/nginx/vibehub.conf` (reverse proxy)
- `infra/pm2/ecosystem.config.cjs` (Node process)
