# VibeHub v8.0 Progress Tracker

更新日期：2026-04-17
对应路线图：`docs/roadmap-v8.md`

---

## 目标

透明记录 v8.0 八条工作线（W1~W8）的真实落地进度。只记录**已合并到 main 或已进入 PR 审阅**的内容；口头声称但未落盘的内容不计入。

---

## 当前状态

### W1 · 产品定位与信息架构重写 · ✅ 完成（PR #75）

首页 AI+Human 叙事、SiteNav 五栏、Onboarding 三步向导、`/developers` 三场景 quick start、中英 i18n。

### W2 · 设计系统组件统一 · ✅ 完成（PR #75）

- 13 个 UI 原件
- Palette hits 0 · Token-count hits (threshold=10) 0
- `npm run audit:ui-strict` 是 CI 阻塞门槛

### W3 · Agent 协作总线 · ✅ 落地（此 PR）

#### 已实装

**Prisma schema (v8 W3):**
- `TeamAgentRole` enum：reader / commenter / executor / reviewer / coordinator
- `TeamAgentMembership` 模型：(teamId, agentBindingId) 唯一、ownerUserId + grantedByUserId 外键、active 标志、createdAt/updatedAt
- 迁移 `20260425000000_w3_team_agent_membership`
- `Team.agentMemberships` / `User.teamAgentsOwned` / `User.teamAgentsGranted` / `AgentBinding.teamMemberships` 全部关系连通

**Repository layer (`src/lib/repository.ts`):**
- `listTeamAgentMemberships({ teamSlug, viewerUserId })`
- `addTeamAgentMembership({ teamSlug, actorUserId, agentBindingId, role? })`
- `updateTeamAgentMembership({ teamSlug, actorUserId, membershipId, role?, active? })`
- `removeTeamAgentMembership({ teamSlug, actorUserId, membershipId })`
- `resolveTeamAgentRole({ teamId, agentBindingId })` — MCP guard lookup
- `listTeamAgentMembershipsForBinding({ userId, agentBindingId })`
- `listAgentActionAuditsForTeam({ teamSlug, viewerUserId, agentBindingId?, page, limit })`
- Capability helpers：`teamAgentCanWriteTasks` / `teamAgentCanCoordinate` / `teamAgentCanComment`
- 所有 mutating 操作产出 `AuditLog`（actorId + entityType="team_membership"）

**不变量（由 repository 强制）：**
- 只有 team `owner` / `admin` 可以添加、更新、删除 agent membership
- agent binding 必须 active
- binding 的 ownerUser 必须已经是 team 成员
- coordinator 角色仅 owner/admin 可授予（软策略，upgrade 路径同样 gated）
- (teamId, agentBindingId) 唯一（数据库约束 + 应用 re-add 拒绝）

**REST API:**
- `GET /api/v1/teams/{slug}/agents` — 列出（任何团队成员）
- `POST /api/v1/teams/{slug}/agents` — 添加（owner/admin）
- `PATCH /api/v1/teams/{slug}/agents/{membershipId}` — 改 role / active
- `DELETE /api/v1/teams/{slug}/agents/{membershipId}` — 移除
- `GET /api/v1/teams/{slug}/agent-audits` — 团队侧 agent 活动时间线
- `GET /api/v1/me/agent-bindings/{bindingId}/teams` — 某个 binding 所在的团队
- OpenAPI spec + `REQUIRED_OPENAPI_PATHS` 均已同步，`validate:openapi` 通过
- `generate:types` 重新生成，`git diff --exit-code` 干净

**MCP write guard (`/api/v1/mcp/v2/invoke`):**
在所有团队侧写工具调用前，如果带 `agentBindingId` 则强制校验该 agent 在目标团队的 role card：
- `create_team_task` → **coordinator only**
- `agent_complete_team_task` → executor 或 coordinator
- `agent_submit_task_review` → reviewer 或 coordinator（然后仍走 Confirmation）
- `request_team_task_delete` → coordinator（destructive，仍走 Confirmation）
- `request_team_member_role_change` → coordinator（仍走 Confirmation）
- 不带 agentBindingId 的人工 session 调用继续原有行为（未影响）
- 新错误码：`TEAM_AGENT_NOT_MEMBER`、`TEAM_AGENT_ROLE_INSUFFICIENT`（403）
- Per-invoke 解析缓存避免重复 DB 读

