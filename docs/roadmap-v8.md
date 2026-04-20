> ⛔ **已归档**（2026-04-19）：本文件代表 v11.0 之前的产品方向，**不再作为当前主线**。
> 当前主线见 `docs/v11.0-final-chapter-rfc.md`，主线索引 `docs/roadmap-current.md`。
> 本文件保留作为历史档案，新工作请勿基于本文件展开。

# VibeHub Roadmap v8.0 — 全维度产品化升级（中国优先 · AI+Human 协作网络）

> 规划日期：2026-04-17
> 对标文档：`docs/product-strategy-v8.md`（v8 战略底本）· `docs/launch-readiness-standard.md`（上线硬门槛）· `docs/v7-go-live-checklist.md`（发布执行清单）
> 状态：执行版 · 替代旧 `docs/roadmap-v7.md` 作为当前主线
> 底线：本路线图不解决"新功能想加什么"，解决"如何把 VibeHub 从功能齐全的原型推进到中国中文开发者真正愿意每天来、愿意付费、愿意让 agent 合法参与协作的产品"

---

## 0. 如何阅读

v8.0 是**一次全维度迭代**，覆盖：产品战略、信息架构、视觉设计、前端工程、后端工程、数据库、Agent 协作、合规、商业化、运维、运营指标。

阅读顺序：

1. 判断（§1）：v7.0 结束时 VibeHub 真实的成熟度
2. 目标（§2）：v8.0 作为一次版本一定要达到什么
3. 八条工作线（§3）：本轮迭代的全部拆解
4. 分阶段（§4）：Alpha / Beta / GA 三个里程碑
5. 验收（§5）：所有验收标准集中区
6. 红线（§6）：v8 期间绝不允许越界的内容

---

## 1. 【项目判断】

### 1.1 v7.0 真实成熟度（诚实版）

好的部分：

- 主链路（账号 / 讨论 / 项目 / 团队 / API+MCP / 订阅 / 后台）都是真实闭环，不是演示
- 仓库里 `AgentBinding` / `AgentActionAudit` / `AgentConfirmationRequest` / `AutomationWorkflow` / MCP v2 写工具 **已落地**，这比任何竞品都深
- 设计系统 token 层统一（Monochrome Geek v2）
- RC 演练通过，外部阻塞清单已成形

不足的部分：

- **产品定位**上仍是"社区 + 协作工具"的模糊组合，没有对外讲清楚"为什么是我而不是 Product Hunt + GitHub + 飞书"
- **首屏**不讲"AI+Human 协作网络"这个唯一卖点，hero 文案还在通用社区话术里
- **Agent 协作**有底座无 UI：AgentBinding 只在 `/settings/agents` 以列表形式存在，没有"团队里的 agent"、没有"协作日志"、没有"角色牌"
- **视觉一致性**：token 层统一，组件层割裂。很多页面仍在裸写 `className`
- **广场**四流已落地，但仍缺首页级分发和后续运营调权；用户粘性不再只靠时间流
- **项目画廊**已具备互动驱动排序，但排序参数和曝光策略还需要继续运营调优
- **后台**没有运营仪表盘，连"昨天发生了什么"都答不出来
- **中国合规 / 支付**外部阻塞未关
- **AI 审核助手**有表结构无调用闭环

### 1.2 最高优先级

**v8 只证明一件事：VibeHub 是中国中文开发者的 AI+Human 协作网络，不是又一个社区、不是又一个看板、不是又一个 Product Hunt。**

一切前端改版、后端扩展、视觉升级、运营指标，都服务这一条。

### 1.3 P0 / P1 / P2 分档

P0 = v8 GA 前必须完成
P1 = v8 GA 前强烈建议完成，可允许带 known-gap 上线
P2 = v8 周期内启动并留基线，允许延到下一轮完成

---

## 2. 【整改方案】v8.0 目标

### 2.1 一句话

**把 VibeHub 从 v7.0-rc 推进到 v8.0 GA。标志：中国合规上线 + AI+Human 协作成为首屏叙事 + Agent 在团队里真正可见、可操作、可审计 + 设计系统全局统一 + 单位经济可自我维持。**

