# VibeHub Workspace

VibeHub is a developer-first community and delivery platform for independent builders
and small teams. The current repository focus is maturity convergence: align product,
code, and docs around the main loop of community -> project -> collaboration -> delivery.

## Current product direction

- Developer-first, small-team-first
- Subscription model unified to `free | pro`
- Enterprise capability kept as a secondary observer layer, not the product center
- Real database + seed is the preferred validation path; mock mode is explicit opt-in

## Primary entry points

- `web/`: Next.js full-stack app
- `docs/roadmap-current.md`: current execution line and acceptance priorities
- `docs/release-notes.md`: merged change history and notable closures
- `docs/repository-cleanup-report.md`: repository cleanup decisions, retain/archive/delete rationale
- `docs/roadmap-history.md`: archived historical planning material

## Historical reference material

- `VibeHub_项目计划书_v3.0.md`: historical strategy source
- `docs/01_实现计划图.md`: historical implementation map
- `docs/02_Debug表.md`: historical debug tracker
- `docs/03_项目日志.md`: historical execution log

## Quick Start (Web)

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

## Recommended verification paths

Mock-assisted local development:

```bash
cd web
USE_MOCK_DATA=true npm run test
```

Real database smoke path:

```bash
cd web
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run smoke:live-data
```
