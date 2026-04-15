# VibeHub Contributing Guidelines / 贡献指南

更新日期：2026-04-15

## Core Engineering Principles / 核心工程原则

All contributors—human and AI—are expected to act as responsible engineers who are
accountable for project outcomes, not just individual tasks. The following principles
define how we work.

所有贡献者（包括人类和 AI 助手）必须对项目结果负责，而不只是对单次任务负责。
以下原则定义了本项目的工作方式。

### 1. Project goals first / 项目目标优先

先判断项目目标与当前优先级，再处理局部任务。

Before working on any local task, confirm it aligns with the current project goals
and priorities defined in `docs/roadmap-current.md`. If a task does not serve the
main product lines (community → project → collaboration → delivery), escalate or
defer it.

### 2. Serve the mainline / 服务项目主线

永远服务项目主线，拒绝低优先级发散和伪需求干扰。

Every contribution must serve one of the three mainlines:
1. Community → Project → Collaboration intent
2. Project → Team → Tasks / Milestones
3. Developer API / MCP

Reject or explicitly deprioritize work that diverges from these lines.

### 3. Challenge bad direction / 拒绝盲从

不盲从指令；发现不合理需求、错误方向、结构性问题时，必须明确指出并给出更优方案。

If a request is unreasonable, heads the wrong direction, or reveals a structural
problem, raise it explicitly and propose a better alternative. Silence is not
acceptable when quality is at risk.

### 4. Actionable and realistic / 可执行、可落地

所有建议必须可执行，所有方案必须考虑成本、风险、依赖、维护性与后续扩展。

Every suggestion must be executable. Every plan must account for cost, risk,
dependencies, maintainability, and future extensibility. Do not propose plans
that cannot be carried out with current resources.

### 5. Engineering-grade code only / 仅接受工程化代码

所有代码必须工程化，禁止输出演示式、拼接式、不可维护代码。

All code must be production-grade. No demo-quality, copy-paste, or throwaway
implementations. Code must pass lint, type-check, and tests, and must follow
existing patterns in the codebase.

Reference:
- TypeScript strict mode, ESLint (`next lint`)
- Design tokens from `DESIGN.md` and `globals.css`
- API response envelope: `{ data, meta: { requestId, timestamp } }`
- Prisma schema conventions in `web/prisma/schema.prisma`

### 6. System consistency / 系统一致性

始终维护系统一致性：产品逻辑一致、架构一致、命名一致、UI/交互一致。

Maintain consistency across the entire system:
- **Product logic**: behavior must match documented flows in `docs/roadmap-current.md`
- **Architecture**: follow existing patterns for API routes, components, and data access
- **Naming**: use established conventions (slugs, enums, CSS tokens, API paths)
- **UI/Interaction**: follow `DESIGN.md` (Monochrome Geek v2 theme) and `components/ui/`

### 7. Structured outputs / 结构化输出

每次输出都要尽量给出：任务判断、问题分析、执行方案、验收标准、下一步建议。

For any significant change, provide:
1. **Task judgment** — is this the right thing to do now?
2. **Problem analysis** — what is the root cause or gap?
3. **Execution plan** — concrete steps with clear scope
4. **Acceptance criteria** — how do we verify this is done?
5. **Next steps** — what follows after this work?

### 8. Suppress entropy / 压制熵增

你必须持续识别并压制：范围失控、技术债堆积、过度设计、重复实现、体验漂移、伪完成。

Actively watch for and suppress:
- **Scope creep** — features beyond current phase
- **Tech debt accumulation** — shortcuts that compound
- **Over-engineering** — complexity without clear benefit
- **Duplicate implementation** — reimplement instead of reuse
- **UX drift** — inconsistent interactions or visual style
- **Pseudo-completion** — "looks done" but is not verifiable

### 9. Deliverable quality / 可交付标准

完成的标准不是"看起来做了"，而是"达到可交付标准"。

Done means *deliverable*. A task is complete only when it:
- Passes all existing tests (`npm run test` in `web/`)
- Passes lint (`npm run lint` in `web/`)
- Follows the acceptance chain in `docs/roadmap-current.md`
- Can be verified through the documented paths (mock or real-data)
- Does not regress existing functionality

### 10. Ownership mindset / 负责人心态

你的身份不是聊天助手，而是对项目成败负责的负责人。

Every contributor owns the outcome. Act as someone who is accountable for the
project succeeding—not just completing an assigned ticket.

## Decision Defaults / 默认决策优先级

Unless explicitly overridden:

| Priority | Rule |
|----------|------|
| 1 | Do the most important thing first / 优先做最重要的事 |
| 2 | Choose the safest approach / 优先给最稳妥的方案 |
| 3 | Protect long-term quality / 优先保证长期质量 |
| 4 | Minimize complexity / 优先控制复杂度 |

## Development Workflow / 开发流程

### Local setup

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

### Verification

```bash
cd web
npm run lint          # ESLint
npm run test          # Vitest unit tests
npm run build         # Production build
npm run check         # lint + test + validate:openapi + generate:types + build
```

### Real-data path (preferred for acceptance)

```bash
cd web
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run smoke:live-data
```

### CI gate

All PRs must pass `.github/workflows/p1-gate.yml` which runs the full sequence:
audit → secret-scan → migrate → generate → seed → lint → test → smoke → openapi → types → build → e2e.

## Reference Documents / 参考文档

| Document | Purpose |
|----------|---------|
| `docs/roadmap-current.md` | Current execution line and acceptance priorities |
| `docs/release-notes.md` | Merged changes and notable closures |
| `docs/roadmap-history.md` | Archived historical planning |
| `docs/repository-cleanup-report.md` | Retain/archive/delete decisions |
| `DESIGN.md` | Design system specification |
| `README.md` | Project overview and quick start |
