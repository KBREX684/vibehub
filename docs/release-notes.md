# VibeHub release notes

Updated: 2026-04-19

## 2026-04-19 — v11.1 warm-light UI redesign prompts published

Adds [`docs/v11.1-warm-ui-prompts.md`](./v11.1-warm-ui-prompts.md): a Claude
Code–inspired warm-light (eye-friendly) redesign brief for the v11 main
surface (6 pages + 11 components), with a dual-theme co-existence pattern
so legacy `/admin/**` and `/work/**` routes keep the dark Monochrome Geek
look. Implementation begins after PM signs off on the warm DNA color
(`#C45A2F` Anthropic Sienna) and the v11.1 scope.

No code change in this entry — planning only.

## 2026-04-19 — v11.0 final-chapter merged to main

V11.0 is the final-chapter convergence: VibeHub收口为 **"AI 工作留痕本
（Operation Ledger）"**, removing all parallel narratives.

- One-line position (frozen for 12 months):
  > "VibeHub — 你和 AI 一起做的工作，有据可查。"
- Three pillars: **Studio (do) → Ledger (sign) → Card (show)**
- Five new schemas: `LedgerEntry` (hash chain + ed25519 signature) /
  `AigcStamp` (GB 45438-2025 compliance) / `OpcProfile` / `OpcTrustMetric` /
  `LegalAttestationLink` (zhixin / baoquan judicial anchoring)
- Pricing collapsed to two tiers (Free + Pro ¥29/mo, Alipay China-only)
- 14 legacy v10 endpoints (teams / collaboration intents / team workspace
  creation) returns `410 Gone` with explicit deprecation codes
- New independent npm package: `packages/vibehub-verify` for offline
  ledger verification
- 90-day PMF gates (RFC §11): compliance-enabled rate ≥70%, monthly
  ledger export rate ≥30%, Pro conversion rate ≥5%
- 12-month freeze list (RFC §10): no team revival, no matching, no IM,
  no content feed, no agent marketplace, no IDE/repo/CI

Source of truth and execution plans:

- **`docs/v11.0-final-chapter-rfc.md`** — product RFC
- **`docs/v11.0-backend-tasks.md`** — backend role brief (GPT)
- **`docs/v11.0-frontend-tasks.md`** — frontend role brief (GLM)

Verification on the merged branch:
- `npm install` 752 packages OK
- `npx tsc --noEmit` 0 errors
- `npm run lint` 0 errors (warnings only)
- `npm run validate:openapi` 158 paths, 93.7% coverage
- `USE_MOCK_DATA=true npx vitest run` 81 files / 323 tests all pass
- `npm run build` OK (all routes compile)

PRs merged: #79 (docs) · #80 (BE) · #81 (FE).

## 2026-04-18 — v10.0 workspace-first surface (now historical)

V10.0 reshaped the product around a single thread (Discover → Intent →
Workspace → Agent Task → Snapshot/Deliverable), introduced
`/work/**` console, and shipped the personal/team Workspace + Snapshot
+ Deliverable + AgentTask schemas.

This line **is fully superseded by v11.0**. Workspace/Snapshot/
Deliverable/AgentTask data objects are retained and reused; team-side
write paths are now locked behind `TEAMS_DEPRECATED` / `INTENTS_DEPRECATED`
guards.

Historical reference (archived):
- `docs/ia-v10-refactor-plan.md`
- `docs/ui-v10-figma-prompts.md`

## 2026-04-18 — v9.0 ecosystem upgrade line published (now historical)

> ⚠️ V9.0 has been superseded by v11.0 final-chapter on 2026-04-19.
> Team Workspace is no longer a paid anchor — its team-side write paths
> are locked behind `TEAMS_DEPRECATED`. Snapshot Capsule, Agent governance,
> and compliance visibility were absorbed into the v11 Ledger main thread.

V9.0 formally shifts the product center from "community + team + agent surfaces" to **Team Workspace as the collaboration hub**.

- **New primary roadmap**: `docs/ecosystem-roadmap-v9.0.md`
- **New execution playbook**: `docs/ecosystem-implementation-plan-v9.0.md`
- **Updated current index**: `docs/roadmap-current.md` now points to V9.0 as the active line and treats v8 as the shipped baseline

V9.0 keeps the v8 foundation but narrows the next build line around five coordinated capabilities:

- Team Workspace as the core product and future paid anchor
- Snapshot Capsule as the handoff / rollback unit
- three-part Collaboration Request instead of prototype-style intent messaging
- Agent governance extended into workspace and snapshot operations
- restriction primitives and compliance visibility as China-ready product capabilities

The execution plan is no longer framed by broad version slogans alone. It is split into dependency-ordered subphases:

- `P0-1`, `P0-2`
- `P1-1`, `P1-2`
- `P2-1`, `P2-2`
- `P3-1`, `P3-2`
- `P4-1`, `P4-2`

Each subphase is expected to land end-to-end: schema, migration, API, OpenAPI, permissions, audit, UI, admin traceability, and checks.

## 2026-04-17 — v8.0 re-positioning: China-first AI+Human collaboration network (now historical)

> ⚠️ V8.0 has been superseded twice — first by v9.0 (Team Workspace), then
> by v11.0 (Operation Ledger). The v8 community / project gallery / team
> collaboration narratives are no longer active product directions.
> Underlying data tables (Post / Comment / Project / Team / etc.) are
> retained for data integrity but their write paths are locked.

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