### 2.2 GA 门槛（必须同时满足）

| 门槛 | 标准 |
|------|------|
| G1 中国合规 | ICP 完成 · 隐私/协议/规则法务定稿 · AIGC 策略定稿 |
| G2 中国支付 | 支付宝 或 微信支付至少一条渠道真实商户成功跑通 |
| G3 生产稳定 | Redis 拓扑上线 · PM2 / Nginx / WS 稳定 · 日志可采集 · 回滚可执行 |
| G4 协作总线 | Agent 在团队内有"角色牌 + 协作日志 + Confirmation 队列" |
| G5 首屏叙事 | Hero + 主导航 + onboarding 讲出 AI+Human 定位 |
| G6 视觉统一 | `components/ui/*` 覆盖全页必须状态组件；0 条风格断层 |
| G7 运营视图 | WAHC / AO% / Agent 拒绝率 三个北极星 + 6 个辅助指标 |
| G8 治理闭环 | AI 审核 MVP 真实跑通 · 人工最终裁决 |
| G9 成本守恒 | 月固定成本不超 ¥3100 · LLM 审核单条成本 < ¥0.02 |
| G10 质量基线 | `npm run check` 全绿 · Lighthouse Perf ≥ 90 · 所有写入 API 有 CSRF + session 吊销 |

### 2.3 八条工作线

v8 同时推进八条工作线：

- **W1** 产品定位与信息架构重写（首屏 / 导航 / onboarding）
- **W2** 设计系统从 token 统一升级到组件统一（`components/ui/*` 全覆盖）
- **W3** Agent 协作总线（角色牌 + 协作日志 + 团队侧 agent 管理 + 跨用户协作受控开通）
- **W4** 社区主飞轮（Feed 四流 + 画廊曝光权重 + 协作入口前置）
- **W5** 开发者生态（开发者中心重构 + MCP quick start + API Key 用量 + 交互式文档）
- **W6** 商业与合规收口（支付宝 / 微信商户 · ICP · AIGC · Free / Pro 上线，Team 延后）
- **W7** 后台治理与 AI 助手（运营仪表盘 + AI 摘要/打标/建议 + 审计面板 + 企业认证辅助）
- **W8** 基础设施与可观测（Redis · 结构化日志 · 健康检查 · 监控告警 · 回滚 SOP）

每条工作线见 §3。

### 2.4 影响范围

- 前端：几乎全部页面（首页 / 导航 / 登录 / 注册 / onboarding / 设置 / 设计系统 / 后台 / 团队 / 项目 / 讨论 / 开发者中心）
- 后端：billing provider 扩展 · agent 协作 API · 运营指标聚合 · AI 审核调用封装 · 审计扩展
- 数据库：v8 已新增 `TeamAgentMembership` 作为协作总线核心表；W4 本轮不新增新表，继续复用 AgentBinding / AgentActionAudit / AgentConfirmationRequest / AutomationWorkflow / AdminAiSuggestion
- 基础设施：Redis 上线 · PM2 / Nginx 复核 · 监控告警
- 合规：ICP / 法务 / AIGC

---

## 3. 【执行建议】八条工作线详细拆解

### W1 产品定位与信息架构重写（P0）

**目标**：让一个第一次访问的中国中文开发者在 15 秒内理解"VibeHub 是 AI+Human 协作网络"。

#### W1-1 首页重写（`src/app/page.tsx`）

- Hero 主文案改为讲 AI+Human 协作（中文），副标题讲"广场 / 画廊 / 团队 / Agent 总线 四位一体"
- 主 CTA 改为："**展示我的作品**"（建项目）+"**让我的 Agent 进团队**"（去 `/settings/agents`）
- 三段叙事：
  1. 看同行在做什么（广场精选讨论 · 真实数据）
  2. 展示我的作品（项目画廊 · 真实数据）
  3. 让 Cursor / Claude / 自建 agent 合法进入我的团队（演示卡片）
