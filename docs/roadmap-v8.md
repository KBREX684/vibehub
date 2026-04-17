# VibeHub v8.0 Roadmap — 从 RC 到真正「成熟产品」

> 规划日期：2026-04-17
> 定位：v7.0 RC 之后的第一条正式产品化主线。不是"再加一轮功能"，而是把 VibeHub 从"可演示 + 可放量"推进到"真实用户来了留得住、看得懂、愿意付费、愿意协作"的阶段。
> 底线：本路线图所有取舍都以 `docs/launch-readiness-standard.md` 为最高法则，不得膨胀、不得绕过硬门槛、不得让 AI 越权、不得让视觉凌驾于可用性之上。
> 状态：规划文档，用于驱动 v8.0 冲刺；单项落地必须提 PR，按路线图内给出的验收标准闭合。

---

## 0. 如何阅读本文档

本文档按你约定的项目经理输出格式组织：

1. 项目判断（Where are we）
2. 整改方案（What to change）
3. 执行建议（How to change it：前端 / 后端 / 架构 / UI/UX）
4. 验收标准（Definition of Done）
5. 下一步行动（Do this next）

所有事项都打 P0/P1/P2 标签。P0 = 本轮不完成就不让 v8.0 发布；P1 = 本轮强烈建议做完；P2 = 本轮允许延后但要埋点、不允许删掉。

---

## 1. 【项目判断】

### 1.1 当前阶段定位

- 产品代码层面：**v7.0-rc.1 已经切出**，核心主链路（账号、讨论、项目、团队、API/MCP、订阅、后台治理）都是真实闭环，不是 demo。
- 生产就绪层面：**外部依赖仍未齐备**。SMTP 正式联调、中国支付正式商户、ICP/合规确认、Redis 拓扑这四条还在"代码就位、运营未就位"的状态。
- 体验成熟度层面：**结构到位，但没有"产品感"**。
  - 信息架构没有清晰的"首屏叙事 → 核心任务入口 → 回流路径"。
  - 列表 / 详情 / 设置 / 后台四类页的视觉密度、节奏、留白、空状态、加载状态不统一。
  - 发帖、建项目、组队、绑定 agent 这几条关键动作的引导几乎全靠"用户自己猜"。
  - 订阅 / 付费流程仍然是"功能对"但"感觉廉价"。
- 运营成熟度层面：**数据侧仍是黑盒**。没有任何一处 dashboard 能回答"昨天平台发生了什么、哪里在增长、哪里在掉"。
- 工程成熟度层面：**有明显的结构性债**。
  - `repository.ts` + `repositories/*.ts` 仍是 18+ 处 mock fallback 点，退出路径依赖 runtime 判断而不是类型隔离。
  - Prisma 迁移在最近半年内堆了 20+ 条，部分存在"preflight + 正式迁移"的拼补，下一次大版本前必须收敛。
  - 前端组件层缺少"页面级骨架"的统一抽象，所有页面都在直接拼 `div + className`，视觉回归靠人眼。

### 1.2 当前核心问题（按严重度）

