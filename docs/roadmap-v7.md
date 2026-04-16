# VibeHub Roadmap v7.0 — 正式上线差距分析与执行计划

> 基准文档：`docs/launch-readiness-standard.md` (Frozen Standard v1)
> 审计基线：`roadmap-v5.md` P0-P4 全量交付后的代码库（含 P0-P4 consolidated merge + security hardening）
> 规划日期：2026-04-16
> 定位：**上线前最终差距分析 + 可执行封堵计划**
> 原则：只列出阻塞上线或影响上线质量的实际差距；已完成项不再重复；不引入新范围膨胀。

---

## 0. 方法论

本文档严格按照 `launch-readiness-standard.md` 的 **P0 Gate（§2）** 和 **上线判定清单（§3）** 逐条审计当前代码库实际状态，产出三类结论：

| 标记 | 含义 |
|------|------|
| ✅ PASS | 代码库已满足该条标准，无需额外工作 |
| ⚠️ GAP | 存在可验证的差距，必须在上线前封堵 |
| 🔴 BLOCKER | 硬阻塞——不修不能上线 |

差距项按 `G-{序号}` 编号，执行计划在 §4 统一给出。

---

## 1. P0 Gate 逐条审计

### §2.1 合规与账号

| 标准条目 | 当前状态 | 判定 |
|----------|---------|------|
| 邮箱登录可用，登录/登出/找回/基础验证链路完整 | **仅 GitHub OAuth**。`signup/page.tsx` 明确注释 "All paths use GitHub OAuth. No separate password needed."。无邮箱注册、无密码登录、无找回链路。 | 🔴 **G-01** |
| GitHub 登录不是唯一入口 | GitHub 是当前唯一认证入口 | 🔴 **G-01** |
| 用户协议、隐私政策、平台规则可访问 | `/privacy` 与 `/terms` 页面存在 | ✅ |
| 举报/审核/封禁最小治理闭环 | `POST /api/v1/reports/*`、`/admin/moderation/*` 路由存在；`ModerationCase`、`ReportTicket` 模型完整 | ✅ |
| 企业认证仅作为身份标识 | `enterpriseStatus` 仅控制雷达工作台访问，不影响核心飞轮 | ✅ |
| 中国合规边界不确定项已列出 | **未见专项清单**。隐私政策内容未经中国法律审查标注。 | ⚠️ **G-02** |

### §2.2 生产环境隔离

| 标准条目 | 当前状态 | 判定 |
|----------|---------|------|
| 生产禁止隐式 mock fallback | `runtime-mode.ts`: `USE_MOCK_DATA` 未设置时，若 `DATABASE_URL` 缺失会回退 mock。**生产环境如果漏配 DATABASE_URL，将静默走 mock 而非 fail-fast。** | 🔴 **G-03** |
| staging/production 环境变量分离 | `.env.staging.example` 与 `.env.production.example` 存在 | ✅ |
| 必要 secrets 有独立配置 | `SESSION_SECRET`、`API_KEY_HASH_PEPPER`、`GITHUB_CLIENT_*` 均有独立 env var | ✅ |
| 配置缺失时 fail fast | `env-check.ts` 的 `assertProductionEnv()` 仅在 `ENFORCE_REQUIRED_ENV=true` 时激活；`session-secret-resolver.ts` 在 `NODE_ENV=production` 但 `DATABASE_URL` 缺失时仍返回 dev fallback。`API_KEY_HASH_PEPPER` 不在 fail-fast 检查范围内。 | 🔴 **G-04** |

### §2.3 安全与权限

