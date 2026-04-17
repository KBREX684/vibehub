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

### W4 · 社区主飞轮 · ✅ 落地（本次实现）

#### 已实装

- **广场 Feed 四流收口**
  - `/discussions` 明确 `recent / hot / following / recommended`
  - 每个 feed 都有独立说明和空状态
  - `hot` 改成评论 + 点赞 + 收藏 + 时间衰减的确定性排序

- **项目画廊曝光权重**
  - `/discover` 的 `hot / recommended` 由统一项目发现分计算驱动
  - 当前分数因子：
    - 收藏数
    - 最近 7 天收藏增量
    - 协作意向数
    - 近 30 天更新 boost
    - creator contribution credit
    - featuredRank editorial weight
  - 项目卡片新增最近活动信号：最后更新时间、最近收藏增量、协作意向数

- **项目详情协作入口前置**
  - `/projects/[slug]` hero 区主 CTA 已前置为协作动作
  - 三种互斥状态：
    - 已绑定团队 → `Apply to join {team}`
    - 项目 owner 且未绑定团队 → `Start a team`
    - 其他用户 → `Join collaboration`
  - 侧栏新增“Recent collaboration signals”
  - 项目详情页新增可用的 bookmark 按钮，已处理 hydration 前死点击问题

- **团队动态升为一等入口**
  - `/teams/[slug]` 新增 `Overview / Activity` tab
  - `TeamActivityTimeline` 支持 `All / Tasks / Discussions / Agent` 过滤
  - 活动源聚合：
    - `AuditLog`
    - `AgentActionAudit`
  - 空状态和筛选交互已修复，不再出现“按钮切了但文案不变”

#### 走查与回归

- 新增 `tests/w4-community-loop.test.ts`
- 新增 `tests/e2e/w4-community-loop.spec.ts`
- 走查覆盖：
  - discussions 四流
  - discover 热门流
  - project detail 协作 CTA + bookmark 交互
  - team activity 筛选

### W5 · 开发者生态 · ✅ 落地（本次实现）

#### 已实装

- **开发者中心收口**
  - `/developers` 保留三场景 quick start
  - 资源区新增 `/developers/api-docs`
  - 新增 protocol status：OpenAPI version、manifestVersion、protocolVersion、generatedAt

- **交互式 API 文档**
  - 新增 `/developers/api-docs`
  - 基于 `lib/openapi-spec.ts` 单一来源渲染，不手写 endpoint 清单
  - 支持：
    - tag / method / path / summary 搜索
    - request params / request schema / responses 浏览
    - auth mode 切换：Anonymous / Session / Bearer API Key
    - same-origin JSON `Try it`
  - OpenAPI operation 元数据新增：
    - `x-required-scope`
    - `x-auth-modes`
    - `x-rate-limit-tier`

- **API Key 用量面板**
  - 新增 `GET /api/v1/me/api-keys/{keyId}/usage`
  - `/settings/api-keys` 每个 key 现在展示：
    - 近 7 天 sparkline
    - 7d / 24h / errors / tools 摘要
    - 最近 100 条 MCP 调用展开面板
    - 按 tool / success|error 前端过滤
  - 数据源完全复用 `McpInvokeAudit.apiKeyId`

- **MCP manifest 版本化**
  - `GET /api/v1/mcp/v2/manifest` 新增：
    - `manifestVersion`
    - `protocolVersion`
    - `generatedAt`
  - 每个 tool 新增：
    - `exampleInput`
    - `capabilityGroup`
    - `writeTool`

#### 走查与回归

- 新增 `tests/w5-developer-experience.test.ts`
- 手工链路已验证：
  - `/developers/api-docs` 返回 200
  - demo session 下可创建 API key
  - `/api/v1/me/api-keys/{keyId}/usage` 返回稳定结构
  - `/api/v1/mcp/v2/manifest` 返回版本字段与 tool 元数据

### W6 · 商业与合规收口 · ✅ 落地（本次实现）

#### 已实装

- **中国支付 provider 收口**
  - `lib/billing/providers/alipay.ts` 已落地 checkout / webhook / cancel / getSubscription
  - `lib/billing/providers/wechatpay.ts` 已落地 checkout / webhook / cancel / getSubscription
  - `lib/billing/providers/stripe.ts` 保留海外银行卡与 portal 主通道
  - `/api/v1/billing/checkout` / `portal` / `webhook` 已统一走 provider 分派，不再伪造 production 成功支付
  - 未配置 provider 时明确返回 `PAYMENT_PROVIDER_NOT_CONFIGURED`