| # | 问题 | 严重度 | 影响 |
|---|-----|------|-----|
| 1 | v7.0 RC 的外部阻塞（SMTP / 中国支付 / ICP / Redis）未收敛 | P0 | 不解决不能正式上线 |
| 2 | 中国支付（支付宝 / 微信）仅有 sandbox，未走通真实商户 | P0 | 收不到钱 = 不成立的 SaaS |
| 3 | 首屏和主导航叙事混乱，"VibeHub 到底是什么 / 我来做什么"说不清楚 | P0 | 新用户 30 秒内流失 |
| 4 | 视觉系统 `Monochrome Geek v2` 在 token 层统一，但组件层仍有割裂（按钮 / 卡片 / 空状态 / 表单风格不一） | P1 | 产品廉价感、掉档 |
| 5 | Feed 流（推荐 / 热度 / 关注 / 时间）只有时间 + 热度；关注流 / 推荐流缺失 | P1 | 社区无法留存 |
| 6 | 项目画廊缺少真正的"曝光机制"（只有 createdAt 排序 + featuredRank 手动标记） | P1 | 创作者不愿意上传 |
| 7 | Agent 绑定只落了模型层，没有可用 UI、没有 scope 可视化、没有接入引导 | P1 | VibeHub 的差异化卖点无法对外讲 |
| 8 | 管理员后台 AI 建议（AdminAiSuggestion）已有表结构但提示词 / 任务编排未闭环 | P1 | 审核压力全压在人身上 |
| 9 | 无任何可用的"平台健康 / 运营指标"面板 | P1 | 运营决策拍脑袋 |
| 10 | 国际化只有 zh / en 两套字典，但很多文案硬编码在组件中 | P1 | 英文用户看到一半中文 |
| 11 | 空状态 / 错误状态 / 加载骨架 / 断网态 组件不统一 | P1 | 真实使用下"显得很不专业" |
| 12 | 响应式尚可，但表格 / 后台 / 富表单在窄屏崩掉 | P2 | 移动端体验不佳但不阻塞 |
| 13 | Prisma 迁移积累 + mock fallback，存在中期技术债 | P2 | 下一轮大版本前要清 |
| 14 | 无性能基线（没有 RUM、没有 Core Web Vitals 采集） | P2 | 优化全靠猜 |

### 1.3 当前最高优先级

**v8.0 的最高优先级只有一件事：让 VibeHub 从"功能齐全的原型"变成"一眼看上去就是正经产品的成熟 SaaS"。**

这意味着本轮同时要：

1. 关掉 v7.0 的最后外部阻塞（让 v7.0 真正能 GA）
2. 把"新用户首屏到第一次成功动作"的路径做到无歧义、无卡点、无廉价感
3. 把"创作者发内容 → 内容被看见 → 被协作 → 形成订阅或关注"这条飞轮堵上目前最大的漏
4. 把后台从"能用"升级到"能运营"
5. 建立第一版可信的"平台指标 + 平台治理"视图

**不做：** 挑战赛、企业工作台重建、多 agent 自治、Light/Dark 切换、PWA、任何非主飞轮相关的"炫技"。

---

## 2. 【整改方案】—— v8.0 本轮目标

### 2.1 本轮目标（一句话版）

**把 VibeHub 从 `v7.0-rc.1` 推进到 `v8.0 GA`，标志是：可对外公开注册、可真实收款、首屏叙事清晰、主飞轮在真实使用下能跑起来、后台具备真正的运营视图。**

### 2.2 本轮目标（可验证版）

v8.0 发布当天必须同时满足：

- [ ] `launch-readiness-standard` 的 P0 Gate 全部通过
- [ ] `docs/v7-go-live-checklist.md` A–L 所有必选项勾完（非代码项由运营确认）
- [ ] 首屏、登录、发帖、建项目、组队、订阅、开发者接入 7 条路径的 UI/UX 走查结论为"可对外展示"
- [ ] 中国支付至少一条通道（支付宝 或 微信支付）在**真实商户号**下完成一次端到端成功支付（不是 sandbox）
- [ ] 后台具备运营仪表盘第一版（DAU / 新增 / 讨论 / 项目 / 订阅 / 举报工单 6 个核心指标）
- [ ] AI 审核助手 MVP 在真实工单数据下跑通「摘要 + 风险等级 + 建议」三件，人工一键采纳 / 驳回
- [ ] Agent 绑定端到端可用：用户能在 `/settings/agents` 管理绑定、分配独立 API Key、查看调用审计
- [ ] 视觉走查 0 条"风格断层"级问题（按组件清单逐页对照）

### 2.3 任务拆解（路线图视图）

v8.0 分 5 个工作流并行 + 3 个质量关卡串行。

#### 工作流 A：v7.0 GA 收尾（P0，阻塞上线）

