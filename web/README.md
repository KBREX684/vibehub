# VibeHub Web

Next.js full-stack implementation for VibeHub's current product strategy:
developer-first, small-team-first, Free + Pro, with enterprise verification
kept as a badge-only secondary capability instead of a separate workspace line.

## Current Product Scope

- Community publishing and discussion flows
- Creator profiles and project discovery
- Small-team collaboration: join requests, milestones, tasks, chat
- Developer tooling: API keys, OpenAPI, MCP v2, public API mirrors
- Pro subscription: quotas, billing checkout/portal, plan gating
- Enterprise verification badge and admin review workflow

## Quality Gate

- `npm run check` runs lint, unit tests, OpenAPI validation, type generation,
  and production build
- CI (`.github/workflows/p1-gate.yml`) now also runs `prisma db seed` +
  `npm run smoke:live-data` as a required live-data gate
- `docs/roadmap-current.md` is the primary execution roadmap
- `docs/release-notes.md` tracks shipped milestones and change history
- `docs/repository-cleanup-report.md` tracks retention / archive / delete
  decisions for repository assets

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

Runs `lint + test + validate:openapi + build`.

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

- **OpenAPI (P4-4 + P4-5)**:
  - `GET /api/v1/openapi.json` — OpenAPI 3.0 document (public)
  - Local/CI: `npm run validate:openapi` (structural + required paths; see `src/lib/openapi-validate.ts`)

- Collaboration:
  - `GET /api/v1/projects/:slug/collaboration-intents?status=approved|pending|rejected|all`
  - `POST /api/v1/projects/:slug/collaboration-intents`
- Topics:
  - `GET /api/v1/collection-topics` (anonymous or cookie or Bearer with `read:topics:list`)
  - `GET /api/v1/collection-topics/:slug`
- Public mirrors (P4-3, **no auth**, same payloads as canonical GETs):
  - `GET /api/v1/public/projects?...`
  - `GET /api/v1/public/projects/:slug`
  - `GET /api/v1/public/teams?...`
  - `GET /api/v1/public/teams/:slug`
  - `GET /api/v1/public/creators?...`
  - `GET /api/v1/public/creators/:slug`
  - `GET /api/v1/public/collection-topics`
  - `GET /api/v1/public/collection-topics/:slug`
- Leaderboards:
  - `GET /api/v1/leaderboards/discussions?limit=10`
  - `GET /api/v1/leaderboards/projects?limit=10`
  - `GET /api/v1/leaderboards/weekly/discussions?limit=10&week=YYYY-MM-DD` (Monday, UTC; omit `week` for current week)
  - `GET /api/v1/leaderboards/weekly/projects?limit=10&week=YYYY-MM-DD`
- Metrics:
  - `GET /api/v1/metrics/collaboration-intent-funnel`
- Discovery filters:
  - `GET /api/v1/projects?query=&tag=&tech=&status=&team=&page=&limit=` (anonymous **or** cookie **or** Bearer with `read:projects:list`; Bearer is rate-limited)
  - `GET /api/v1/projects/facets` (still public)
- Current user teams (for project team picker):
  - `GET /api/v1/me/teams` (session cookie or Bearer with `read:teams:self`; Bearer rate-limited)
- API keys (P4-1…P4-3, session cookie only for manage endpoints):
  - `GET /api/v1/me/api-keys`
  - `POST /api/v1/me/api-keys` body `{ "label", "scopes"? }` — response includes `key.secret` **once**; UI sends `read:public` plus checked scopes (defaults match former full read set)
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

Real database mode is the preferred verification path. Runtime selection uses
the following order in local development:

1. `USE_MOCK_DATA=true` → force mock mode
2. `DATABASE_URL` present → use Prisma/PostgreSQL
3. no `DATABASE_URL` → safe fallback to mock mode so local builds and CI can still render pages

Mock mode remains acceptable for demos and isolated UI work, but product
acceptance should use the seeded database path below.

If you want a local real-database run:

```bash
# 1) set DATABASE_URL in .env.local
# 2) set SESSION_SECRET in .env.local
# 3) keep USE_MOCK_DATA unset (or set to false)
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run smoke:live-data
npm run dev
```

If you explicitly want mock mode for a demo-only run:

```bash
USE_MOCK_DATA=true npm run dev
```

Apply all pending migrations in `prisma/migrations/` (P2 adds collaboration intents, weekly snapshot tables, and prior admin schema).

**Production / staging:** mock data is not allowed. Set `DATABASE_URL` and
`SESSION_SECRET`, run `npx prisma migrate deploy` (same command CI uses), then
start the app. Avoid `migrate dev` on shared databases.

## 8. Self-Hosted Deployment

See:
- `infra/docker-compose.yml` (PostgreSQL)
- `infra/nginx/vibehub.conf` (reverse proxy)
- `infra/pm2/ecosystem.config.cjs` (Node process)
