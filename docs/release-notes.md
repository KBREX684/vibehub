# VibeHub release notes

Updated: 2026-04-16

## Current release baseline

- Developer-first product strategy
- Small-team collaboration as the primary execution loop
- Free + Pro subscription model only
- Enterprise capabilities treated as a secondary observer layer
- Real database + seed path documented as the primary validation route

## Recent notable changes

### 2026-04-16 — launch readiness gap analysis (roadmap v7.0)

- Added `docs/launch-readiness-standard.md` — frozen standard for Go-Live control.
- Added `docs/roadmap-v7.md` — gap analysis against launch readiness standard.
  - Identified 4 hard blockers: no email login, production mock fallback, incomplete fail-fast, missing China payment path.
  - Identified 6 enhancement gaps: compliance checklist, agent binding model, audit log coverage, payment abstraction, alerting, rollback SOP.
  - Execution plan with dependency graph and acceptance criteria.

### 2026-04-14 — maturity convergence pass

- Unified the runtime data-mode guidance so mock mode is opt-in instead of the default truth source.
- Separated enterprise workspace capability from platform admin governance.
- Tightened homepage, developer hub, and workspace copy around community -> project -> team delivery.
- Reframed enterprise workspace as a secondary radar workspace rather than a primary product flywheel.
- Reorganized documentation entry points into:
  - `docs/roadmap-current.md`
  - `docs/roadmap-history.md`
  - `docs/release-notes.md`
  - `docs/repository-cleanup-report.md`

### Historical execution notes

Detailed stage-by-stage execution records remain preserved in:

- `docs/03_项目日志.md`
- `docs/02_Debug表.md`
- `docs/01_实现计划图.md`

These files are retained as historical records and should not be treated as the current execution entry point.