| 任务 | 说明 | 负责模块 |
|------|------|---------|
| A-1 | SMTP 正式联调 | 运维 + backend/email |
| A-2 | 支付宝正式商户联调（checkout / webhook / refund） | billing provider |
| A-3 | 微信支付正式商户联调 | billing provider |
| A-4 | Redis 生产拓扑落地（限流 + WS pub/sub + 会话缓存） | infra |
| A-5 | ICP 备案 / 主体一致性确认 | 法务运营 |
| A-6 | 隐私政策 / 用户协议 / 平台规则法务定稿 | 法务 + `/privacy` `/terms` `/rules` |
| A-7 | 发布窗口 / 回滚 / 值守排班 | 运维 |
| A-8 | Prisma 迁移收敛（合并 preflight / 删除孤儿迁移） | backend/db |

#### 工作流 B：首屏与主叙事重构（P0，直接关系留存）

| 任务 | 说明 | 负责模块 |
|------|------|---------|
| B-1 | 首页 Hero + 三段叙事（看灵感 / 建项目 / 接 agent）重写 | `src/app/page.tsx` |
| B-2 | 主导航重构（社区 / 项目 / 团队 / 开发者 / 价格 5 栏） | `components/site-nav`（新建） |
| B-3 | 登录 / 注册页视觉重做 | `src/app/login`、`src/app/signup` |
| B-4 | 新用户 onboarding 引导（3 步向导：介绍自己 / 关注领域 / 发第一条内容或建项目） | `src/app/onboarding`（新建） |
| B-5 | 全站空状态 / 加载骨架 / 错误态组件统一为 `components/ui/empty-state` + `skeleton` + `error-state` | UI 库 |

#### 工作流 C：社区主飞轮补齐（P0 / P1）

| 任务 | 优先级 | 说明 |
|------|-------|------|
| C-1 | 广场 Feed 流：关注 / 推荐（基于标签 + 互动） / 时间 / 热度 四 tab | P0 |
| C-2 | 项目画廊曝光权重（收藏 / 意向 / 近期活跃 / 创作者信誉的加权） | P0 |
| C-3 | 项目详情页协作入口（"我想加入 / 我想合作 / 开始团队"）前置 | P0 |
| C-4 | 团队页任务评论 + 活动时间线（现有数据模型已支持） | P1 |
| C-5 | 团队角色扩展：`owner / admin / member / reviewer` 并在 UI 呈现 | P1 |
| C-6 | 关注 / 收藏通知通道打通 | P1 |

#### 工作流 D：开发者生态（P0 / P1）

| 任务 | 优先级 | 说明 |
|------|-------|------|
| D-1 | `/developers` 开发者中心重构：从"功能清单"改为"开始使用"入口 | P0 |
| D-2 | Agent 绑定 UI（`/settings/agents`）完整落地：新建 / 编辑 / 停用 / 查看调用审计 | P0 |
| D-3 | API Key scope 可视化 + 每个 Key 的用量图（近 7 天 / 近 30 天） | P1 |
| D-4 | API 文档站基于现有 OpenAPI spec 生成交互式文档 | P1 |
| D-5 | MCP quick start 指引（3 行接入 Cursor / Claude / OpenClaw 的操作路径） | P1 |

#### 工作流 E：后台治理 + AI 助手（P0 / P1）

| 任务 | 优先级 | 说明 |
|------|-------|------|
| E-1 | 运营仪表盘 `/admin`：DAU / 新增 / 讨论数 / 项目数 / 订阅 / 举报 6 指标 | P0 |
| E-2 | AI 摘要 + 风险等级 + 建议：接入举报工单 + 帖子预审 | P0 |
| E-3 | AI 建议 UI 独立卡片 + 一键采纳 / 驳回 + 审计落库 | P0 |
| E-4 | 审计日志面板筛选（actor / action / 时间 / agentBinding） | P1 |
| E-5 | 企业认证审核：AI 自动比对资料 + 建议，管理员人工裁决 | P1 |

#### 质量关卡 Q：串行强制

| 关卡 | 位置 | 内容 |
|------|------|------|
| Q-1 | v8.0 中点 | 视觉走查（所有关键页在 1440 / 768 / 375 三个宽度下全页截图比对） |
| Q-2 | v8.0 中点 | Performance 基线：Lighthouse 首页 / 项目详情 / 讨论详情 三页 |
| Q-3 | v8.0 发布前 | 完整回归 E2E + fresh-schema smoke + RC 演练（参考 `docs/v7-pre-release-rehearsal-2026-04-17.md`） |

