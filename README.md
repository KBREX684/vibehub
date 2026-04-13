# VibeHub Workspace

This repository hosts the VibeHub product planning assets and the P1 full-stack implementation.

## Structure

- `VibeHub_项目计划书_v3.0.md`: Strategic plan
- `docs/01_实现计划图.md`: Stage-based implementation map
- `docs/02_Debug表.md`: Debug tracker template + first entries
- `docs/03_项目日志.md`: Project log template + kickoff log
- `web/`: Next.js full-stack website (P1 MVP; **P2** slices P2-1…P2-5; **P3 officially closed** on 2026-04-13; **P4** open API: keys, scopes, rate limits, `/api/v1/public/*`, **`GET /api/v1/openapi.json`**, **OpenAPI validate gate (P4-5)** — see `docs/01_实现计划图.md` (v2.7) and `docs/03_项目日志.md`)

## Quick Start (Web)

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```
