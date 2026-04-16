# VibeHub 路线图 v7.0 — 上线差距分析与闭环记录

> 更新日期：2026-04-16  
> 状态：**Step 4 完成 — Go-Live Readiness Audit 已执行**  
> Step 2 差距分析已补全完整审计记录

---

## 0. 背景

v7.0 路线图基于 `docs/launch-readiness-standard.md`（冻结版）对 VibeHub 进行全面上线就绪审计。
审计结果识别出 10 个差距项 (G-01 ~ G-10)，分为 P0 硬阻塞和 P1 增强两级。

---

## 1. Step 1 — 制定上线标准

产出：`docs/launch-readiness-standard.md`（冻结版 v1）

定义了：
- P0 上线硬门槛（合规、安全、隔离、业务闭环、支付、运维、质量）
- 上线判定清单（产品、社区、团队、接入、支付、治理、技术共 7 大类）
- 范围控制规则（P0/P1/P2/P3 四级分类）
- 一票否决项

## 2. Step 2 — 差距分析

> 审计基线：commit f0e5033（P0-P4 安全加固合并后、Step 3 实施前）  
> 审计方法：逐项对照 `docs/launch-readiness-standard.md` §1–§3 全部条目

---

### 2.1 §1 产品边界冻结 — 审计

#### §1.1 必须存在的核心能力

| # | 能力 | 审计结果 | 证据 |
|---|------|---------|------|
| 1 | 邮箱登录 | ❌ **缺失** | 仅 GitHub OAuth + demo-login；无 magic link / 邮箱密码路径 |
| 1 | GitHub 登录 | ✅ 通过 | `api/v1/auth/github/` + `api/v1/auth/github/callback/` 完整 |
| 1 | 基础账号安全 | ✅ 通过 | CSRF (middleware.ts Edge HMAC)、session 签名、cookie flags |
| 2 | 社区讨论 CRUD | ✅ 通过 | posts/comments 路由、列表/详情/评论/回复链路完整 |
| 2 | 推荐/热度/时间流 | ✅ 通过 | feed sort=hot/recent/following 已实现 |
| 2 | 举报与审核 | ⚠️ **部分缺失** | admin 侧 moderation 路由存在，但无用户侧 `POST /api/v1/reports` 提交入口 |
| 3 | 项目画廊 | ✅ 通过 | projects CRUD + facets + 搜索/筛选 + 排行 (views/stars) |
| 4 | 团队协作 | ✅ 通过 | teams CRUD + join-requests + tasks + milestones + chat |
| 5 | API Key | ✅ 通过 | me/api-keys 完整 CRUD + scopes + revoke |
| 5 | OpenAPI | ✅ 通过 | `scripts/validate-openapi.ts` CI gate |
| 5 | MCP 接入 | ✅ 通过 | mcp/v2/manifest + mcp/v2/invoke + 3 个工具路由 |
| 5 | Agent 绑定 | ❌ **缺失** | ApiKey 模型无 `agentLabel`，无法标识绑定的 agent |
| 6 | Free/Pro | ✅ 通过 | UserSubscription + checkout/portal/webhook 链路 |
| 6 | 支付抽象层 | ❌ **缺失** | Stripe 直接嵌入 billing 路由，无 provider 抽象层 |
| 6 | 中国支付路径 | ❌ **缺失** | 无方案、无文档、无 placeholder |
| 7 | 管理员后台 | ✅ 通过 | 12 个 admin API 路由 (users/posts/projects/reports/moderation/enterprise 等) |

#### §1.2 明确不上线的能力

| 能力 | 状态 | 说明 |
|------|------|------|
| 挑战赛 | ✅ 后移 | challenges 路由存在但标记为 P3 |
| 复杂企业工作台 | ✅ 后移 | enterprise 作为观察层 |
| 高复杂度 agent 自治 | ✅ 后移 | MCP invoke 需 API Key + 人工触发 |

---

### 2.2 §2 P0 Gate 逐项审计

#### §2.1 合规与账号