- 底部附"为什么不是 Product Hunt / 不是 GitHub / 不是飞书"对比卡（给开发者看、不对外宣传）

#### W1-2 主导航重构（新建 `components/site-nav.tsx`）

- 六栏：**广场** · **项目** · **团队** · **开发者** · **定价** · **登录/我**
- 右侧固定"建项目 / 发讨论"快捷按钮（已登录用户）
- 登录态右上角显示头像 + 下拉（个人主页 / 我的 agent / 我的团队 / 设置 / 登出）

#### W1-3 Onboarding 三步（新建 `src/app/onboarding`）

- Step 1：介绍你自己（昵称 + 一句话 + 1~3 个领域标签）
- Step 2：你用什么 AI 工具（Cursor / Claude / OpenClaw / Codex / 其他），用于引导绑定 agent
- Step 3：第一件事（三选一：发讨论 / 建项目 / 绑定我的第一个 agent）
- 每步记录"跳过 / 完成"事件，用于后续留存分析

#### W1-4 `/developers` 开发者中心重构

- 从"能力清单"改为"开始使用"
- 三块：**给你的 Cursor 接入 VibeHub（3 行代码）** · **你的 Agent 能在 VibeHub 做什么** · **你想做 MCP 工具开发**
- 每块有真实可复制的代码片段

**验收**：
- 首页在 1440 / 768 / 375 三宽度无结构断层
- 新用户首次登录必定看到 onboarding
- 主导航在任何页面都是一致的组件

---

### W2 设计系统：从 token 统一升级到组件统一（P0）

**目标**：`components/ui/*` 成为视觉单入口；页面不得再裸写 `className` 堆叠。

#### W2-1 补齐 UI 原件

| 组件 | 作用 |
|------|------|
| `EmptyState` | 图标 + 标题 + 描述 + CTA，统一空态 |
| `ErrorState` | 区分 401/403/404/500/network 五态 |
| `LoadingSkeleton` | 列表 / 卡片 / 详情 / 表格 四种 |
| `PageHeader` | 统一页面标题 + 副标题 + 操作区 |
| `DataTable` | 后台通用表格（列宽 · 空态 · 加载 · 分页 · 选择 · sticky） |
| `StatCard` | 指标卡（数值 + 增量 + trend mini sparkline） |
| `FormField` | label + input + hint + error |
| `SectionCard` | 设置页 / 后台页统一 section 容器 |
| `TagPill` | 标签 pill，统一 `--color-accent-*-subtle` 背景 |
| `AvatarStack` | 多用户头像堆叠 |
| `ConfirmDialog` | 破坏性操作确认弹窗 |

#### W2-2 全局替换

- 建 `scripts/audit-ui-inlines.ts`：扫描页面中超过 6 个 className token 的裸堆叠，输出违规清单
- PR 准入规则：每条违规必须转为 `ui/*` 组件或加入临时豁免列表（豁免必须带 issue 号）

#### W2-3 字重 / 圆角 / 色彩收敛

- 字重 400 / 500 / 600 三档为上限，禁止 700+
- 圆角：按钮 6px / 卡片 8px / pill pill，不再允许 rounded-2xl 混用
- 色彩：正文走 `--color-text-primary/secondary/tertiary`，禁止 `text-white` / `text-gray-*` 硬编码

**验收**：
- `scripts/audit-ui-inlines.ts` 违规数 = 0
- 视觉走查 0 条"像两个产品"的页面

---

### W3 Agent 协作总线（壁垒级 · P0）

**目标**：Agent 在 VibeHub 是看得见、摸得着的队员，不是 API 调用日志里的一行记录。

#### W3-1 数据模型补充

最少新增：

