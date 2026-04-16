# VibeHub deployment (v7 P0-12)

## Processes

- **Next.js**: `npm run start` (port 3000 by default).
- **WebSocket chat**: `npm run ws:serve` — configure `WS_PORT`, `WS_PATH`, `NEXT_BASE_URL`, `INTERNAL_SERVICE_SECRET`, `REDIS_URL`, and matching `CHAT_WS_TOKEN_SECRET` / `NEXT_PUBLIC_WS_URL` in the Next app.
- **MCP stdio**: `npm run mcp:serve` — production + `DATABASE_URL` requires `ALLOW_PRODUCTION_MCP_STDIO=true` (see `mcp-server.ts`).

PM2 example: `web/infra/pm2/ecosystem.config.cjs` (adjust `cwd` to your server path).

## Data stores

- **PostgreSQL**: required for production (`DATABASE_URL`). Apply migrations: `npx prisma migrate deploy`.
- **Redis**: optional but recommended for distributed rate limits and WebSocket scaling (`REDIS_URL`). Included in `web/infra/docker-compose.yml`.

## Health checks

- **App**: `GET /api/v1/health` — includes DB (when not in mock mode), Redis, and optional `WS_HEALTH_URL` for the WS process.
- **Production**: mock data is disabled when `NODE_ENV=production`; `DATABASE_URL` and `SESSION_SECRET` are required at Node bootstrap (`instrumentation.ts`).

## Logs

- Server logs use **pino** (`src/lib/logger.ts`). Set `LOG_LEVEL` as needed; production defaults to JSON-friendly structured output.

## Rollback

- Revert to the previous Git revision and redeploy.
- Run `npx prisma migrate deploy` only after verifying migration compatibility; keep DB backups before schema upgrades.

## nginx

- Terminate TLS and proxy WebSocket upgrades for the path configured in `WS_PATH` (default `/ws`) to the WS process port.