| 条目 | 状态 | 证据/差距 |
|------|------|----------|
| 邮箱登录可用 | ❌ **G-01** | 仅 GitHub OAuth 和 demo-login；无邮箱登录通道 |
| GitHub 不是唯一入口 | ❌ **G-01** | GitHub 是生产环境唯一真实登录入口 |
| 用户协议/隐私政策 | ✅ | `/terms` (65 行)、`/privacy` (58 行) 页面已存在 |
| 举报/审核/封禁闭环 | ⚠️ **S4-03** | admin 审核路由存在，但缺少用户提交举报的 POST 端点 |
| 企业认证仅为标识 | ✅ | EnterpriseProfile 为 secondary observer layer |
| 中国合规边界 | ❌ **G-02** | 无合规清单文档，中国法规不确定项未列出 |

> **结论**：§2.1 有 2 个 P0 差距 (G-01, S4-03) + 1 个 P1 差距 (G-02)

#### §2.2 生产环境隔离

| 条目 | 状态 | 证据/差距 |
|------|------|----------|
| 禁止隐式 mock fallback | ❌ **G-03** | `runtime-mode.ts` 在 `NODE_ENV=production` 且无 `DATABASE_URL` 时静默回退 mock |
| staging/prod 变量分离 | ✅ | `.env.production.example` 明确定义 |
| secrets 不依赖默认值 | ⚠️ **G-04** | `session-secret-resolver.ts` 允许 dev fallback `"dev-session-secret-change-me"` |
| 缺失配置 fail-fast | ❌ **G-04** | `env-check.ts` 中 `assertProductionEnv()` 已定义但 **未在启动时调用** |

> **结论**：§2.2 有 2 个 P0 差距 (G-03, G-04)

#### §2.3 安全与权限

| 条目 | 状态 | 证据/差距 |
|------|------|----------|
| CSRF 闭环 | ✅ | middleware.ts Edge HMAC + double-submit cookie |
| 管理员独立权限边界 | ✅ | `requireAdminSession()` + `isAdminPath()` middleware |
| API Key scopes/撤销 | ✅ | 完整 CRUD + scopes JSON + revokedAt |
| Agent 绑定权限边界 | ❌ **G-05** | ApiKey 模型无 `agentLabel` 字段，agent 与 key 的绑定关系无法追踪 |
| 高风险 agent 人类确认 | ✅ | MCP invoke 需 API Key + 人工触发 |
| 核心操作审计日志 | ❌ **G-06** | 无集中式审计日志模块 (`lib/audit.ts` 不存在)，高风险操作无审计 trail |

> **结论**：§2.3 有 2 个 P1 差距 (G-05, G-06)

#### §2.4 核心业务闭环

| 条目 | 状态 | 证据 |
|------|------|------|
| 讨论区闭环 | ✅ | 列表→发帖→评论→(缺举报入口，但审核路由存在) |
| 项目画廊闭环 | ✅ | 创建→展示→互动→曝光排序 |
| 团队闭环 | ✅ | 创建→入队→任务推进→聊天沟通 |
| API/MCP 接入 | ✅ | manifest→invoke→audit (mcp-invoke-audits) |
| Free/Pro 生效 | ✅ | UserSubscription + checkApiKeyLimit |

> **结论**：§2.4 全部通过

#### §2.5 支付与订阅

| 条目 | 状态 | 证据/差距 |
|------|------|----------|
| 非个人收款码 | ✅ | Stripe 正规支付接入 |
| 支付抽象层可扩展 | ❌ **G-07** | Stripe SDK 直接嵌入 billing route handler，无 provider interface |
| 中国支付路径 | ❌ **G-08** | 无支付宝/微信支付方案，无 china-payment-plan 文档 |
| 订阅状态机 | ✅ | checkout→webhook→activate/cancel 链路完整 |

> **结论**：§2.5 有 1 个 P0 差距 (G-08) + 1 个 P1 差距 (G-07)

#### §2.6 运维与可观测性

| 条目 | 状态 | 证据/差距 |
|------|------|----------|
| 健康检查 | ✅ | `GET /api/v1/health` (DB+Redis+WebSocket) |
| 关键错误可追踪 | ✅ | pino structured logging + X-Request-Id |
| 最小告警机制 | ❌ **G-09** | 无 health-check-cron.sh，无告警脚本或监控配置 |
| 回滚路径 | ❌ **G-10** | 无 rollback-sop.md，无明确回滚文档 |
| DB 迁移可重复 | ✅ | Prisma migrate + CI 验证 |

