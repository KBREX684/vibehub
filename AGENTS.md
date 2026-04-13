# AGENTS.md

## Cursor Cloud specific instructions

### Overview

VibeHub is a **single Next.js 15 full-stack application** (App Router) in `/web`. It serves both the React frontend and all API routes from one process. There is no separate backend service.

### Running the dev environment

All commands below run from `/workspace/web`.

| Action | Command |
|---|---|
| Install deps | `npm install` |
| Dev server | `npm run dev` (port 3000) |
| Lint | `npm run lint` |
| Tests | `npm run test` (Vitest, 31 test files) |
| OpenAPI check | `npm run validate:openapi` |
| Full quality gate | `npm run check` (lint + test + validate:openapi + build) |
| Build | `npm run build` |

### Mock data mode (default)

The app defaults to `USE_MOCK_DATA=true` (set in `.env.local`). In this mode **no database, Redis, Stripe, or external service is required**. All data is served from in-memory mock repositories. This is the recommended mode for development and testing.

### Demo authentication

GitHub OAuth is not needed in development. Use the demo-login endpoint:

```
GET /api/v1/auth/demo-login?role=user&redirect=/
GET /api/v1/auth/demo-login?role=admin&redirect=/
```

The session cookie is set automatically. Use `-c`/`-b` with `curl`, or just visit the URL in a browser.

### Non-obvious gotchas

- `.env.local` must exist (copy from `.env.example`). The update script creates it if missing.
- `npm run build` runs `prisma generate` as a prebuild step. This is expected even in mock mode since some types are referenced from generated Prisma client.
- The `next lint` deprecation warning is cosmetic — lint still works.
- Vitest tests are pure unit/integration tests against mock repositories; they don't start the server. No special setup needed beyond `npm install`.