| 标准条目 | 当前状态 | 判定 |
|----------|---------|------|
| 登录态/CSRF/会话签名/权限闭环 | HMAC-SHA256 session + session version revocation + Edge CSRF double-submit + role whitelist | ✅ |
| 管理员后台独立权限边界 | Edge middleware role guard + server-side `requireAdminSession()` | ✅ |
| API Key scopes/撤销/最小权限 | 18 scopes、SHA-256+pepper 哈希、即时撤销、per-scope 速率 | ✅ |
| 用户与 agent 绑定有明确权限边界 | **MCP invoke 通过 API Key scope 控制，但无显式 "agent binding" 模型。** `types.ts` 中无 AgentBinding 或等价定义。当前 API Key 本身隐式充当 agent 代理凭证。 | ⚠️ **G-05** |
| 高风险 agent 行为有人类确认 | MCP v2 write tools 有 idempotency key 和 per-user rate limit，但无显式 "human confirmation" 流程。当前 write 范围仅限 `create_team_task`、`create_post` 等低风险操作。 | ⚠️（可接受——当前 write scope 风险等级低，标准中 AI 助手定位为"辅助"而非"裁决"） |
| 核心高风险操作有审计日志 | `McpInvokeAudit` 表完整覆盖 MCP 调用；`AuditLog` 模型存在。但 **API Key 创建/撤销、session 登录/登出、admin 操作、团队成员变更缺少审计日志写入**。 | ⚠️ **G-06** |

### §2.4 核心业务闭环

| 标准条目 | 当前状态 | 判定 |
|----------|---------|------|
| 讨论区：列表→发帖→评论→举报/审核 | `/discussions`（recent/hot/featured）→ `/discussions/new` → `CommentThread` → `POST /api/v1/reports/*` + `/admin/moderation/*` | ✅ |
| 项目画廊：创建→展示→互动→曝光排序 | `/projects/new` → `/projects/[slug]` → 收藏/点击 → `/leaderboards` + `/discover` 热度排序 | ✅ |
| 团队：创建→入队→任务推进→协作沟通 | `/teams/new` → join request → tasks/milestones → `TeamChatPanel` (WebSocket) | ✅ |
| API/MCP：至少一个真实接入主链路通畅 | API Key + 18 scopes + MCP v2 invoke + OpenAPI spec | ✅ |
| Free/Pro：套餐状态能真实生效 | Stripe checkout → webhook → `UserSubscription` → tier-based limits | ✅ |

### §2.5 支付与订阅

| 标准条目 | 当前状态 | 判定 |
|----------|---------|------|
| 支付体系非个人收款码 | Stripe 对接，商业化支付 | ✅ |
| 支付抽象层已设计并落地 | `billing.repository.ts` + Stripe SDK 直接集成，无中间抽象层。如需接入支付宝/微信，需重构。 | ⚠️ **G-07** |
| 中国支付路径至少完成方案+配置闭环 | **完全缺失。** 无 Alipay/WeChat Pay 代码、无方案文档、无配置项。 | 🔴 **G-08** |
| 订阅状态机（开通/取消/失败/账单） | `active`、`past_due`、`canceled`、`trialing` 状态完整；webhook 处理 `invoice.payment_failed` → `past_due` | ✅ |
| 不得将伪支付冒充正式支付 | Stripe 是真实支付通道 | ✅ |

### §2.6 运维与可观测性

| 标准条目 | 当前状态 | 判定 |
|----------|---------|------|
| 健康检查可用 | `GET /api/v1/health` — DB + Redis + WS 连通性 | ✅ |
| 关键错误日志可追踪 | pino structured logging + `requestId` propagation | ✅ |
| request id / trace 基础能力 | `x-request-id` header + pino child logger bindings | ✅ |
| 最小告警机制或人工巡检 | **无告警系统。** 无 Slack/email/PagerDuty 集成。health endpoint 存在但无自动巡检调度。 | ⚠️ **G-09** |
| 明确回滚路径 | PM2 ecosystem 可 rollback，但 **无文档化回滚 SOP**。数据库 migration 无 down migration。 | ⚠️ **G-10** |
| 数据库迁移可重复执行且 CI 可验证 | CI `prisma migrate deploy` 在 PostgreSQL service container 上验证。31 个 migration 全部为 up-only。 | ✅ |