### 2.4 影响范围

- 前端：首页、主导航、登录 / 注册、onboarding、全站空状态 / 加载、广场 / 项目画廊 / 团队 / 设置 / 开发者 / 后台
- 后端：billing provider（支付宝 / 微信）、AgentBinding API 补齐、审计日志扩展、后台指标聚合接口、AI 建议服务
- 数据库：已有 `AgentBinding` / `BillingRecord` / `AdminAiSuggestion` / `UserFollow` 模型可复用；v8 期间若有新增字段，必须走合并迁移（不得再堆 preflight）
- 基础设施：Redis 上线、PM2 / nginx 配置复核、监控和告警

### 2.5 风险与依赖

| 风险 | 影响 | 缓解 |
|------|------|------|
| R-1 中国支付商户号审批周期不可控 | 可能阻塞 GA | 先用 sandbox 完成联调；GA 前商户号到位即可切换；GA 标准允许 Alipay / Wechat 二选一到位 |
| R-2 ICP 备案不通过 | 强阻塞上线 | 法务提前进场，不能等 v8 末期才暴露 |
| R-3 Redis 接入可能暴露原单实例隐藏 bug（限速 / WS 广播） | 功能回归风险 | 灰度：先上单节点 Redis，保留原内存限速作为 fallback；WS 切换前压一次广播回归 |
| R-4 AI 审核助手涉及 LLM 调用成本 | 上线后不可预算 | 引入总额度 + 每租户调用上限 + 指数退避 + 可关闭开关 |
| R-5 Prisma 迁移收敛动作 | 可能影响已有生产数据 | 仅允许"逻辑等价"的合并；任何数据迁移必须 backup + dry-run + 回滚脚本 |
| R-6 视觉系统重构可能带来样式回归 | 影响整体体验 | 用 `components/ui/*` 做单入口改造，所有页面先改 import，再改实现 |

### 2.6 明确不做项（本轮）

- 挑战赛 / 活动（P3 后评估）
- 企业工作台、观察者视图重建
- 多 agent 自治编排 / agent 之间直接通信
- 浅色主题 / Light mode
- PWA / Service Worker
- 推荐算法模型化（本轮只做基于标签 + 互动的加权，不上 embedding / 深度推荐）
- 代码托管、PR / Issue 管理、CI/CD（GitHub 仍为辅助层，边界不得突破）

---

## 3. 【执行建议】

### 3.1 前端改造建议

#### 3.1.1 视觉系统：从"token 一致"到"组件一致"

- 所有页面禁止再写 `className="px-4 py-2 rounded-md border border-white/10 ..."` 这种裸样式堆叠。必须走 `components/ui/*`。
- 本轮要补齐的 UI 原件：
  - `EmptyState`：统一空状态（图标 / 标题 / 描述 / 可选 CTA）
  - `ErrorState`：错误态（区分网络错误 / 权限错误 / 404 / 500）
  - `LoadingSkeleton`：按列表 / 卡片 / 详情 / 表格四种场景
  - `PageHeader`：统一页面标题 + 副标题 + 操作区
  - `DataTable`：后台通用表格（列宽、空态、加载、分页、选择）
  - `StatCard`：指标卡（数值 / 增量 / 趋势 sparkline）
  - `FormField`：label / input / hint / error 统一封装
- 所有 `btn-primary / btn-secondary / btn-ghost` 的尺寸规格必须固定为 `sm / md / lg` 三档，禁止项目内再出现"特殊尺寸按钮"。
- 所有卡片间距强制四档：`gap-3 / gap-4 / gap-6 / gap-8`，不再允许 `gap-5 / gap-7`。
- 所有图标使用 `lucide-react`，禁止项目内再引入第二套 icon 库。

#### 3.1.2 首屏重构（最关键的 30 秒）

当前首页问题：hero 文案太 generic，三段 value props 写得像官网营销页但落地到操作不明确。

改造后首屏叙事：