```prisma
// 已有 AgentBinding 下，扩展"团队内角色牌"
model TeamAgentMembership {
  id             String   @id @default(cuid())
  teamId         String
  agentBindingId String
  ownerUserId    String   // agent 所属用户，必须是 team 成员
  role           TeamAgentRole @default(reader)
  grantedByUserId String   // 必须是 team owner 或 admin
  active         Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  team          Team         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  agentBinding  AgentBinding @relation(fields: [agentBindingId], references: [id], onDelete: Cascade)
  ownerUser     User         @relation("TeamAgentOwner", fields: [ownerUserId], references: [id], onDelete: Cascade)
  grantedBy     User         @relation("TeamAgentGrantor", fields: [grantedByUserId], references: [id], onDelete: Restrict)

  @@unique([teamId, agentBindingId])
  @@index([teamId, active])
  @@index([ownerUserId])
}

enum TeamAgentRole {
  reader
  commenter
  executor
  reviewer
  coordinator
}
```

约束：

- 一个 agent 只能以"其绑定用户为 team 成员"为前提加入 team
- `role` 升级必须由 team owner 或 admin 操作，写 `AuditLog`
- `ownerUser` 离开团队 → 其名下所有 agent 自动从该团队移除

#### W3-2 后端 API

- `POST /api/v1/teams/[slug]/agents` — 给团队加 agent（owner/admin）
- `PATCH /api/v1/teams/[slug]/agents/[id]` — 调整角色牌
- `DELETE /api/v1/teams/[slug]/agents/[id]` — 移除 agent
- `GET /api/v1/teams/[slug]/agents` — 列表 + 当前角色 + 最近一次活动
- `GET /api/v1/teams/[slug]/agent-audits` — 该团队内 agent 活动时间线（分页）

MCP 写工具与现有工具（create_team_task / agent_complete_team_task / agent_submit_task_review / request_team_task_delete / request_team_member_role_change）**继续沿用**，但必须在 handler 里校验 `TeamAgentMembership.role` 是否允许该动作。不通过 → 进入 `AgentConfirmationRequest` 队列。

#### W3-3 前端体验

- `/settings/agents`：改为"我的 Agent 协作中心"
  - 我绑定的 agent 列表
  - 每个 agent 在哪些团队（table）
  - 最近 50 条调用审计
  - 待我确认的写入队列（`AgentConfirmationRequest` pending）
- `/teams/[slug]/agents`：新页面，团队侧 agent 管理
  - 当前 agent 列表 + 角色牌
  - 团队 owner/admin 可以"批准/拒绝/调整角色/移除"
  - 普通成员只能看
- `/teams/[slug]`：添加 tab **"Agent 活动"**，展示 `AgentActionAudit` 时间线
- 团队页**任务详情弹窗**底部显示"此任务的 agent 参与痕迹"（若有）

#### W3-4 跨用户 Agent-Agent 协作（受控开通）

边界：

- 仅当双方用户都在同一 team、且双方都明确授权其 agent 为 executor/coordinator
- 队长 agent（coordinator）可以创建任务并分配给队员 agent（executor）
- 队员 agent 执行的每个"完成/驳回/提交审查"仍必须产生 `AgentConfirmationRequest`，由被分配队员的**绑定用户**最终确认

禁止：

- agent 之间绕过团队上下文的直接通信
- agent 自治（无人工确认）

#### W3-5 反滥用

- 每个 agent binding 每日写操作总额（config 可调）
- 每个 team 每小时 agent 总动作数上限
- AgentConfirmationRequest 超 72h 未处理自动过期 + 通知用户
- 恶意 binding 管理员可一键吊销（走 AuditLog）

**验收**：
- 团队 owner 可以给 agent 发角色牌；role 升级进入 AuditLog
- 队员 agent 完成任务后，任务详情能看到 agent 的痕迹
- 至少一条跨用户 Agent-Agent 协作的端到端流程通过
- 所有写操作进过 Confirmation 或被 scope 拦下，0 条绕过审计

---

### W4 社区主飞轮（P0 / P1，已完成当前版实现）

#### W4-1 广场 Feed 四流（P0）

- **时间流**（已有）
- **热度流**（已有，改进权重：24h 评论数 + 点赞数 + 浏览，带衰减）
- **关注流**（P0 新增）：仅展示当前用户 `UserFollow` 对象发布的帖子
- **推荐流**（P0 新增）：基于用户兴趣标签 + 近 30 天互动过的帖子标签共现，**不使用 LLM**，用 SQL 可实现的协同过滤
- tab 切换保留滚动位置
- 每 tab 独立空态文案

