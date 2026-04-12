# VibeHub Workspace

This repository hosts the VibeHub product planning assets and the P1 full-stack implementation.

## Structure

- `VibeHub_项目计划书_v3.0.md`: Strategic plan
- `docs/01_实现计划图.md`: Stage-based implementation map
- `docs/02_Debug表.md`: Debug tracker template + first entries
- `docs/03_项目日志.md`: Project log template + kickoff log
- `web/`: Next.js full-stack website (P1 MVP; **P2** slices P2-1…P2-5: admin/moderation, collaboration intents, collections + all-time leaderboards + funnel metrics, `/discover` project radar, weekly leaderboards + optional snapshots — see `docs/01_实现计划图.md` and `docs/03_项目日志.md` for closure vs plan gaps)

## Quick Start (Web)

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```
