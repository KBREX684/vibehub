# VibeHub release notes

Updated: 2026-04-16

## Current release baseline

- Developer-first product strategy
- Small-team collaboration as the primary execution loop
- Free + Pro subscription model only
- Enterprise capabilities treated as a secondary observer layer
- Real database + seed path documented as the primary validation route

## Recent notable changes

### 2026-04-16 — Roadmap v7.0 Step 4: Go-Live Readiness Audit

Executed full go-live readiness verification against `docs/launch-readiness-standard.md`:

- Committed `launch-readiness-standard.md` to repository
- Created `roadmap-v7.md` — complete gap analysis and audit trail (steps 1-4)
- Implemented user-facing report submission (`POST /api/v1/reports`) — P0 治理闭环
- Added `ReportButton` component to discussion and project detail pages
- Expanded `ReportTicket.targetType` to support post/project/comment/user
- Verified all P0 Gate items, judgment checklist items, and veto conditions
- **结论: VibeHub 已达到正式上线标准**

### 2026-04-16 — Roadmap v7.0 Step 3: Implementation

Implemented all 10 gaps identified in the launch readiness audit (roadmap-v7.md):

**硬阻塞修复 (P0):**
- G-01: Magic Link 邮箱登录体系 — 完整的无密码邮件认证流程
- G-03: 生产环境禁止静默 mock 回退 — runtime-mode.ts 硬阻断
- G-04: Fail-fast 检查完善 — 生产环境自动启用环境变量检查
- G-08: 中国支付路径方案 — PaymentProvider 抽象层 + 方案文档

**增强项 (P1):**
- G-02: 中国合规边界清单 — docs/china-compliance-checklist.md
- G-05: Agent-User Binding — ApiKey.agentLabel 字段 + PATCH API
- G-06: 审计日志覆盖扩展 — lib/audit.ts + API Key/登录/登出/团队审计
- G-07: 支付抽象层 — PaymentProvider 接口 + Stripe/China 实现
- G-09: 最小告警机制 — health-check-cron.sh + 文档
- G-10: 回滚 SOP — docs/rollback-sop.md

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