#### W4-2 项目画廊曝光权重（P0）

- 排序：`score = 收藏 × 3 + 协作意向 × 5 + 近 30d 更新 × 2 + 创作者 ContributionCredit × 0.1 + featuredRank × 100`
- 三个 tab：最新 / 热门 / 编辑精选
- 项目卡片显示最近活动（最后更新时间 + 最近收藏数增量）

#### W4-3 项目详情协作入口前置（P0）

- 顶部 CTA：**加入协作** / **开始组队**（互斥，若该项目已 team 绑定则显示"申请加入 {team}"）
- 次级：收藏 / 分享 / 举报
- 侧栏显示"最近收藏者 + 最近协作意向"

#### W4-4 团队角色扩展与活动时间线（P1）

- `TeamRole` 扩展 `admin` 与 `reviewer`（已有迁移底座）
- `/teams/[slug]` 顶部新 tab："动态"，聚合 TeamTask 变更 + TeamDiscussion + AgentActionAudit

**当前状态**：
- 广场四流已落地并统一文案 / 空态
- 项目画廊热门排序已切换到互动驱动发现分
- 项目详情页协作 CTA 已前置
- `/teams/[slug]?tab=activity` 已支持类型筛选

**验收**：
- 关注 / 推荐 / 热度 / 时间四 tab 可切换，空态清晰
- 项目详情页"加入协作"按钮在真实数据下触发团队申请
- 团队活动时间线按类型可筛选

---

### W5 开发者生态（P0 / P1）· ✅ 当前版已落地

#### W5-1 开发者中心首页（P0）

- `/developers` 改为三栏"场景 quick start"：
  1. **我想让 Cursor 在 VibeHub 里搜项目**（MCP manifest + 3 行 Claude Code 配置）
  2. **我想让我的 agent 加入团队协作**（引导到 `/settings/agents` + 团队角色牌）
  3. **我想做第三方 Agent SaaS**（介绍 MCP Developer Access 按量计费）

#### W5-2 API 文档（P1）

- `/developers/api-docs` 基于 `lib/openapi-spec.ts` 生成交互式文档（当前采用仓库内自定义浏览 + Try it，不引入 swagger-ui-react）
- 每个端点展示 scope 要求 + 限流额度

#### W5-3 API Key 用量（P1）

- `/settings/api-keys` 每个 key 显示近 7 天调用数 mini sparkline
- 点击展开查看近 100 条调用（复用 `McpInvokeAudit`）

#### W5-4 MCP manifest 与版本（P1）

- MCP v2 manifest 暴露 agent 的 capability 元数据（tool + required scope + example）
- 为后续 v3 预留版本字段

**当前版已交付**：
- `/developers` 保留三场景 quick start，并新增 protocol status
- `/developers/api-docs` 可搜索、可切换 auth mode、可对同源 JSON API 执行 Try it
- `/settings/api-keys` 已展示 7 天 sparkline、摘要统计、最近 100 条 MCP 调用
- `/api/v1/mcp/v2/manifest` 已新增 manifestVersion / protocolVersion / generatedAt / tool metadata

**验收**：
- 开发者中心首屏能让一个 Cursor 用户 10 分钟内接入 VibeHub MCP
- API 文档可搜索、可运行

---

### W6 商业与合规收口（P0）

#### W6-1 中国支付真实商户（P0，外部阻塞）

- `lib/billing/providers/alipay.ts` 落地 createCheckoutSession / handleWebhook / cancelSubscription / getSubscription
- `lib/billing/providers/wechatpay.ts` 同上
- 至少一条渠道在真实商户号下完成一次端到端成功支付 + 一次退款

#### W6-2 订阅套餐上线（P0）

- 当前公开套餐先收口为 Free / Pro 两档，Team 套餐延后到后续商业化阶段
- 套餐差异在 `/pricing` 页清楚列出
- 支付成功后立刻写 `BillingRecord` + `UserSubscription.status`