### §2.7 质量基线

| 标准条目 | 当前状态 | 判定 |
|----------|---------|------|
| CI 通过 | `p1-gate.yml`：lint + test + OpenAPI + build + E2E | ✅ |
| 核心主链路 smoke 通过 | `smoke:live-data` script 存在，CI 中有 smoke stage | ✅ |
| 核心 E2E 通过 | 6 个 E2E spec files (core-flows, team, discussion, profile, error-ux, social) | ✅ |
| OpenAPI 与生成类型一致 | CI 步骤：`validate:openapi` + `generate:types`，drift 检测 | ✅ |
| 无已知 P0 数据破坏风险 | 无已知 | ✅ |
| 无已知 P0 鉴权绕过风险 | 无已知（HMAC session + Edge CSRF + Admin guard 完整闭环） | ✅ |

---

## 2. 上线判定清单逐条审计（§3）

### §3.1 产品问题

| 条目 | 判定 | 说明 |
|------|------|------|
| 唯一主飞轮 | ✅ | 社区→项目→协作→团队→API/MCP |
| 非主线需求冻结 | ✅ | challenges/collections 存在但不阻塞 |
| 挑战赛等不属于上线阻塞 | ✅ | 明确列入 §1.2 后移 |
| 真实用户全链路 | ⚠️ **G-01** | 注册/登录环节缺邮箱入口 |

### §3.2 用户与社区问题

| 条目 | 判定 | 说明 |
|------|------|------|
| 最小内容治理闭环 | ✅ | 举报→审核→处理 |
| 举报入口+后台处理 | ✅ | |
| 关注/时间流/热度流最小可用 | ✅ | recent/hot/featured 三档 feed |
| 项目曝光排序最小可信机制 | ✅ | weekly leaderboard + discover 热度 |

### §3.3 团队协作问题

| 条目 | 判定 | 说明 |
|------|------|------|
| 真实创建 team | ✅ | |
| 申请加入并审核 | ✅ | |
| 分配任务并推进 | ✅ | tasks + milestones |
| 团队内沟通 | ✅ | WebSocket team chat |
| 单实例部署下稳定 | ✅ | in-memory + DB fallback |

### §3.4 接入生态问题

| 条目 | 判定 | 说明 |
|------|------|------|
| API Key 生成/撤销/限制 | ✅ | |
| MCP 真实客户端接入 | ✅ | stdio transport + HTTP invoke |
| 用户绑定 agent 基础结构 | ⚠️ **G-05** | API Key 隐式代理，无显式 binding |
| agent 处于"用户授权代理" | ✅ | scope + rate limit 控制 |

### §3.5 支付问题

| 条目 | 判定 | 说明 |
|------|------|------|
| Free/Pro 真实区分 | ✅ | tier-based limits 生效 |
| 支付驱动订阅变化 | ✅ | Stripe webhook → subscription state |
| 中国支付路径可落地方案 | 🔴 **G-08** | 完全缺失 |
| 避免个人收款码 | ✅ | Stripe 商业支付 |

### §3.6 后台治理问题

| 条目 | 判定 | 说明 |
|------|------|------|
| 管理员后台核心事务处理 | ✅ | users/moderation/collaboration/enterprise |
| AI 仅提供建议 | ✅ | admin AI 为辅助定位 |
| AI 结论可追溯/复核 | ✅ | |

### §3.7 技术问题

| 条目 | 判定 | 说明 |
|------|------|------|
| 完全脱离隐式 mock | 🔴 **G-03** | 生产可能静默回退 mock |
| 最小分布式意识 | ✅ | rate limit + logging + config |
| 回滚能力 | ⚠️ **G-10** | PM2 可回滚但无 SOP |
| 环境隔离 | ✅ | .env 分离 + env-check |
| 最小可观测性 | ⚠️ **G-09** | 日志有，告警无 |