- **公开套餐收口**
  - 当前公开订阅模型统一为 `Free / Pro`
  - `Team` 套餐已从当前公开商业化口径中延后，只保留为后续商业化阶段
  - `/pricing`、`/settings/subscription`、`subscription.ts`、账单展示和 provider 文案已统一为人民币与中国支付优先
  - 订阅权益继续真实驱动 quota，且 `resolveEntitledTier()` 已用于处理过期 / past_due 权益回落

- **合规页面最终版**
  - `/privacy`
  - `/terms`
  - `/rules`
  - `/aigc`
  - footer 已补全规则与 AIGC 链接

- **运营/发布文档同步**
  - `docs/roadmap-v8.md`
  - `docs/roadmap-current.md`
  - `docs/product-strategy-v8.md`
  - `docs/release-notes.md`
  - `docs/p0-compliance-checklist.md`
  - `docs/v7-go-live-checklist.md`
  - 已统一到：
    - 中国支付优先
    - Free / Pro 公开套餐
    - Team 延后
    - MCP Developer Access 申请制、非当前个人订阅入口

#### 走查与回归

- 本地 production build 已通过，新增 `/aigc`、`/api/v1/billing/*` 与健康检查增强路由进入产物
- development + demo session 演练已验证：
  - `/settings/subscription` 登录保护与页面内容正常
  - `/api/v1/billing/checkout` 在带 `X-CSRF-Token` 时可成功进入
    - `alipay` sandbox checkout
    - `wechatpay` sandbox checkout
  - 不带 CSRF 的写请求会被正确拒绝
- `/api/v1/health` 与 `/api/v1/admin/health` 已新增 `smtp` 与 `payments` readiness 视图

#### RC / go-live 演练（2026-04-17）

- 见：`docs/v8-rc-go-live-rehearsal-2026-04-17.md`
- production-like 环境已完成：
  - clean schema `migrate -> seed -> smoke`
  - `next start` + `ws-server`
  - 登录 / 讨论 / 项目 / 团队 / API+MCP / 企业认证 / 后台治理链路
- 结论：
  - 代码与部署基线通过
  - W6 剩余阻塞已收口为外部项：
    - SMTP
    - 支付宝 live 商户参数
    - 微信支付 live 商户参数（若纳入首发）
    - ICP / 法务 / AIGC / 跨境数据终审

### W7 · 后台治理与 AI 助手 · ✅ 落地（本次实现）

#### 已实装

- **运营仪表盘**
  - 新增 `/admin/dashboard`
  - 聚合模块统一收口到 `web/src/lib/admin/metrics.ts`
  - 三个北极星：
    - `WAHC`
    - `AO%`
    - `Agent rejection rate`
  - 六个辅助指标：
    - `DAU`
    - `new users`
    - `new posts`
    - `new projects`
    - `active subscriptions`
    - `open reports`
  - 指标卡统一包含 `value / delta7d / sparkline`

- **AI 审核三类任务闭环**
  - `AdminAiSuggestion` 已扩展：
    - `queue`
    - `priority`
    - `labels`
    - `decisionNote`
    - `modelProvider`
    - `modelName`
    - `updatedAt`
  - 新增：
    - `POST /api/v1/admin/ai-suggestions/generate`
    - `POST /api/v1/admin/ai-suggestions/{suggestionId}/decision`
  - 已接通三类任务：
    - `summarize_report(ticketId)`
    - `triage_post(postId)`
    - `verify_enterprise(userId)`
  - 模型策略：
    - 配置 `ADMIN_AI_PROVIDER_*` 时走 provider
    - 未配置时回退 heuristic
  - 页面不再在 render 阶段偷偷写 suggestion；改为显式“Generate AI suggestion”

- **后台三面板筛选闭环**
  - `/admin/ai-suggestions`
    - `targetType / riskLevel / adminDecision / queue` 筛选
    - 支持 `accept / reject / modified` 决策与 `decisionNote`
  - `/admin/audit-logs`
    - `actorId / action / agentBindingId / dateFrom / dateTo` 筛选
  - `/admin/mcp-audits`
    - `tool / success|error / agentBindingId / dateFrom / dateTo` 筛选
  - 对应 API 均已扩展为服务端筛选，不再依赖前端全量列表本地过滤