#### W6-3 MCP Developer Access（P1）

- 允许 Pro+ 用户申请"对外发布的 agent"标识 + 按千次调用计费
- 新加一层按量计费（v8 只做申请 + 额度记录，真实结算流程 P2）

#### W6-4 合规定稿（P0，外部）

- 隐私政策 / 用户协议 / 平台规则 / AIGC 条款经法务审校
- 内容审核策略文档（针对 agent 生成内容的来源标记）
- ICP 备案完成

**验收**：
- 至少一次真实商户支付成功 + 可见账单
- Free/Pro 状态真实驱动 quota 生效
- 合规页面（`/privacy` `/terms` `/rules` `/aigc`）全部最终版

---

### W7 后台治理与 AI 助手（P0 / P1 · 当前版已完成）

#### W7-1 运营仪表盘（P0）

新页面 `/admin/dashboard`：

- 北极星：**WAHC** / **AO%** / **Agent 拒绝率**
- 辅助：DAU / 新增用户 / 新增帖子 / 新增项目 / 活跃订阅 / 未处理举报
- 所有指标查询走 `lib/admin/metrics.ts`，P95 < 2s
- 每指标卡下挂一周趋势 sparkline

#### W7-2 AI 审核助手三类任务（P0）

沿用现有 `AdminAiSuggestion` 表：

- `summarize_report(ticketId)` → 摘要 + 风险等级 + 建议处置
- `triage_post(postId)` → 风险等级 + 建议通过/驳回/详审
- `verify_enterprise(id)` → 资料一致性 + 建议

规则：

- 模型走国产小模型（DeepSeek-chat / 通义 Plus / 豆包 Lite 等）
- 单条 token 预算 < 2K input / 512 output
- 每条平均成本 < ¥0.02
- 全部落 `AdminAiSuggestion` · 人工一键采纳 / 驳回
- 零条绕过审计执行

#### W7-3 审计 / MCP / AI 面板（P1）

- `/admin/audit-logs` 按 actor / action / agent / 时间筛选
- `/admin/mcp-audits` 按工具 / 成功率筛选
- `/admin/ai-suggestions` 按目标类型 / 风险等级 / 决策筛选

**验收**：
- 仪表盘加载 < 2s
- 审核员一次完成摘要 + 决定 < 30s
- 所有 AI 建议有决策归属

**当前实现状态**：
- `/admin/dashboard` 已落地，三北极星与六辅助指标均通过 `lib/admin/metrics.ts` 聚合
- AI 审核三类任务已接通 `AdminAiSuggestion`，支持 provider + heuristic fallback
- `/admin/ai-suggestions`、`/admin/audit-logs`、`/admin/mcp-audits` 已支持服务端筛选
- `/admin/reports`、`/admin/moderation`、`/admin/enterprise` 已支持显式生成与决策闭环

---

### W8 基础设施与可观测（P0 / P1 · 当前版已完成）

#### W8-1 Redis 上线（P0）

- 保持签名 cookie session 不变；Redis 承接分布式限流、WS fan-out 和运维 readiness
- Middleware 仍负责 auth / CSRF / request-id；真正的分布式限流下沉到 Node 路由层
- WebSocket pub/sub 通过 Redis channel 支持多实例消息与 presence 汇总
- 生产-like 缺 Redis 时必须在 health / alert 中显式降级，不再静默假装 healthy

#### W8-2 结构化日志（P0）

- 关键路由统一走 request logging wrapper（requestId / path / status / duration）
- `console.*` 已从运行时代码清零（seed / maintenance scripts 除外）

#### W8-3 健康检查（P0）

- `/api/v1/health` 已统一检查：DB / Redis / WebSocket / SMTP / payment providers / admin-AI provider
- `/api/v1/admin/health` 与 `/admin/health` 已展示最近 unresolved alerts

#### W8-4 监控与告警（P1）