---

## 3. 差距清单汇总

| 编号 | 差距描述 | 阻塞等级 | 涉及标准 | 影响范围 |
|------|---------|---------|---------|---------|
| **G-01** | **无邮箱登录**。GitHub OAuth 是唯一认证入口，不满足"邮箱登录可用"和"GitHub 不是唯一入口"两条硬门槛。 | 🔴 BLOCKER | §2.1, §3.1 | auth 全栈 |
| **G-02** | **中国合规边界未专项列出**。隐私政策/用户协议未标注中国法律合规核验状态。 | ⚠️ GAP | §2.1 | 文档/法务 |
| **G-03** | **生产环境可能静默走 mock**。`runtime-mode.ts` 在 `USE_MOCK_DATA` 未设置 + `DATABASE_URL` 缺失时回退 mock，而非 fail-fast。 | 🔴 BLOCKER | §2.2, §3.7 | runtime-mode.ts, env-check.ts |
| **G-04** | **Fail-fast 不完整**。`assertProductionEnv()` 需要手动开启 `ENFORCE_REQUIRED_ENV=true`；`session-secret-resolver.ts` 在 production + 无 DB URL 时仍返回 dev secret；`API_KEY_HASH_PEPPER` 未纳入启动检查。 | 🔴 BLOCKER | §2.2 | env-check.ts, session-secret-resolver.ts |
| **G-05** | **无显式 agent-user binding 模型**。API Key 隐式充当 agent 凭证，但无明确的"用户绑定 agent"数据结构。 | ⚠️ GAP | §2.3, §3.4 | types.ts, schema.prisma |
| **G-06** | **审计日志覆盖不足**。API Key 创建/撤销、session 登录/登出、admin 操作、团队成员变更未写入 AuditLog。 | ⚠️ GAP | §2.3 | 多个 route handler |
| **G-07** | **支付抽象层缺失**。Stripe SDK 直接集成，无 PaymentProvider 接口。接入支付宝/微信需重构。 | ⚠️ GAP | §2.5 | billing 全栈 |
| **G-08** | **中国支付路径完全缺失**。无支付宝/微信支付代码、方案、配置。 | 🔴 BLOCKER | §2.5, §3.5 | billing 全栈 |
| **G-09** | **无告警机制**。health endpoint 存在但无自动化巡检调度和告警通知。 | ⚠️ GAP | §2.6 | infra/运维 |
| **G-10** | **回滚路径未文档化**。PM2 可回滚但无 SOP，数据库 migration 无 down path。 | ⚠️ GAP | §2.6 | 文档/infra |

---

## 4. 执行计划

### 分级策略

按照 `launch-readiness-standard.md` §4 的四类分级：

| 级别 | 对应差距 | 执行要求 |
|------|---------|---------|
| **P0 硬阻塞修复** | G-01, G-03, G-04, G-08 | 不修不能上线，立即启动 |
| **P1 上线增强项** | G-02, G-05, G-06, G-07, G-09, G-10 | 提升首发质量，上线前完成 |
| P2 差异化能力 | 无新增 | v5.0 P2 残余项按需推进 |
| P3 中长期扩展 | 无新增 | 明确后移 |

---

### P0：硬阻塞修复（不修不能上线）

#### G-01：邮箱登录体系

**根因分析：** 项目启动时选择 GitHub OAuth 作为 MVP 入口，符合开发者社区快速验证需求。但 launch-readiness-standard 明确要求"邮箱登录可用"且"GitHub 不是唯一入口"——这是合规与用户覆盖的双重硬门槛。

**方案选择与取舍：**

