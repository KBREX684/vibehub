# VibeHub deployment and rollback (v8 W8)

## Runtime topology

- **Next.js**: `npm run start` (port 3000 by default).
- **WebSocket chat**: `npm run ws:serve` — configure `WS_PORT`, `WS_PATH`, `NEXT_BASE_URL`, `INTERNAL_SERVICE_SECRET`, `REDIS_URL`, and matching `CHAT_WS_TOKEN_SECRET` / `NEXT_PUBLIC_WS_URL` in the Next app.
- **MCP stdio**: `npm run mcp:serve` — production + `DATABASE_URL` requires `ALLOW_PRODUCTION_MCP_STDIO=true` (see `mcp-server.ts`).

PM2 example: `web/infra/pm2/ecosystem.config.cjs` (adjust `cwd` to your server path).

## Data stores and required services

- **PostgreSQL**: required for production (`DATABASE_URL`). Apply migrations: `npx prisma migrate deploy`.
- **Redis**: required for production-like distributed rate limits, MCP/agent throttles, recent-alert readiness, and multi-instance WebSocket fan-out (`REDIS_URL`). Included in `web/infra/docker-compose.yml`.
- **SMTP**: required for production email verification / password reset flows.
- **Payment providers**: at least one production-ready provider (`alipay`, `wechatpay`, or `stripe`) must be configured before go-live.
- **Admin AI provider**: optional. If omitted, admin AI falls back to heuristic suggestions and `/health` reports `ai=fallback`.

## Health checks

- **App**: `GET /api/v1/health` — includes DB (when not in mock mode), Redis, WebSocket, SMTP, payments, and admin-AI readiness.
- **Admin**: `GET /api/v1/admin/health` and `/admin/health` — include recent unresolved alerts.
- **Production**: mock data is disabled when `NODE_ENV=production`; `DATABASE_URL` and `SESSION_SECRET` are required at Node bootstrap (`instrumentation.ts`).

## Logs

- Server logs use **pino** (`src/lib/logger.ts`). Set `LOG_LEVEL` as needed; production defaults to JSON-friendly structured output.
- Runtime route handlers should emit `requestId`, `path`, `status`, and `durationMs`.
- `console.*` is reserved for seeds and maintenance scripts, not runtime request paths.

## Deployment sequence

1. Confirm secrets: `DATABASE_URL`, `SESSION_SECRET`, `REDIS_URL`, `INTERNAL_SERVICE_SECRET`, SMTP, payment provider keys, and optional admin-AI provider.
2. Verify data store readiness:
   - `docker compose -f infra/docker-compose.yml up -d postgres redis`
   - external DB/Redis health if using managed services
3. Back up the database before any schema change.
4. Deploy code and install dependencies.
5. Run:
   - `npm run prisma:generate`
   - `npx prisma migrate deploy`
   - `npm run build`
6. Reload processes:
   - `pm2 reload web/infra/pm2/ecosystem.config.cjs`
7. Verify:
   - `GET /api/v1/health`
   - `GET /api/v1/admin/health`
   - `WS_HEALTH_URL`
   - one MCP invoke
   - one billing checkout rehearsal in the target environment

## Rollback

1. Roll application processes back to the previous Git revision or artifact.
2. Rebuild and reload PM2 processes.
3. Do **not** attempt ad-hoc down-migrations unless a matching rollback migration was prepared and reviewed.
4. Restore the database from the pre-deploy backup if a schema/data rollback is required.
5. Re-run health checks:
   - `/api/v1/health`
   - `/api/v1/admin/health`
   - WebSocket `/health`
6. Review recent `SystemAlert` records after rollback to confirm no lingering provider or Redis failures.

## Backup and failure SOP

- Run a daily PostgreSQL backup job.
- Run an extra PostgreSQL backup immediately before `prisma migrate deploy`.
- If Redis is unavailable in production-like mode:
  - expect `/health` to degrade
  - do not scale WS horizontally until Redis is restored
  - treat in-memory rate-limit fallback as temporary only
- If billing webhooks fail:
  - inspect `/admin/health` recent alerts
  - check provider-specific webhook credentials
  - replay failed provider callbacks only after signature validation is fixed
- If admin AI provider fails:
  - `/health` should show `ai=fallback`
  - moderation can continue with heuristic suggestions until provider credentials recover

## nginx

- Terminate TLS and proxy WebSocket upgrades for the path configured in `WS_PATH` (default `/ws`) to the WS process port.