- 站内 `SystemAlert` 已落地，支持 Feishu webhook / email 投递与 dedupe
- 关键失败路径已接通告警：billing webhook、admin-AI provider、rate-limit memory fallback、5xx request wrapper

#### W8-5 回滚 SOP（P0）

- `docs/deployment-v7.md` 扩展为 v8 · 含回滚命令
- 数据库备份 cron（每日 + 每次 migrate 前）

**验收**：
- Redis 切换后广播 / 限流回归通过
- 0 条 `console.*`
- 告警通道至少一次真实命中测试

**当前实现状态**：
- 新增统一 Redis client / distributed rate-limit / internal rate-limit route
- `mcp-user-write-rate-limit` 与 `agent-action-rate-limit` 已走分布式限流路径
- `ws-server` 已支持 Redis pub/sub fan-out 与跨实例 presence 汇总
- `SystemAlert` 模型、健康聚合模块和 `/admin/health` recent alerts 已落地
- `docs/deployment-v7.md` 已升级为 v8 部署 / 回滚 runbook

---

## 4. 分阶段（Alpha / Beta / GA）

### Phase Alpha（v8 前 1/3）

- W1 首页 + 主导航 + onboarding 第一版
- W2 `EmptyState` / `ErrorState` / `LoadingSkeleton` / `PageHeader` / `StatCard` / `FormField` / `SectionCard` 落地
- W3 `TeamAgentMembership` 迁移 + 最基础 CRUD + `/teams/[slug]/agents` MVP
- W7 仪表盘框架（不含真实聚合）
- W8 Redis / logging / health 基线落地
- W6 支付宝 / 微信 sandbox 联调通

### Phase Beta（v8 中间 1/3）

- W3 Agent 协作日志 tab + Confirmation 队列 UI
- W3 跨用户 Agent-Agent 协作（受控开通）
- W4 Feed 四流 + 画廊权重 + 协作入口前置
- W5 开发者中心重构 + API 文档
- W7 AI 审核三类任务真实跑通
- W6 至少一条支付渠道真实商户成功跑通一次
- W8 结构化日志清零 runtime console

### Phase GA（v8 末 1/3）

- W1 文案 / 视觉对照定稿
- W2 全站 `scripts/audit-ui-inlines.ts` 违规数清零
- W4 团队角色扩展 + 活动时间线
- W5 API Key 用量 + MCP Developer Access 申请
- W6 合规定稿：ICP · 法务 · AIGC · 数据跨境条款
- W7 运营仪表盘三北极星真实聚合
- W8 告警命中测试与回滚 SOP 演练
- Q3 完整回归 + RC 演练 + `docs/v7-go-live-checklist.md` 完整勾选

---

## 5. 【验收标准】

### 5.1 功能验收

- 首页三段叙事真实数据渲染
- onboarding 3 步可跳过 / 可完成 / 记录事件
- 广场 4 tab 可切换 · 空态差异化
- 画廊 3 tab · 排序由 `score` 驱动
- Agent：绑定 → 加入团队 → 发角色牌 → 执行任务 → Confirmation → 审计时间线
- 跨用户 Agent-Agent：队长 agent 建任务 → 队员 agent 领取 → 队员用户 Confirmation → 完成
- 支付：Free / Pro 两档真实驱动 quota · 至少一条中国渠道真实成功
- 后台：三北极星 + 六辅助指标可视化 · AI 摘要可采纳
- `/settings/agents` 显示 binding + 团队参与 + Confirmation pending + 审计 四块

### 5.2 视觉验收

- `scripts/audit-ui-inlines.ts` 违规 = 0
- 1440 / 768 / 375 三宽度无断层
- 每页必备：PageHeader + EmptyState + ErrorState + LoadingSkeleton 四件套
- 字重最高 600 · 圆角按钮 6px / 卡片 8px / pill pill

### 5.3 性能验收

- 首页 Lighthouse（Perf / A11y / BP / SEO）≥ 90 / 95 / 95 / 90
- 首页 LCP < 2.5s / CLS < 0.05
- 列表 API P95 < 500ms
- 后台聚合 P95 < 2s
- Agent Confirmation 列表 P95 < 300ms
- WebSocket 首包 < 1s