> **结论**：§2.6 有 2 个 P1 差距 (G-09, G-10)

#### §2.7 质量基线

| 条目 | 状态 | 证据 |
|------|------|------|
| CI 通过 | ✅ | lint 无 error，48+ 测试文件通过 |
| 核心 smoke 通过 | ✅ | E2E Playwright 场景存在 |
| OpenAPI 一致 | ✅ | `scripts/validate-openapi.ts` CI gate |
| 无 P0 数据破坏风险 | ✅ | 事务 + 级联删除设计 |
| 无 P0 鉴权绕过风险 | ✅ | CSRF + session + admin guard |

> **结论**：§2.7 全部通过

---

### 2.3 §3 上线判定清单 — 预判

| 清单编号 | 问题 | 预判 | 阻塞差距 |
|---------|------|------|---------|
| 3.1.1 | 唯一主飞轮？ | ✅ 是 | — |
| 3.1.2 | 冻结非主线需求？ | ✅ 是 | — |
| 3.1.3 | 挑战赛等非阻塞？ | ✅ 是 | — |
| 3.1.4 | 真实用户主链路？ | ❌ 否 | G-01（邮箱登录缺失） |
| 3.2.1 | 内容治理闭环？ | ⚠️ 部分 | S4-03（用户举报入口缺失） |
| 3.2.2 | 举报入口与后台？ | ⚠️ 部分 | S4-03 |
| 3.2.3 | 关注/时间流/热度流？ | ✅ 是 | — |
| 3.2.4 | 项目曝光排序？ | ✅ 是 | — |
| 3.3.1–3.3.5 | 团队协作 5 项？ | ✅ 全是 | — |
| 3.4.1 | API Key 生成/撤销？ | ✅ 是 | — |
| 3.4.2 | MCP 真实接入？ | ✅ 是 | — |
| 3.4.3 | Agent 绑定基础？ | ❌ 否 | G-05（agentLabel 缺失） |
| 3.4.4 | Agent 为用户代理？ | ✅ 是 | — |
| 3.5.1 | Free/Pro 区分？ | ✅ 是 | — |
| 3.5.2 | 支付驱动订阅？ | ✅ 是 | — |
| 3.5.3 | 中国支付可落地？ | ❌ 否 | G-08 |
| 3.5.4 | 非伪支付？ | ✅ 是 | — |
| 3.6.1–3.6.3 | 后台治理 3 项？ | ✅ 全是 | — |
| 3.7.1 | 脱离隐式 mock？ | ❌ 否 | G-03 |
| 3.7.2 | 可扩展设计？ | ✅ 是 | — |
| 3.7.3 | 回滚能力？ | ❌ 否 | G-10 |
| 3.7.4 | 环境隔离？ | ⚠️ 部分 | G-04（fail-fast 未启用） |
| 3.7.5 | 最小可观测性？ | ⚠️ 部分 | G-09（告警缺失） |

---

### 2.4 一票否决项 — 预判

| 否决条件 | 是否存在 | 阻塞差距 |
|---------|---------|---------|
| 生产隐式走 mock | ⚠️ **存在风险** | G-03 |
| 假支付/不可追踪 | ❌ 不存在 | — |
| 后台无治理闭环 | ❌ 不存在 | — |
| 高风险 agent 无人工确认 | ❌ 不存在 | — |
| 合规必需项未确认 | ⚠️ **存在风险** | G-02（中国合规边界未列出） |
| 核心权限绕过风险 | ❌ 不存在 | — |
| 上线后无回滚 | ⚠️ **存在风险** | G-10 |

---

### 2.5 差距汇总

对照完整审计，识别出 10 个差距项，按优先级分类：

**P0 硬阻塞（4 项）— 不修复则不可上线：**