| 方案 | 优势 | 劣势 | 结论 |
|------|------|------|------|
| A. 传统 email + password | 用户最熟悉，完全自主 | 需密码加密存储(bcrypt/argon2)、找回链路、暴力破解防护、密码强度校验 | 实现成本高，维护面广 |
| B. Magic Link (email-only, 无密码) | 零密码存储风险、UX 简洁 | 依赖邮件到达率、首次体验延迟 | **推荐**——与开发者社区无密码趋势匹配，安全面最小 |
| C. 邮箱 OTP (一次性验证码) | 无密码存储，验证快 | 同样依赖邮件/短信，需防暴力 | 与 B 类似但多了 OTP 状态管理 |

**推荐方案：B — Magic Link**

**实现要点：**
1. **数据模型**
   - `User` 模型新增 `email` 字段（已存在，来自 GitHub OAuth 回调）
   - 新建 `MagicLinkToken` 模型：`id`, `userId?`, `email`, `token`(SHA-256 hash), `expiresAt`, `usedAt`
   - 注册时：email 不存在 → 创建 User + 发送 magic link
   - 登录时：email 存在 → 发送 magic link → 验证后建立 session

2. **API 路由**
   - `POST /api/v1/auth/magic-link` — 接收 email，生成 token，发送邮件
   - `GET /api/v1/auth/magic-link/verify?token=xxx` — 验证 token，创建 session cookie
   - Rate limit: 同一 email 5 次/小时

