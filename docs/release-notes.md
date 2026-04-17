# VibeHub release notes

Updated: 2026-04-17

## 2026-04-17 — v8.0 re-positioning: China-first AI+Human collaboration network

v8.0 is not "one more feature cycle". It is a full re-framing of VibeHub:

- **New strategy doc**: `docs/product-strategy-v8.md` — supersedes `VibeHub_项目计划书_v3.0.md` (v4 pro edition) as the single source of strategic truth.
- **Market**: China mainland · Chinese-speaking developers only · no overseas-first i18n.
- **Audience**: VibeCoders, small-team leads, Agent builders.
- **Four pillars**: discussion square · project gallery · team collaboration · **Agent collaboration bus**.
- **Unique moat**: AI agents are first-class teammates with role cards, audit, confirmation queues, and human-in-the-loop for every risky write. Four modes of collaboration supported: human↔human, human↔agent, same-user agent↔agent, cross-user agent↔agent (gated). Agent autonomy is explicitly forbidden in v8.
- **Business**: Free + Pro (¥29/mo) as the public pricing model. Team is deferred to a later commerce phase. MCP Developer Access remains application-only in P1. No burn-rate growth.
- **Cost discipline**: platform never pays for user-side LLM inference; domestic models preferred; monthly infra budget capped at ¥3100.
- **Explicit non-goals** (frozen): challenges, enterprise workspace rebuild, multi-agent autonomy, self-hosted LLM, code hosting, CI/CD, light-mode, PWA, overseas market, subsidies.

**New roadmap**: `docs/roadmap-v8.md` rewrites v8.0 into eight parallel workstreams (W1 IA rewrite / W2 design-system / W3 agent collaboration bus / W4 community flywheel / W5 developer ecosystem / W6 commerce+compliance / W7 admin+AI / W8 infra+observability) across Alpha/Beta/GA phases. Ten GA gates, three north-star metrics (WAHC / AO% / Agent rejection rate), and full acceptance criteria across function / visual / perf / security / cost.

The earlier v8 maturity-convergence roadmap (published earlier today) is replaced by this re-framing.

`docs/roadmap-current.md` updated to surface the new strategy and roadmap as the primary tracks; `launch-readiness-standard.md` remains the final gate.

Updated (historical): 2026-04-14

## Current release baseline

- Developer-first product strategy
- Small-team collaboration as the primary execution loop
- Free + Pro subscription model only
- Enterprise verification treated as badge-only identity review
- Real database + seed path documented as the primary validation route

## Recent notable changes

### 2026-04-14 — maturity convergence pass

- Unified the runtime data-mode guidance so mock mode is opt-in instead of the default truth source.
- Separated enterprise workspace capability from platform admin governance.
- Tightened homepage, developer hub, and workspace copy around community -> project -> team delivery.
- Reframed enterprise verification as badge-only identity review rather than a workspace product flywheel.
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