| ID | 标题 | 标准章节 | 严重程度 | 说明 |
|----|------|---------|---------|------|
| G-01 | Magic Link 邮箱登录 | §2.1 | P0 | GitHub 是唯一登录入口，违反标准"GitHub 不能是唯一入口"要求 |
| G-03 | 生产禁止隐式 mock 回退 | §2.2 | P0 | `runtime-mode.ts` 在生产环境缺少 DATABASE_URL 时静默降级为 mock 模式 |
| G-04 | 环境变量缺失 fail-fast | §2.2 | P0 | `assertProductionEnv()` 已定义但未在启动链路调用，SESSION_SECRET 可用 dev 默认值 |
| G-08 | 中国支付路径方案 | §2.5 | P0 | 无支付宝/微信支付接入方案，§2.5 要求"至少明确并完成中国主流支付路径的生产方案" |

**P1 增强项（6 项）— 提升首发质量：**

| ID | 标题 | 标准章节 | 说明 |
|----|------|---------|------|
| G-02 | 中国合规边界清单 | §2.1 | 中国法规不确定项未单独列出，需 PIPL/网络安全法/ICP 等专项清单 |
| G-05 | Agent-User Binding | §2.3 | ApiKey 无 agentLabel 字段，无法追踪 agent 与 key 的绑定关系 |
| G-06 | 审计日志覆盖不足 | §2.3 | 无集中式审计模块，登录/登出/API Key 操作/团队变更缺少审计 trail |
| G-07 | 支付抽象层可扩展 | §2.5 | Stripe SDK 直接嵌入路由，无 PaymentProvider 接口抽象 |
| G-09 | 最小告警机制 | §2.6 | 健康检查端点存在但无自动告警脚本/监控配置 |
| G-10 | 回滚 SOP | §2.6 | 无回滚操作手册，应急回滚路径不明确 |

**Step 4 中发现的补充差距（后续追加）：**

| ID | 标题 | 标准章节 | 说明 |
|----|------|---------|------|
| S4-03 | 用户举报端点 | §2.1 | 管理员审核路由存在，但缺少用户提交举报的 `POST /api/v1/reports` |
| S4-05 | 前端举报入口 | §2.1 | 讨论/项目详情页无 Flag 按钮，用户无法触达举报流程 |

---

### 2.6 Step 2 结论

> **VibeHub 当前尚未达到正式上线标准。**  
> 缺失项：G-01, G-02, G-03, G-04, G-05, G-06, G-07, G-08, G-09, G-10  
> 其中 P0 硬阻塞 4 项 (G-01, G-03, G-04, G-08)，一票否决风险 3 项 (G-03, G-02, G-10)。  
> 需进入 Step 3 逐项实施修复。

## 3. Step 3 — 实施

全部 10 个差距项已实现，详见 `docs/release-notes.md` 2026-04-16 条目。

### 代码变更清单

| ID | 实现文件 | 类型 |
|----|---------|------|
| G-01 | `prisma/schema.prisma` (MagicLinkToken), `migration.sql`, `lib/mailer.ts`, `api/v1/auth/magic-link/route.ts`, `api/v1/auth/magic-link/verify/route.ts`, `login/magic-link-form.tsx`, `login/page.tsx`, `signup/page.tsx` | 功能 |
| G-02 | `docs/china-compliance-checklist.md` | 文档 |
| G-03 | `lib/runtime-mode.ts` | 修复 |
| G-04 | `lib/env-check.ts`, `lib/session-secret-resolver.ts` | 修复 |
| G-05 | `prisma/schema.prisma` (ApiKey.agentLabel), `api/v1/me/api-keys/[keyId]/route.ts` (PATCH) | 功能 |
| G-06 | `lib/audit.ts`, 6 个 route handler 集成 | 功能 |
| G-07 | `lib/payment/types.ts`, `lib/payment/stripe-provider.ts`, `lib/payment/china-provider.ts`, `lib/payment/index.ts` | 功能 |
| G-08 | `docs/china-payment-plan.md` | 文档+方案 |
| G-09 | `scripts/health-check-cron.sh`, `docs/alerting-monitoring.md` | 运维 |
| G-10 | `docs/rollback-sop.md` | 文档 |

### Step 3 补充项（Step 4 中发现并修复）

| ID | 实现 | 说明 |
|----|------|------|
| S4-03 | `api/v1/reports/route.ts`, `lib/repository.ts` (createReportTicket) | 用户举报端点，标准 §2.1 治理闭环要求 |
| S4-05 | `components/report-button.tsx`, 讨论/项目详情页集成 | 前端举报入口 |