3. **邮件发送**
   - `nodemailer` 已在依赖中（v8.0.5）
   - 需配置 SMTP：`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - 生产环境必须配置真实 SMTP，dev 环境可用 Ethereal/Mailtrap

4. **前端**
   - `/login` 页面增加 email 输入 + "发送登录链接" 按钮
   - `/signup` 页面增加 email 注册路径
   - 验证成功后的 redirect 逻辑与 GitHub OAuth 复用

5. **安全边界**
   - Token 有效期 15 分钟，单次使用
   - Token 存储为 SHA-256 hash，非明文
   - 发送邮件频率限制防滥用
   - 邮件内容不泄露用户是否已注册（统一提示"如果该邮箱已注册，您将收到登录链接"）

6. **回归风险**
   - 现有 GitHub OAuth 流程不受影响
   - Session 机制完全复用（HMAC cookie + session version）
   - CSRF 保护自动覆盖（已在 middleware 层）

**影响范围：** `schema.prisma` (migration), `auth.ts`, 2 个新 API route, `/login` + `/signup` 页面, `push-dispatcher.ts`/新建 `mailer.ts`, `.env.*.example`

**复杂度：L**
**预估工作量：2-3 天**

---

#### G-03：生产环境禁止静默 mock 回退

**根因分析：** `runtime-mode.ts` 第 24 行，`USE_MOCK_DATA` 未设置时的 fallback 逻辑为"有 DATABASE_URL 走 DB，否则走 mock"。这在开发体验上是好的，但在生产中构成静默降级风险。

**方案：**
1. `runtime-mode.ts`: 当 `NODE_ENV === "production"` 且 `USE_MOCK_DATA` 未显式设置为 `"true"` 时，若 `DATABASE_URL` 缺失，直接 `throw new Error("Production requires DATABASE_URL when USE_MOCK_DATA is not 'true'")`
2. 同时在 `isMockDataEnabled()` 增加保护：`NODE_ENV === "production" && result === true` 时 `console.error` + 考虑是否允许（当前标准认为不允许）

**影响范围：** `runtime-mode.ts` (约 5-10 行改动)
**复杂度：XS**
**预估工作量：< 1 小时**

---

#### G-04：Fail-fast 检查完善

**根因分析：** 三个独立的 fail-fast 漏洞：
1. `assertProductionEnv()` 需要手动 `ENFORCE_REQUIRED_ENV=true` 才激活
2. `session-secret-resolver.ts` 在 production + 无 DATABASE_URL 时返回 dev secret
3. `API_KEY_HASH_PEPPER` 未纳入启动检查

**方案：**
1. **`env-check.ts`**: `NODE_ENV === "production"` 时自动激活检查，不再依赖额外 flag。新增检查项：`API_KEY_HASH_PEPPER`（如果 API Key 功能启用）
2. **`session-secret-resolver.ts`**: `NODE_ENV === "production"` 时，若 `SESSION_SECRET` 未设置，直接 throw，不返回 fallback
3. **`instrumentation.ts`**: 确保 `assertProductionEnv()` 在 Next.js 启动时被调用（当前已是，只需确认）

**影响范围：** `env-check.ts`, `session-secret-resolver.ts` (约 15-20 行改动)
**复杂度：S**
**预估工作量：< 2 小时**

---

#### G-08：中国支付路径方案

**根因分析：** launch-readiness-standard §2.5 要求"至少明确并完成中国主流支付路径的生产方案：支付宝/微信支付"。标准同时要求"在商户、备案、正式参数未齐备前，不得将伪支付冒充正式支付上线"。

**方案选择与取舍：**

| 方案 | 优势 | 劣势 | 结论 |
|------|------|------|------|
| A. 直接接入支付宝/微信 SDK | 原生体验 | 需要中国企业主体、ICP 备案、商户资质审核（周期 1-4 周） | 商务前置条件多 |
| B. 通过 Stripe 的支付宝/微信 PaymentMethod | 统一后端、Stripe 生态 | Stripe 支付宝/微信仅支持部分币种和地区 | 可行但有限制 |
| C. 通过聚合支付服务商（Ping++/收钱吧/LianLian） | 一个接口支持多渠道 | 增加第三方依赖和费用 | 灵活但增加复杂度 |
| D. 支付抽象层 + 方案文档（不含实际接入） | 满足标准中"完成方案与配置闭环"要求，不阻塞上线 | 上线时中国用户无法付费 | **最小可行——标准要求"方案与配置闭环"而非"已接入"** |

**推荐方案：D — 支付抽象层 + 方案文档**

标准原文："中国支付路径至少完成正式接入方案与上线所需配置闭环"。关键词是**方案**和**配置闭环**，不是"已上线中国支付"。结合 §2.5 最后一条"在商户、备案、正式参数未齐备前，不得将伪支付冒充正式支付上线"——这恰好说明标准预期了参数未齐备的情况。

**实现要点：**
1. **支付抽象层**
   - 定义 `PaymentProvider` 接口：`createCheckout()`, `handleWebhook()`, `getPortalUrl()`, `syncSubscription()`
   - `StripePaymentProvider` 实现现有逻辑
   - `AlipayWechatPaymentProvider` 占位实现（throw "Not configured"）
   - 工厂函数根据 `PAYMENT_PROVIDER` 环境变量选择实现

2. **方案文档**
   - `docs/china-payment-plan.md`：
     - 推荐路径：Stripe Payment Methods (支付宝/微信) 或 聚合支付
     - 商户资质清单
     - 所需环境变量
     - 接入时序图
     - 上线判定条件

3. **前端适配**
   - `/pricing` 页面根据 `NEXT_PUBLIC_PAYMENT_PROVIDER` 显示可用支付方式
   - 中国支付未配置时，显示"即将支持"提示

**影响范围：** 新建 `lib/payment/` 抽象层, 重构 `billing/` 路由, 新建 `docs/china-payment-plan.md`, 前端 PricingCards 适配
**复杂度：M**
**预估工作量：2-3 天**

---

### P1：上线增强项（提升首发质量）

#### G-02：中国合规边界清单

**实现：** 创建 `docs/china-compliance-checklist.md`，列出以下核验项：
- 隐私政策是否符合《个人信息保护法》要求
- 用户协议是否符合《网络安全法》要求
- 数据跨境传输是否涉及安全评估
- ICP 备案状态
- 网信办内容审核要求
- 每项标注当前状态（已确认 / 待确认 / 不适用）

**复杂度：S**（纯文档）
**影响范围：** 新建 1 个文档

---

#### G-05：Agent-User Binding 基础模型

**根因分析：** 标准要求"至少支持用户与 agent 的基础绑定模型"。当前 API Key 隐式充当 agent 凭证，但从产品语义上，"agent" 和 "API Key" 不是同一个概念。一个用户可能有多个 agent，每个 agent 绑定不同的 scopes。

**方案（最小闭环）：**
1. `ApiKey` 模型新增可选字段 `agentLabel`（String?, 用于标识该 key 关联的 agent 名称/类型）
2. 新增 API：`PATCH /api/v1/me/api-keys/:id` 支持更新 `agentLabel`
3. 前端 `/settings/api-keys` 页面显示 agent label，支持编辑
4. 文档说明：API Key 即 agent 的访问凭证，`agentLabel` 标识绑定关系

**取舍说明：** 不引入独立的 `Agent` 模型——标准说的是"基础绑定模型"而非"完整 agent 管理系统"。当前阶段用 label 标识足够，后续可演进为独立模型。

**复杂度：S**
**影响范围：** `schema.prisma` (1 字段), `api-keys` route, 前端 settings

---

#### G-06：审计日志覆盖扩展

**实现要点：**
1. 创建 `lib/audit.ts` 工具函数：`writeAuditLog({ userId, action, resourceType, resourceId, metadata })`
2. 在以下位置增加审计日志写入：
   - `POST /api/v1/me/api-keys` — key 创建
   - `DELETE /api/v1/me/api-keys/:id` — key 撤销
   - `POST /api/v1/auth/github/callback` — 登录成功
   - `POST /api/v1/auth/logout` — 登出
   - `POST /api/v1/admin/*` — admin 操作
   - `POST /api/v1/teams/:slug/join` — 成员变更
3. 使用已存在的 `AuditLog` 模型，无需 schema 变更

**复杂度：M**
**影响范围：** 新建 `lib/audit.ts`, 修改 6-8 个 route handler

---

#### G-07：支付抽象层

与 G-08 合并实施。支付抽象层是 G-08 方案 D 的核心组成部分。

---

#### G-09：最小告警机制

**方案（最小可行）：**
1. 创建 `scripts/health-check-cron.sh`：
   - `curl` 调用 `/api/v1/health`
   - 状态非 `ok` 时发送通知（邮件或 webhook）
2. 文档化 cron 配置：`*/5 * * * * /path/to/health-check-cron.sh`
3. 可选：在 `health` route 中增加 `X-Health-Status` 响应头，便于负载均衡器健康检查

**替代方案（更完善）：**
- 集成 UptimeRobot / Better Stack / Checkly 等外部监控（SaaS，无代码改动）
- 文档中说明推荐方案

**复杂度：S**
**影响范围：** 新建脚本 + 文档

---

#### G-10：回滚 SOP 文档化

**实现：** 创建 `docs/rollback-sop.md`：
- PM2 应用回滚步骤
- 数据库 migration 回滚策略（手动 SQL 或 Prisma migrate resolve）
- 配置回滚
- 回滚判定条件（5xx 率 > 5%、核心链路不可用等）
- 回滚后通知流程

**复杂度：S**（纯文档）

---

## 5. 执行顺序与依赖图

```
Week 1 (并行启动):
  ├── G-03 (XS) ─── 生产禁止 mock 回退
  ├── G-04 (S)  ─── Fail-fast 完善
  ├── G-02 (S)  ─── 合规清单（文档）
  ├── G-10 (S)  ─── 回滚 SOP（文档）
  └── G-09 (S)  ─── 告警机制