1. Hero：一句话讲"VibeHub 是做什么的"，一句话讲"你来了能做什么"，一个明确 CTA：**「发一个作品 · 找到一个团队」**。
2. 主叙事三段（不是 "feature" 而是 "action"）：
   - **看灵感**：精选讨论 + 项目卡（真实数据）
   - **展示作品**：引导创建项目，强调"10 分钟上线作品页 + 拿到协作入口"
   - **接 agent**：展示 API/MCP 接入，强调"Cursor / Claude / OpenClaw 三行接入"
3. 次级区块：最新上线 / 本周热门 / 正在招人的团队（全部真实数据，不允许用占位）
4. 底部：社区规则 + 合规入口 + 开发者文档 + 订阅价格

#### 3.1.3 登录 / 注册 / 重置密码

- 登录为主、GitHub 关联为辅的视觉层级要明显：邮箱表单居中 60% 宽度 + GitHub 链接做次级按钮，不再上下对称排布。
- 注册页的协议勾选必须默认未勾选（合规要求），且未勾选时禁用提交按钮。
- 重置密码 / 验证邮件的空状态必须有明确的"邮件未收到 → 重新发送 / 换邮箱 / 联系支持"分支。

#### 3.1.4 Onboarding（本轮新建）

- 3 步轻量向导，每步都可以跳过但记录"跳过原因"。
- Step 1：介绍自己（昵称 + 一句话 + 选 1~3 个领域标签）
- Step 2：选择兴趣（至少 1 个；驱动后续推荐流）
- Step 3：第一次动作（三选一：发一条讨论 / 建一个项目 / 浏览首页）
- 每个新注册用户自动获得一次引导，关闭后不再强制。

#### 3.1.5 关键页面节奏改造

- 讨论详情：头部作者信息 + 内容 + 操作区分明三层；评论列表用骨架加载；空评论有明确 CTA。
- 项目详情：顶部 cover + 标题 + 主 CTA（加入协作 / 查看仓库 / 收藏）；左右分栏不要在 1024 以下强拆，移动端改堆叠。
- 团队页：任务板 + 讨论 + 聊天 + 里程碑 四个 tab 必须在 tab 间切换时保留滚动位置。
- 设置页：左侧二级导航必须呈现当前位置高亮，所有子页标题统一使用 `PageHeader`。
- 后台：统一使用 `DataTable` + `StatCard`，不允许再用裸 `table`。

### 3.2 后端改造建议

#### 3.2.1 支付 provider 收敛

- 抽象层 `PaymentProvider` 已有；本轮在 `lib/billing/providers/` 下确认三个实现：
  - `stripe.ts`（已有）
  - `alipay.ts`（补全 createCheckoutSession / handleWebhook / cancelSubscription）
  - `wechatpay.ts`（同上）
- `UserSubscription.paymentProvider` 字段已有，确认所有订阅路径都写入正确值。
- 新建 `BillingRecord` 写入（迁移已有 `p1_billing_records`）：每一次支付成功 / 失败 / 退款都要落一条。
- Webhook 路由按 provider 分派，签名校验必须按 provider 单独实现，禁止公用同一个 secret。
- 中国支付失败后的降级策略：`status=past_due` → 7 天宽限期 → 自动降为 `free`，并发通知。

#### 3.2.2 AgentBinding 端到端

- 模型已有（`p1_agent_bindings`）；本轮补齐：
  - API：`GET/POST/PATCH/DELETE /api/v1/agent-bindings`
  - 每个 binding 对应一个独立 `ApiKey`（`apiKey.agentBindingId` 外键）
  - 每次 API 调用在鉴权时回写 `agentBindingId` 到 `AuditLog`，以便后台追溯
  - scope 由 `ApiKey.scopes` 控制，继承用户权限 → 再用 scope 收窄

#### 3.2.3 后台指标聚合

- 新建 `lib/admin/metrics.ts`：提供 `dau(windowDays)`、`newUsers(windowDays)`、`postCount`、`projectCount`、`activeSubscriptions`、`openReports` 六个聚合查询。
- 所有聚合查询必须：
  - 走只读路径（不得触发写入）
  - 有明确 timeout（建议 3 秒）
  - 有查询 index 支持（不足则在迁移中补 index，不允许在热点表做 full scan）