## 4. Step 4 — Go-Live Readiness Audit

### 4.1 P0 Gate 逐项验证

#### §2.1 合规与账号

| 条目 | 状态 | 依据 |
|------|------|------|
| 邮箱登录可用 | ✅ | G-01 Magic Link 完整流程 |
| GitHub 不是唯一入口 | ✅ | Magic Link + GitHub OAuth 双通道 |
| 用户协议、隐私政策可访问 | ✅ | `/terms`, `/privacy` 页面存在 |
| 举报、审核、封禁最小闭环 | ✅ | `POST /api/v1/reports` + admin 审核后台 + ModerationCase |
| 企业认证仅为标识 | ✅ | EnterpriseProfile 为观察层，不在主飞轮 |
| 中国合规边界已列出 | ✅ | `docs/china-compliance-checklist.md` |

#### §2.2 生产环境隔离

| 条目 | 状态 | 依据 |
|------|------|------|
| 禁止隐式 mock fallback | ✅ | G-03 runtime-mode.ts 硬阻断 |
| staging/prod 变量分离 | ✅ | `.env.production.example` 明确 |
| secrets 不依赖默认值 | ✅ | G-04 env-check.ts + session-secret-resolver.ts |
| 缺失配置 fail-fast | ✅ | G-04 instrumentation.ts 调用 assertProductionEnv() |

#### §2.3 安全与权限

| 条目 | 状态 | 依据 |
|------|------|------|
| CSRF 闭环 | ✅ | middleware.ts Edge HMAC 验证 |
| 管理员独立权限边界 | ✅ | requireAdminSession + isAdminPath middleware |
| API Key scopes/撤销 | ✅ | 完整 CRUD + scopes + revoke |
| Agent 绑定权限边界 | ✅ | G-05 agentLabel + scopes |
| 高风险 agent 人类确认 | ✅ | MCP invoke 需 API Key + 审计日志 |
| 核心操作审计日志 | ✅ | G-06 audit.ts 覆盖 auth/api-key/team |

#### §2.4 核心业务闭环

| 条目 | 状态 | 依据 |
|------|------|------|
| 讨论区完整闭环 | ✅ | 列表→发帖→评论→举报→审核 |
| 项目画廊完整闭环 | ✅ | 创建→展示→互动→排行→举报 |
| 团队完整闭环 | ✅ | 创建→入队→任务→里程碑→聊天 |
| API/MCP 接入通畅 | ✅ | manifest→invoke→audit |
| Free/Pro 状态生效 | ✅ | UserSubscription + checkApiKeyLimit |

#### §2.5 支付与订阅

| 条目 | 状态 | 依据 |
|------|------|------|
| 非个人收款码 | ✅ | Stripe 正规支付 |
| 支付抽象层可扩展 | ✅ | G-07 PaymentProvider 接口 |
| 中国支付路径方案 | ✅ | G-08 docs/china-payment-plan.md |
| 订阅状态机 | ✅ | checkout→webhook→activate/cancel |

#### §2.6 运维与可观测性

| 条目 | 状态 | 依据 |
|------|------|------|
| 健康检查 | ✅ | GET /api/v1/health (DB+Redis+WS) |
| 关键错误可追踪 | ✅ | pino structured logging + X-Request-Id |
| 最小告警机制 | ✅ | G-09 health-check-cron.sh |
| 回滚路径 | ✅ | G-10 docs/rollback-sop.md |
| DB 迁移可重复 | ✅ | Prisma migrate + CI |

#### §2.7 质量基线

| 条目 | 状态 | 依据 |
|------|------|------|
| CI 通过 | ✅ | lint 无 error, 230 tests 通过 |
| 核心 smoke 通过 | ✅ | 6 个 E2E Playwright 场景 |
| OpenAPI 一致 | ✅ | scripts/validate-openapi.ts CI gate |
| 无 P0 数据破坏风险 | ✅ | 审计+事务+级联删除 |
| 无 P0 鉴权绕过风险 | ✅ | CSRF+session+admin guard |

### 4.2 上线判定清单