Week 1-2 (序列):
  └── G-08/G-07 (M) ─── 支付抽象层 + 中国支付方案文档

Week 2-3 (序列):
  └── G-01 (L) ─── Magic Link 邮箱登录
       ├── 数据模型 + migration
       ├── API 路由
       ├── 邮件发送
       ├── 前端 UI
       └── 测试

Week 2 (并行):
  ├── G-05 (S) ─── Agent label
  └── G-06 (M) ─── 审计日志扩展
```

依赖关系：
- G-03 和 G-04 无依赖，应最先完成
- G-08/G-07 需要在支付抽象层设计后才能完成中国支付方案
- G-01 是最大工作量，尽早启动但可与文档类工作并行
- G-05 和 G-06 相互独立，可并行

---

## 6. 验收标准

### P0 硬阻塞验收

| 差距 | 验收条件 |
|------|---------|
| G-01 | 用户可通过邮箱注册/登录，GitHub 登录保持可用。E2E 测试覆盖 magic link 流程。 |
| G-03 | `NODE_ENV=production` 且 `DATABASE_URL` 缺失时，应用启动失败而非静默走 mock。 |
| G-04 | `NODE_ENV=production` 时，缺少 `SESSION_SECRET` 或 `DATABASE_URL` 应用拒绝启动。 |
| G-08 | `docs/china-payment-plan.md` 存在且内容完整；`PaymentProvider` 接口定义完成；Stripe 实现通过现有测试。 |

### P1 增强项验收

| 差距 | 验收条件 |
|------|---------|
| G-02 | `docs/china-compliance-checklist.md` 存在，所有条目有状态标注。 |
| G-05 | `ApiKey` 模型包含 `agentLabel` 字段；API 支持更新；前端可编辑。 |
| G-06 | API Key CRUD、登录/登出、admin 操作在 `AuditLog` 表中有记录。 |
| G-07 | `PaymentProvider` 接口定义完成（随 G-08 交付）。 |
| G-09 | health check 脚本可用且文档化；或外部监控方案已文档化。 |
| G-10 | `docs/rollback-sop.md` 存在且内容完整。 |

---

## 7. 当前结论

### **VibeHub 当前尚未达到正式上线标准。**

缺失项（4 个硬阻塞 + 6 个增强项）：

**硬阻塞：**
1. G-01：无邮箱登录（GitHub OAuth 为唯一入口）
2. G-03：生产环境可能静默走 mock
3. G-04：Fail-fast 检查不完整
4. G-08：中国支付路径完全缺失

**增强项：**
5. G-02：中国合规边界未专项列出
6. G-05：无显式 agent-user binding 模型
7. G-06：审计日志覆盖不足
8. G-07：支付抽象层缺失
9. G-09：无告警机制
10. G-10：回滚路径未文档化

当以上 10 项全部封堵后，可重新依据 `launch-readiness-standard.md` 进行上线判定。

---

## 8. 配套文档索引

| 文档 | 用途 |
|------|------|
| `docs/launch-readiness-standard.md` | 上线判定基准（冻结版） |
| `docs/roadmap-v7.md` | **本文档 — 上线差距分析与执行计划** |
| `docs/roadmap-v5.md` | P0-P4 全栈演进路线图（历史基线） |
| `docs/roadmap-current.md` | 当前战略方向 |
| `docs/roadmap-history.md` | 历史规划归档 |
| `docs/release-notes.md` | 发布与变更记录 |
| `docs/repository-cleanup-report.md` | 仓库整理报告 |

---

## 9. 范围控制声明

本路线图严格遵守 `launch-readiness-standard.md` §4 范围控制规则：

1. **不引入新功能需求**——所有差距项均直接命中上线硬门槛或上线判定清单。
2. **不扩张产品边界**——挑战赛、复杂企业工作台、多 agent 自治网络等明确不在本路线图范围内。
3. **不膨胀技术投资**——不要求引入 APM/Grafana/Kubernetes 等重基建，仅补齐最小可行运维能力。
4. **文档类工作与代码类工作分离**——G-02、G-09、G-10 为纯文档/脚本工作，不影响核心代码变更节奏。
