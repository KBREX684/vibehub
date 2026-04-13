# VibeHub Debug 表

版本：v1.0  
更新日期：2026-04-12

## 状态流转标准

`Open -> InProgress -> Resolved -> Verified -> Closed`

## Debug 表（模板）

| Issue ID | 阶段 | 模块 | 环境 | 复现步骤 | 期望结果 | 实际结果 | 根因 | 修复方案 | 状态 | 责任人 | 验证记录 | 关联提交 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-XXXX | PX | API/UI/DB | dev/staging/prod | step1; step2 | ... | ... | ... | ... | Open | owner | ... | commit hash |

## 当前问题清单

| Issue ID | 阶段 | 模块 | 环境 | 复现步骤 | 期望结果 | 实际结果 | 根因 | 修复方案 | 状态 | 责任人 | 验证记录 | 关联提交 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-P1-001 | P1 | 脚手架 | dev | 运行 `npx create-next-app` | 正常生成 | npm registry 超时 | 网络不可达 | 改为手工搭建 Next.js 工程骨架 | Resolved | Codex | 文件已生成并可进入下一步 | 本次提交 |
| BUG-P1-002 | P1 | 鉴权 | dev | 构造非法 role 调用 demo-login | 非法 role 不应获得高权限 | 非法 role 可回退到 admin 会话 | role 未白名单且 demo 用户回退逻辑不安全 | 增加 role 白名单 + 取消 admin fallback + 会话签名 | Verified | Codex | 已通过代码审计复核 | `0b24104` |
| BUG-P1-003 | P1 | 构建 | dev/ci | 执行 `npm run build` | 构建成功 | mock 模式仍触发 Prisma 初始化失败 | repository 顶层静态导入 Prisma | 改为 DB 分支按需动态加载 Prisma | Verified | Codex | 本地 `npm run build` 通过 | 本次提交 |

## 维护规则

1. 无编号问题不修复。
2. 每次状态变更必须更新“验证记录”。
3. 进入 `Verified` 必须有复测结论。

## P2-2 Debug Closure (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| BUG-P2-2-001 | P2 | Collaboration workflow | Missing collaboration entry/review loop between project page and admin queue | No CollaborationIntent model or API chain | Added model + repository + `/api/v1/projects/[slug]/collaboration-intents` + `/api/v1/admin/collaboration-intents` + admin review endpoint/page | Verified | `npm run check` passed; tests include `collaboration-intent-repository.test.ts` |

## P2 Closure Audit (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| BUG-P2-4-001 | P2 | API contracts (`projects`, `mcp/search_projects`) | Invalid `status` query was silently ignored, yielding broad result set without caller feedback | Parameter parsing returned `undefined` for unknown values and proceeded | Added strict validation: invalid `status` now returns `400 INVALID_STATUS` with allowed enum values | Verified | `npm run check` passed after API update |
| AUDIT-P2-DOC-001 | P2 | `web/README.md` | Scope documentation still labeled as `P1 + P2-1`, missing P2-2/3/4 endpoints and discovery routes | Docs were not updated alongside feature increments | Updated scope and endpoint sections to include P2-2/3/4 public APIs and discover/facets filters | Verified | Manual doc review + endpoint list cross-check with `src/app/api/v1/**/route.ts` |
| AUDIT-P2-DOC-002 | P2 | Docs (`docs/01`, `docs/03`, `README.md`) | P2-5 与 P2-4 记录在实现图中顺序倒置；根 README 未反映周榜物化；缺少「P2 全量对照计划书」收口段 | 增量开发中文档追加顺序未整理 | 重排实现计划图 P2 小节并增加计划书对照表；项目日志增加 P2 收口结论；根 README 补充 P2-5 关键词 | Verified | 与代码及已开 PR 描述交叉核对 |
| AUDIT-P2-COMPLETE-001 | P2 | P2-1…P2-5 主线 | 需可复核的「阶段完成」结论与延期项清单 | 无单一收口记录 | 在 `docs/03_项目日志.md` 增加 P2 全量收口审计结论；在 `docs/01_实现计划图.md` 标注计划书 §4.2 延期项 | Verified | `npm run check` on closure branch；Debug 表本条闭环 |

## P3-1…P3-6 Full Audit Closure (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| AUDIT-P3-COMPLETE-001 | P3 | P3-1…P3-6 主线 | 需可复核的审计结论与合入 `main` 记录 | 增量交付分散在多分支 | 合并 P3-6 分支至 `main`；交叉核对 API/迁移/测试；更新 `docs/01`、`docs/03`、根 README | Verified | `npm run check` on `main` after closure commit |

## P3-7 Feature / Closure (2026-04-13)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| FEAT-P3-7-001 | P3 | `TeamTask` ↔ `TeamMilestone` | 任务与里程碑无结构化关联 | 未建模 | `milestoneId` optional FK + API + UI + seed + tests | Verified | `npm run check` |