**前端：**
- 新页面 `/teams/{slug}/agents`（server-rendered 首帧 + 客户端 mutate）
  - 角色列表，显示 role pill + 活跃状态 + owner + grantedBy + 最近动作时间
  - Owner/admin 可通过下拉改 role / Pause / Resume / Remove
  - Remove 走 `ConfirmDialog`
  - "最近 25 条 agent 活动"面板（来自 `/agent-audits`）
  - 非成员访问显式返回 `ErrorState`（403）
- 团队详情页 `/teams/{slug}` 顶部新增 "Agent bus" 快捷入口（任何团队成员可见）
- `/settings/agents` 每个 binding 行新增 "In teams:" 行：显示该 agent 在哪些团队、角色、活跃状态，点击跳到对应 `/teams/{slug}/agents`

**测试：**
- 新建 `tests/w3-team-agent-membership.test.ts`：14 个断言覆盖
  - capability helpers 正确性
  - add / list / resolve（含 6 种错误路径）
  - update lifecycle（role / pause 联动 resolve 返回 null）
  - remove 清理
  - binding → teams 交叉列表（含私有性）

**前端清除挑战赛（按用户要求）：**
- 删除 `src/app/challenges/page.tsx`、`src/app/challenges/[slug]/page.tsx`、`src/components/challenge-card.tsx`
- 删除 i18n 键 `nav.challenges`（zh.json + en.json）
- SiteNav 已在 W1 阶段完成清理，footer 未引用，layout 未引用
- 保留（按 roadmap 冻结原则）：`/api/v1/challenges/*` REST 路由、`Challenge` Prisma 模型、MCP `list_challenges` 工具、mock-data 种子数据、openapi-spec 挑战赛条目

#### 未实装（明确后移，不属于 W3）

- 跨用户 Agent ↔ Agent 协作的自动派任务（P2 路线图）
- `TeamAgentMembership` 随 `TeamMembership` 的级联去激活（由 repository 约定强制而非 schema cascade；当前被 roadmap 明确标记为应用层责任，未触发 cleanup cron）
- Agent 协作 tab 在 `/teams/[slug]` 主页内嵌版（当前通过 quick-link 跳转独立页；P1 内可考虑内嵌）

### W4 / W5 / W6 / W7 / W8 · 未启动（按路线图节奏）

---

## 质量关卡（W3 本轮结束时）

- `npx tsc --noEmit` → ✅ 通过（0 错误）
- `npm run lint` → ✅ 通过（3 条历史 warning 未变）
- `npm test` → ✅ **59 test files · 254 tests · 0 fail**（新增 14 个 W3 断言）
- `npm run validate:openapi` → ✅ paths=121
- `npm run generate:types` → ✅ 无 diff
- `npm run audit:ui-strict` → ✅ **exit 0**（palette 0 · token-count 0）
- `npm run build` → ✅ 通过，路由含 `/teams/[slug]/agents` + `/api/v1/teams/[slug]/agents/*`

---

## 守住的边界

- ❌ 无 Agent 自治写入（所有高风险写入仍必须进 `AgentConfirmationRequest`）
- ❌ 无 LLM 调用新增（W3 是协议层，不是 AI 层）
- ❌ 无挑战赛前端保留（按用户要求清除）
- ❌ 无后端挑战赛 API 删除（按 roadmap 冻结）
- ❌ 无跨用户 agent-agent 自动协作（P2 范围）
- ❌ 无业务行为改变（team tasks / discussions / chat 等既有功能无回归）

---

## 下一步

W3 完成。下一轮进入 **W4：社区主飞轮**：
- 广场 4 tab Feed（follow / recommend / hot / time）
- 项目画廊曝光权重公式（score = 收藏×3 + 协作意向×5 + 近 30d 更新×2 + creator credit×0.1 + featuredRank×100）
- 项目详情页协作入口前置
- 团队角色扩展 + 活动时间线