- 接口 `GET /api/v1/admin/metrics/overview` 返回 6 个指标 + 对比昨天 / 上周的增量。

#### 3.2.4 AI 审核助手（真实落地）

- 新建 `lib/admin/ai-suggestion.ts`：封装 LLM 调用，支持 3 种任务：
  - `summarize_report(ticketId)` → 摘要 + 风险等级 + 建议
  - `triage_post(postId)` → 内容风险分级 + 建议通过 / 驳回 / 人工详审
  - `verify_enterprise(verificationId)` → 资料一致性 + 建议
- 所有调用必须：
  - 写入 `AdminAiSuggestion` 表（模型已有）
  - 附带 `confidence`（LLM 自评）
  - 禁止直接调用任何 mutating API
  - 有每租户 / 每日调用额度
  - 支持 `DRY_RUN` 模式以便本地调试

#### 3.2.5 Mock 退出结构性改造

- 当前 `isMockDataEnabled()` 分散在 18+ 处；v8 期间必须改为"编译期路径选择"：
  - `lib/repository/index.ts` 在模块加载时根据 `RUNTIME_MODE` 决定导出 `prisma-repository` 或 `mock-repository`
  - 运行时不再分支判断
  - 生产环境 import `mock-repository` 的路径在构建期直接 tree-shake 掉
- 这个动作本轮只做"结构准备 + 一个仓库试点"，不一次性全量改。

#### 3.2.6 Prisma 迁移收敛

- 不允许合并已部署迁移；v8 期间新增迁移必须遵守：
  - 不使用 preflight + 正式两段拼补
  - 每条迁移都必须能独立 `migrate deploy` 成功
  - 任何数据迁移必须附回滚脚本
- v8 发布后，单独安排一次迁移清理（P2，不阻塞 v8）。

### 3.3 架构 / 数据 / 接口建议

- **会话策略**：Redis 接入后，session / CSRF token / 限流状态全部迁移至 Redis，保留内存 fallback 但生产禁用。
- **限流分级**：
  - 公共 API：per-IP + per-ApiKey
  - 敏感操作（发帖 / 创建项目 / 举报）：per-user + 全局洪水保护
  - Agent 调用：per-agentBinding 独立于 user
- **审计日志**：
  - `AuditLog` 增加 `agentBindingId`、`clientIp`、`userAgent`、`requestId`
  - 保留期限按合规要求分档（默认 180 天，高风险 365 天，可配置）
- **通知通道**：
  - 站内 `InAppNotification` 已有
  - 本轮新增 `user.notificationPreferences`，允许用户分通道开关（站内 / 邮件 / webhook）
- **观测性**：
  - 所有 API 路由走统一 `withRequest` 中间件，自动写入结构化日志（requestId / userId / agentBindingId / duration）
  - `/api/v1/health` 增加依赖项检查（DB / Redis / LLM provider / SMTP）
- **接口稳定性**：
  - v8 期间不允许破坏性变更 v1 API；需变更的一律走 v2，保留 v1 的 deprecation 头
  - OpenAPI spec 必须在 CI 中与生成类型保持一致，`npm run validate:openapi` 做 gate

### 3.4 UI/UX 提升建议（设计负责人视角）

#### 3.4.1 设计语言巩固

`Monochrome Geek v2` 方向正确，但落地不到位。必须做的统一动作：

- 字重：正文 400 / 强调 500 / 标题 600；**禁止使用 700 以上**（太廉价）。
- 字号：Hero 限 `clamp(2rem, 4vw, 3.5rem)`，Section 限 `2rem`，Card H3 限 `1.25rem`。不允许项目里再出现 `text-5xl` / `text-6xl` 的自定义。
- 颜色：正文色统一走 `--color-text-primary` / `--color-text-secondary`；**禁止在组件中写 `text-white` / `text-gray-400`** 这类硬编码。
- 阴影：保持 flat；`--shadow-card` 保持 `none`；Modal 走 `--shadow-modal`。
- 圆角：卡片 `--radius-lg`（8px），按钮 `--radius-md`（6px），Pill 走 `--radius-pill`；**禁止 `rounded-2xl` 用在按钮上**。