## P3 Mainline Sweep (2026-04-13)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| FEAT-P3-SWEEP-001 | P3 | `TeamTasksPanel` / `reorderTeamTask` | 单列列表与「分列看板」心智不一致；reorder 可跨状态交换顺序 | 初版按全局 sortOrder 排序 | 三列 UI + reorder 仅在同一 `status` 内相邻交换 | Verified | `npm run check` |

## P4-1 Feature (2026-04-13)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| FEAT-P4-1-001 | P4 | `ApiKey` + Bearer | 无程序化访问用户资源能力 | 未实现 | User API keys + `getSessionUserFromRequest` + `/me/api-keys` + `me/teams` Bearer | Verified | `npm run check` |

## P4-2 Feature (2026-04-13)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| FEAT-P4-2-001 | P4 | `ApiKey.scopes` + gated GETs | Key 无粒度；公开列表无鉴权 | 未建模 | JSON scopes + per-route `authenticateRequest` scope + MCP parity | Verified | `npm run check` |

## P4-3 Feature (2026-04-13)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| FEAT-P4-3-001 | P4 | Rate limit + public routes | P4-2 匿名断裂；Key 无节流 | 设计缺口 | In-memory RL + `resolveReadAuth` + `/public/*` + scope UI | Verified | `npm run check` |

## P3 Formal Closure (2026-04-13)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| AUDIT-P3-FROZEN-001 | P3 | P3-1…P3-7 + sweep | 缺少可复核的「阶段封版」结论与顺延清单 | 功能迭代与路线图表述未收口 | 实现计划图 v2.2、项目日志封版段、README 声明；顺延通知/RBAC/订阅 | Verified | `npm run check` on `main`；与 `docs/01`/`03` 交叉核对 |

## P3-5 Debug Closure (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| BUG-P3-5-001 | P3 | Mock `TeamMembership` ids | `team-repository` test flaky: `TEAM_JOIN_REQUEST_PENDING` after approve+leave | `Date.now()`-only membership ids could duplicate; `removeTeamMember` used `findIndex` on `(teamId, userId)` and removed wrong row | Use composite ids for owner/member/approve mock membership rows | Verified | `npm run check` |

## P3-4 Debug Closure (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| AUDIT-P3-4-001 | P3 | `prisma/seed` TeamTask | `createMany` with `skipDuplicates` unreliable without unique business key | Seed idempotency unclear | `deleteMany` for team tasks then `createMany` | Verified | `npm run check` |

## P3-3 Debug Closure (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| BUG-P3-3-001 | P3 | `updateProjectTeamLink` (TS) | `next build` failed: `params.teamSlug` possibly null after empty check | TypeScript does not narrow `string \| null` after `=== ""` branch | Introduce `slugTrim` const after null/empty guard | Verified | `npm run check` |

## P3-2 Debug Closure (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| BUG-P3-2-001 | P3 | Mock `TeamJoinRequest` ids | Vitest `owner rejects join request` flaky: wrong row updated / `JOIN_REQUEST_NOT_PENDING` | `Date.now()`-only ids could collide in same ms | Generate stable unique ids (`teamId` + `userId` + time + random segment) | Verified | `npm run check`; `tests/team-repository.test.ts` |

## P3-1 Debug Closure (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| BUG-P3-1-001 | P3 | `removeTeamMember` mock path | Member leave test flaky / failed: u2 still listed after self-remove | Mock membership rows used `Date.now()` for `id`; duplicate ids could make `findIndex` remove wrong row | Remove membership by `(teamId, userId)` instead of non-unique `id` | Verified | `npm run check`; `tests/team-repository.test.ts` |
| BUG-P3-1-002 | P3 | `createTeam` slug collision path | Under repeated name collisions, auto-generated slug may exceed 48 chars and violate API contract / DB schema | Collision suffix appended without reserving length budget (`${baseSlug}-${n}`) | Add bounded slug candidate builder that truncates base before suffix and keeps final slug ≤48 in both mock and DB paths | Verified | `npm run check`; `tests/team-repository.test.ts` |
| BUG-P3-1-003 | P3 | `createTeam` mock team `id` | `requestTeamJoin` could throw `TEAM_JOIN_REQUEST_PENDING` in Vitest when two teams share `id` in the same ms | Mock team id was `team_${Date.now()}` only | Append random segment: `team_${Date.now()}_${random}` | Verified | `npm run check`; `tests/team-repository.test.ts` |

## P2 延期 / 未纳入（对照计划书 §4.2，2026-04-12）

| Item | Tracking |
|---|---|
| 挑战赛活动页 | 未开工；建议 P3 或独立运营需求单 |
| 创作者成长面板（浏览、互动、收藏、关注趋势） | 未开工；建议 P3 |
| 独立「精华」机制（与审核通过帖区分） | 未开工；可结合专题或加权排序后续设计 |