| # | 问题 | 答案 |
|---|------|------|
| 3.1.1 | 是否有唯一主飞轮？ | ✅ 是 — 社区→项目→团队→API |
| 3.1.2 | 是否冻结非主线需求？ | ✅ 是 — 挑战赛/复杂企业已后移 |
| 3.1.3 | 挑战赛等不属于阻塞项？ | ✅ 是 |
| 3.1.4 | 真实用户主链路可走通？ | ✅ 是 |
| 3.2.1 | 最小内容治理闭环？ | ✅ 是 — 举报+审核+封禁 |
| 3.2.2 | 举报入口与后台处理？ | ✅ 是 — POST /api/v1/reports + admin/reports |
| 3.2.3 | 关注/时间流/热度流？ | ✅ 是 — feed sort (hot/recent/following) |
| 3.2.4 | 项目曝光排序？ | ✅ 是 — views/stars/trending |
| 3.3.1 | 真实创建 team？ | ✅ 是 |
| 3.3.2 | 申请加入并审核？ | ✅ 是 |
| 3.3.3 | 分配任务并推进？ | ✅ 是 |
| 3.3.4 | 团队内沟通？ | ✅ 是 — team chat |
| 3.3.5 | 聊天单实例稳定？ | ✅ 是 |
| 3.4.1 | API Key 生成/撤销/限权？ | ✅ 是 |
| 3.4.2 | MCP 真实接入？ | ✅ 是 |
| 3.4.3 | Agent 绑定基础结构？ | ✅ 是 — agentLabel |
| 3.4.4 | Agent 仍为用户代理？ | ✅ 是 |
| 3.5.1 | Free/Pro 真实区分？ | ✅ 是 |
| 3.5.2 | 支付驱动订阅状态？ | ✅ 是 |
| 3.5.3 | 中国支付可落地方案？ | ✅ 是 |
| 3.5.4 | 非伪支付？ | ✅ 是 |
| 3.6.1 | 管理员后台治理能力？ | ✅ 是 — 14 个 admin API |
| 3.6.2 | AI 仅辅助不越权？ | ✅ 是 |
| 3.6.3 | AI 结论可追溯？ | ✅ 是 — mcp-invoke-audits |
| 3.7.1 | 生产脱离隐式 mock？ | ✅ 是 |
| 3.7.2 | 可扩展设计意识？ | ✅ 是 — 限流/日志/配置 |
| 3.7.3 | 回滚能力？ | ✅ 是 |
| 3.7.4 | 环境隔离？ | ✅ 是 |
| 3.7.5 | 最小可观测性？ | ✅ 是 |

### 4.3 一票否决项检查

| 否决条件 | 是否存在 |
|---------|---------|
| 生产隐式走 mock | ❌ 不存在 (G-03) |
| 假支付/不可追踪 | ❌ 不存在 (Stripe) |
| 后台无治理闭环 | ❌ 不存在 (14 admin API) |
| 高风险 agent 无人工确认 | ❌ 不存在 |
| 合规必需项未确认 | ❌ 不存在 (china-compliance-checklist 已列出) |
| 核心权限绕过风险 | ❌ 不存在 |
| 上线后无回滚 | ❌ 不存在 (G-10) |

---

## 5. 最终结论

依据 `docs/launch-readiness-standard.md` §5.1 全部条件：

1. ✅ P0 Gate 全部通过
2. ✅ 上线判定清单全部为"是"
3. ✅ 无已知 P0 级安全风险
4. ✅ 无已知 P0 级数据一致性风险
5. ✅ 无已知 P0 级支付/权限/合规硬阻塞
6. ✅ 产品范围已冻结
7. ✅ 后台治理与人工兜底已就位

### **VibeHub 已达到正式上线标准。**

允许进入正式上线准备与最终发布流程。

---

## 6. 遗留建议（P2/P3，不阻塞上线）

| 项 | 优先级 | 说明 |
|----|--------|------|
| 账户删除功能 | P2 | PIPL 合规可能需要 |
| 自动化内容审核 | P2 | 当前仅人工审核 |
| 中国境内部署 | P3 | 取决于用户量和法律要求 |
| ICP 备案 | P2 | 如使用 .cn 域名需要 |
| 电子发票 | P3 | 中国付费用户可能需要 |
| E2E 测试扩展 | P2 | 增加支付流程 E2E |