#### 3.4.2 状态反馈

每个交互必须呈现四种状态：默认 / hover / active / disabled。新增：

- 表单提交中：按钮内嵌 spinner + 文字（"保存中…"）
- 表单提交成功：toast 右下角 + 表单内 success banner 二选一
- 表单提交失败：inline field 错误 + 整体错误 banner（字段错误才 inline，系统错误才 banner）

#### 3.4.3 空状态 / 加载状态 / 错误状态

这是本轮"高级感"最容易出效果的一环：

- 空状态：图标（24px，`--color-text-tertiary`）+ 标题（`text-secondary`）+ 描述（`text-tertiary`，max-width 360）+ 可选 CTA。禁止"暂无数据"这种空词。
- 加载骨架：按真实卡片形状，脉冲动画 0.8s，色值 `--color-bg-subtle`。
- 错误态：区分 401 / 403 / 404 / 500 / network。文案分别明确。

#### 3.4.4 动效节制

- 仅在三类场景允许动效：
  - 首次进场：`animate-fade-in-up` 0.6s（已有）
  - 状态切换：opacity + 3~5px transform，0.15~0.2s
  - 反馈（成功 / 错误）：微缩放 0.98 → 1，0.12s
- **禁止**：大面积 parallax、背景粒子、弹性 bounce、跟随鼠标的高亮、任何 > 0.6s 的动效。

#### 3.4.5 响应式基线

- 断点：`sm=640 / md=768 / lg=1024 / xl=1280 / 2xl=1536`
- 任何页面必须在 `375 / 768 / 1440` 三个宽度下跑通。
- 后台表格在 `< 1024` 的响应式策略统一为"横向滚动 + 首列 sticky"。

---

## 4. 【验收标准】

### 4.1 功能验收

| 路径 | 验收 |
|------|------|
| 注册 + 邮箱验证 + 登录 + 重置密码 | 全流程无歧义；协议勾选阻塞式；错误文案按失败原因分类 |
| onboarding 3 步 | 新用户首次登录进入；每步可跳过；跳过记录落库 |
| 广场 4 tab | 关注 / 推荐 / 热度 / 时间 全部可用，切换保留滚动位置，空态文案分别不同 |
| 项目画廊 | 至少 3 种排序（最新 / 最热 / 编辑精选）；曝光权重可在后台查看 |
| 团队协作 | 入队 → 审批 → 任务 → 任务评论 → 聊天 → 里程碑 闭环可跑通 |
| Agent 绑定 | 用户可新建 binding；每个 binding 一个 key；scope 展示；审计日志可查 |
| 订阅 | Stripe / Alipay / WeChat 三条路径可跑通；任一条必须在真实商户号下完成一次成功支付 |
| 后台仪表盘 | 6 个指标真实聚合；对比昨天 / 上周；查询不超过 3 秒 |
| AI 审核 | 举报 / 帖子 / 企业认证三类任务产生建议；管理员一键采纳 / 驳回；审计记录完整 |

### 4.2 视觉验收

- 从 `src/components/ui/` 以外的位置不得出现新增的裸样式堆叠（`className="..."` 超过 6 个 token 的必须抽为组件）
- 在 1440 / 768 / 375 三个宽度下全页截图比对无断层
- 每个页面都有：PageHeader / 空态 / 加载态 / 错误态 四件套就位
- 所有按钮尺寸归档为 sm / md / lg 三档
- 0 条"感觉像两个产品"的页面

### 4.3 性能验收

- 首页 Lighthouse（Perf / A11y / Best Practices / SEO）≥ 90 / 95 / 95 / 90
- 首页 TTFB < 500ms，LCP < 2.5s，CLS < 0.05
- 任何列表接口 P95 < 500ms
- 任何后台聚合接口 P95 < 2s
- WebSocket 首包 < 1s
- 打开一个讨论帖到首屏可交互 < 2s

### 4.4 代码质量验收