- **目标页显式 AI 入口**
  - `/admin/reports` 支持生成举报摘要并决策
  - `/admin/moderation` 支持生成帖子预审建议并决策
  - `/admin/enterprise` 支持生成企业核验建议并决策
  - `/admin` 保持 overview 入口位，`/admin/dashboard` 为正式指标页

#### 走查与回归

- 新增 `tests/w7-admin-governance.test.ts`
- `development` + demo admin 演练已验证：
  - `/admin/dashboard` 返回 200
  - 真实 report id 触发 `generate` 成功
  - `decision` 可回写 accepted + note
  - `/admin/ai-suggestions`、`/admin/audit-logs`、`/admin/mcp-audits` 筛选页返回 200

### W8 · 基础设施与可观测 · ✅ 落地（本次实现）

#### 已实装

- **Redis 基线**
  - 新增统一 Redis client 与分布式限流基础层
  - middleware 保留 auth / CSRF / request-id，分布式 IP 限流经内部 Node route 落 Redis
  - `mcp-user-write-rate-limit`、`agent-action-rate-limit` 已切到分布式实现
  - `ws-server` 已支持 Redis pub/sub fan-out 与跨实例 presence 汇总

- **结构化日志**
  - 新增 request logging wrapper，用于关键 admin / billing / infra 路由
  - 运行时代码路径的 `console.*` 已清零
  - 关键失败路径统一落 `logger.*` + `serializeError`

- **健康检查与告警**
  - 新增 `SystemAlert` 模型与告警模块
  - `/api/v1/health` 统一聚合 DB / Redis / WebSocket / SMTP / payments / admin-AI readiness
  - `/api/v1/admin/health` 与 `/admin/health` 已展示 recent unresolved alerts
  - 已接入的告警源：
    - billing webhook failure
    - admin-AI provider failure
    - Redis memory fallback in production-like mode
    - request wrapper 5xx

- **部署与回滚**
  - `web/docs/deployment-v7.md` 已升级为 v8 部署与回滚 runbook
  - 明确 Redis / SMTP / payment provider / admin-AI provider / DB backup 要求

#### 本轮验证

- `npm run lint` → ✅ 通过（2 条历史 warning 未变）
- `npm run validate:openapi` → ✅ paths=127
- `npm run generate:types` → ✅ 无 diff
- `npm test` → ✅ **64 test files · 275 tests · 0 fail**
- `npm run build` → ✅ 通过
- `timeout 5s env WS_PORT=0 ... npx tsx ws-server.ts` → ✅ 可启动并优雅退出

#### 当前仍不在 W8 内解决

- Redis 改造成正式 session store（当前仍是签名 cookie + sessionVersion）
- 外部监控平台（Sentry / Datadog / Prometheus）
- W6 外部 blocker：SMTP、真实支付商户、ICP、法务、AIGC / 跨境最终审批

---

## 质量关卡（W8 本轮结束时）

- `npx tsc --noEmit` → ✅ 通过（0 错误）
- `npm run lint` → ✅ 通过（2 条历史 warning 未变）
- `npm test` → ✅ **64 test files · 275 tests · 0 fail**
- `npm run validate:openapi` → ✅ paths=127
- `npm run generate:types` → ✅ 无 diff
- `npm run audit:ui-strict` → ✅ **exit 0**（palette 0 · token-count 0）
- `npm run build` → ✅ 通过，新增 `/api/v1/internal/rate-limit` 与 W8 health/alert plumbing
- `PLAYWRIGHT_PORT=3117 npm run test:e2e -- tests/e2e/w4-community-loop.spec.ts` → ✅ 4/4 通过
- `development` 演练：
  - demo 登录 + `/settings/subscription` + `alipay/wechatpay sandbox checkout` → ✅
  - demo admin + `/admin/dashboard` + AI generate/decision + admin filters → ✅
  - `timeout 5s env WS_PORT=0 ... npx tsx ws-server.ts` → ✅

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

W8 已完成，production-like RC / go-live 演练也已完成。后续重点不再是新增工作线，而是清掉剩余外部上线阻塞：

- **SMTP 联调**：让 production 邮箱注册 / 验证 / 重置密码真正可用
- **支付宝 live 商户联调**：至少完成一次真实支付与一次退款演练
- **微信支付首发决策**：明确是否纳入 GA；若纳入，同步补齐商户/证书/API v3 key
- **合规终审**：ICP / 法务 / AIGC / 推荐/跨境数据审批全部完成