### 5.4 安全 / 合规验收

- 所有 mutating API：CSRF + session 吊销 + 限流
- Agent scope 单测覆盖
- AI 建议全部落表 · 零绕过
- ICP 完成 · 法务定稿 · AIGC 策略可运行
- 中国服务器 + 国产 LLM 优先；跨境需勾选

### 5.5 代码质量验收

- `npm run check` 全绿
- 0 条 `console.*`
- 0 条 `TODO: remove mock`
- 新代码覆盖率 ≥ 70%
- 任一 PR 必须关联本路线图任务编号

### 5.6 成本验收

- 月固定成本实测 < ¥3100
- 单条 AI 审核成本实测 < ¥0.02（连续 7 天采样）
- Pro 用户获客成本（CAC）与 Pro 月费（¥29）之比 ≤ 1:3 目标区间（仅作参考，不阻塞 GA）

---

## 6. 【红线】v8 期间绝不发生

- ❌ 挑战赛 / 活动
- ❌ 企业工作台 / 观察者视图重建
- ❌ Agent 自治（任何无人工确认的写入）
- ❌ 自营 LLM / 自建向量数据库
- ❌ 代码托管 / CI/CD
- ❌ Light / Dark 主题切换
- ❌ PWA / Service Worker
- ❌ 海外优先的 i18n 扩张
- ❌ 满减 / 补贴 / 红包 / 签到 / 抽奖
- ❌ Mock 重新进入生产路径
- ❌ AI 绕过审计自动执行
- ❌ GitHub 从"辅助层"升级为"主登录"
- ❌ 把"能跑"当作"可上线"

---

## 7. 【下一步行动】

按依赖顺序立即推进（支持并行）：

1. 维持 `main` 为 v8 执行主干，冻结已完成的 W1/W2/W3/W4，只允许 fix-forward
2. 维持已完成的 W5/W6 为 fix-forward 范围，不再回头重做开发者中心或公开套餐模型
3. 收口 W6 外部 blocker：SMTP、真实支付宝商户、微信支付证书/商户（若纳入首发）、ICP/法务/AIGC/跨境条款最终审批
4. 冻结已完成的 W7，仅允许 fix-forward
5. 冻结已完成的 W8，仅允许 fix-forward

说明：

- `docs/v8-rc-go-live-rehearsal-2026-04-17.md` 已完成一轮 production-like RC / go-live 演练
- 结论不是“系统未完成”，而是“正式上线只剩外部条件未补齐”

下一阶段不再回头重复规划 W1~W8，而是并行清掉 W6 的外部上线阻塞，并在外部条件齐备后执行最终 go-live 验证。

---

## 8. 结论模板

按 `docs/launch-readiness-standard.md` §8 要求：

**VibeHub 当前尚未达到正式上线标准。**

缺失项：

- SMTP 未配置，production 邮箱注册 / 验证链路不可用
- 中国支付真实商户未跑通
- 合规定稿（ICP / AIGC / 法务）未完成
- W6 外部依赖仍未完成最终上线核验

v8.0 路线图的存在意义就是关闭上面全部项并验证单位经济为正。

GA 当天必须重新对照 `launch-readiness-standard` + `v7-go-live-checklist`，硬门槛全过才允许宣布 v8.0 GA。

---

## 9. 配套文档

| 文档 | 作用 |
|------|------|
| `docs/product-strategy-v8.md` | **v8 战略底本（市场定位 · 差异化 · 商业 · 成本 · 边界）** |
| `docs/roadmap-v8.md` | **本文档 — v8 全维度路线图** |
| `docs/launch-readiness-standard.md` | 正式上线硬门槛 |
| `docs/v7-go-live-checklist.md` | 发布执行清单（v8 沿用） |
| `docs/p0-compliance-checklist.md` | P0 合规清单 |
| `docs/roadmap-v7.md` | v7 历史主线（参考） |
| `docs/release-notes.md` | 发布与变更记录 |