- `npm run check`（lint + test + validate:openapi + generate:types + build）全绿
- 新增代码覆盖率不低于 70%
- 0 个 `TODO: remove mock`
- 0 个 `console.*`（须全部走 `logger.*`）
- 任何 P0 任务的 PR 必须关联本路线图的任务编号
- 任何"合并后才能看出来"的视觉改动必须附前后对比截图

### 4.5 安全 / 合规验收

- 所有 mutating API 走 CSRF
- session 服务端可吊销
- API Key scope 边界单独有单测覆盖
- AI 建议全部落 `AdminAiSuggestion`，且没有任何一条绕过审计自动执行
- 合规清单 `docs/p0-compliance-checklist.md` 的"Must confirm before formal launch"全部关闭或有明确延期理由

---

## 5. 【下一步行动】

### 5.1 现在最该立即推进的事项（按依赖顺序）

1. **切 `release/v7.0-rc1` 并冻结范围**（运维），只让 A 工作流的 hotfix 进。
2. **开 `feature/v8` 主干**（工程），所有 v8 的 PR 从这里分叉，合并回 main 前必须过 Q-3。
3. **A-2 / A-3 中国支付商户号联调启动**（商务 + 后端），这是唯一真正"卡时间"的风险。
4. **B-1 / B-2 / B-5 首屏 + 导航 + 统一空状态组件**（前端设计），这是视觉成熟度最快见效的三件。
5. **E-1 后台仪表盘 MVP**（后端 + 前端），为 v8 期间的"有没有人用、用得怎么样"提供第一版答案。
6. **D-2 Agent 绑定 UI 端到端**（前端），把差异化卖点对外讲清楚。

上述六件事可并行推进，但必须在 v8 中点（Q-1 视觉走查）前各自至少有第一版可审阅产物。

### 5.2 本轮完成后下一轮（v9.0 预判，不是承诺）

- 推荐算法真正模型化（embedding + 召回排序两段）
- 团队协作的任务指派 / 审查流闭环（P2-1 ~ P2-5 的前置）
- Agent 角色体系（队长 / 队员 / 审查）与任务分配
- 开发者生态的第三方 OAuth App 与 widget
- 国际化扩展到至少 ja / ko（如果开始出现海外用户信号）
- 性能预算制度化：每条路由在 CI 中跑 perf budget

### 5.3 绝对红线（v8 期间不允许发生）

- 让 Mock 再进一条路径
- 让 AI 自动执行任何 mutating 操作
- 让登录体系再退回"只有 GitHub"
- 让企业能力重新膨胀成工作台
- 让任意一次 PR 绕过 `launch-readiness-standard` 的硬门槛
- 用视觉改造代替功能收敛
- 用功能收敛代替体验成熟

---

## 6. 结论

**VibeHub 当前尚未达到正式上线标准。**

缺失项（按 `launch-readiness-standard`）：

- 正式 SMTP 未验证
- 中国支付未在真实商户号下跑通
- ICP / 法务 / 合规专项确认未收敛
- Redis 生产拓扑未落地
- 首屏叙事 + 主导航仍偏 demo 气质
- 后台无真实运营视图

v8.0 路线图的存在意义就是关闭上面这些项，并把产品体验从"跑得通"推进到"看起来是成熟的 SaaS"。v8.0 发布当日必须重新对照 `launch-readiness-standard`，只有全部 P0 Gate 通过才允许宣布 GA。

---

## 7. 配套文档索引

| 文档 | 用途 |
|------|------|
| `docs/roadmap-current.md` | 当前战略方向（v8 发布后会更新） |
| `docs/roadmap-v8.md` | **本文档 —— v8.0 产品化成熟度路线图** |
| `docs/roadmap-v7.md` | v7.0 生产化升级总计划（历史主线） |
| `docs/roadmap-history.md` | 历史规划归档 |
| `docs/release-notes.md` | 发布与变更记录 |
| `docs/launch-readiness-standard.md` | 正式上线硬门槛（最高法则） |
| `docs/v7-go-live-checklist.md` | 发布执行清单 |
| `docs/v7-pre-release-rehearsal-2026-04-17.md` | v7.0 RC 演练记录（参考模板） |
| `docs/p0-compliance-checklist.md` | P0 合规清单 |
