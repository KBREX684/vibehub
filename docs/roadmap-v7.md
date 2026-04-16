# VibeHub Roadmap v7.0 — Go-Live 收敛路线图

> 基于 launch-readiness-standard.md（冻结版 v1）全面差距审计  
> 规划日期：2026-04-16  
> 前置：v5.0 路线图 P0–P4 已全部交付并集成  
> 目标：以正式上线标准为唯一判定基线，消除全部 P0 阻塞项，达到 Go-Live Ready

---

## 审计方法论

以 `docs/launch-readiness-standard.md` §2 硬门槛逐项对照当前代码库，分为：

- **✅ 已满足** — 代码实现 + 测试覆盖完整
- **⚠️ 条件满足** — 实现存在但有配置/文档缺口
- **❌ 未满足** — 缺失或不完整

---

## 1. 差距审计总表

### §2.1 合规与账号

| 要求 | 状态 | 详情 |
|------|------|------|
| 邮箱登录可用 | ❌ | 当前仅 GitHub OAuth，无邮箱/密码登录链路 |
| GitHub 登录仅为辅助入口 | ❌ | GitHub OAuth 是唯一登录入口 |
| 登出链路 | ✅ | `/api/v1/auth/logout` 已实现 |
| 用户协议/隐私政策可访问 | ✅ | `/terms`、`/privacy` 页面已存在 |
| 举报/审核/封禁最小闭环 | ✅ | ReportTicket → ModerationCase → AuditLog 全链路已实现 |
| 企业认证仅为身份标识 | ✅ | enterpriseStatus 仅控制雷达工作台，不影响核心功能 |
| 中国合规边界专项核验 | ❌ | 未文档化中国合规必确认项 |

### §2.2 生产环境隔离

| 要求 | 状态 | 详情 |
|------|------|------|
| 生产禁止隐式 mock fallback | ⚠️ | `runtime-mode.ts` 在 DATABASE_URL 缺失时隐式回退 mock；仅 `ENFORCE_REQUIRED_ENV=true` 时才阻断 |
| staging/production 环境变量分离 | ✅ | `.env.example` 已区分开发/生产配置 |
| secrets 不依赖默认开发值 | ⚠️ | `SESSION_SECRET` 有默认 fallback 逻辑 |
| 配置缺失时 fail fast | ⚠️ | 存在 `env-check.ts` 但需 `ENFORCE_REQUIRED_ENV=true` 激活；生产应自动启用 |

### §2.3 安全与权限

| 要求 | 状态 | 详情 |
|------|------|------|
| 登录态/CSRF/会话签名/权限闭环 | ✅ | HMAC session + CSRF 双重校验 + sessionVersion 吊销 |
| 管理员独立权限边界 | ✅ | Edge middleware + 服务端双重 admin 校验 |
| API Key scopes/撤销/最小权限 | ✅ | SHA-256 pepper 哈希 + scopes + 撤销 |
| 用户与 agent 绑定权限边界 | ✅ | McpInvokeAudit 绑定 userId + apiKeyId |
| 高风险 agent 行为人类确认 | ✅ | MCP write 工具需要 API Key 且有 scope 限制 |
| 核心高风险操作审计日志 | ✅ | AuditLog 模型 + admin 路由自动写入 |

### §2.4 核心业务闭环

| 要求 | 状态 | 详情 |
|------|------|------|
| 讨论区闭环 | ✅ | 发帖 → 评论 → 举报 → 审核全链路可用 |
| 项目画廊闭环 | ✅ | 创建 → 展示 → 互动 → 排序（热度/时间）可用 |
| 团队闭环 | ✅ | 创建 → 入队 → 任务 → 聊天全链路可用 |
| API/MCP 接入 | ✅ | API Key + MCP v2 invoke 链路通畅 |
| Free/Pro 生效 | ✅ | subscription gate 控制所有限额 |

### §2.5 支付与订阅

| 要求 | 状态 | 详情 |
|------|------|------|
| 非个人收款码 | ✅ | Stripe checkout + webhook 体系 |
| 支付抽象层可扩展 | ⚠️ | 当前直接集成 Stripe，无支付抽象层 |
| 中国支付路径方案 | ❌ | 无 Alipay/WeChat Pay 集成或文档化方案 |
| 订阅状态机 | ✅ | active/past_due/canceled/trialing + webhook 驱动 |
| 禁止伪支付上线 | ✅ | mock mode 下不伪装真实支付 |

### §2.6 运维与可观测性

| 要求 | 状态 | 详情 |
|------|------|------|
| 健康检查 | ✅ | `/api/v1/health` 检查 DB + Redis + WS |
| 错误日志追踪 | ✅ | Pino 结构化日志 + requestId |
| request id / trace | ✅ | 所有 API 响应含 requestId |
| 最小告警机制 | ⚠️ | 无主动告警；有 webhook 通知但无生产告警配置 |
| 明确回滚路径 | ❌ | 无文档化回滚策略 |
| 数据库迁移 CI 可验证 | ✅ | p1-gate.yml 跑 migrate deploy + seed |

### §2.7 质量基线

| 要求 | 状态 | 详情 |
|------|------|------|
| CI 通过 | ✅ | p1-gate.yml: lint + test + build + audit |
| 核心 smoke 通过 | ✅ | `smoke:live-data` 脚本 |
| 核心 E2E 通过 | ✅ | 6 个 Playwright spec |
| OpenAPI 与类型一致 | ✅ | `validate:openapi` + `generate:types` |
| 无 P0 级数据破坏风险 | ✅ | Prisma migration + 事务 |
| 无 P0 级鉴权绕过 | ✅ | 多层安全加固已完成 |

---

## 2. 差距分级

### P0 硬阻塞（不修不能上线）

| ID | 差距 | 影响标准 | 备注 |
|----|------|---------|------|
| V7-P0-1 | 生产环境隐式 mock 回退 | §2.2 | `NODE_ENV=production` 时应自动拒绝 mock，不依赖额外环境变量 |
| V7-P0-2 | 生产环境变量校验不自动生效 | §2.2 | `env-check.ts` 要求 `ENFORCE_REQUIRED_ENV=true`，production 应默认强制 |
| V7-P0-3 | 邮箱登录缺失 | §2.1 | 需至少完成邮箱登录方案设计与接口骨架 |
| V7-P0-4 | 中国合规边界未文档化 | §2.1 | 需列出上线前必确认的合规项 |
| V7-P0-5 | 中国支付路径无方案 | §2.5 | 需完成方案设计文档 |
| V7-P0-6 | 回滚路径无文档 | §2.6 | 需文档化迁移回滚 + 部署回滚流程 |

### P1 上线增强项

| ID | 差距 | 影响标准 | 备注 |
|----|------|---------|------|
| V7-P1-1 | 支付抽象层 | §2.5 | Stripe 直接集成→抽象层，便于后续接中国支付 |
| V7-P1-2 | 生产告警机制 | §2.6 | 至少完成基于 webhook 的关键错误通知 |
| V7-P1-3 | SESSION_SECRET 默认值消除 | §2.2 | 确保 production 无硬编码 fallback |

### P2 差异化能力（不阻塞首发）

| ID | 差距 | 备注 |
|----|------|------|
| V7-P2-1 | Alipay/WeChat Pay 实际接入 | 基于 V7-P1-1 抽象层扩展 |
| V7-P2-2 | 邮箱登录完整实现 | 基于 V7-P0-3 骨架扩展 |
| V7-P2-3 | 分布式告警 + APM | 基于 V7-P1-2 扩展 |

---

## 3. 执行步骤

### STEP 1：生产安全硬化 + 路线图文档化（本次交付）

**目标**：消除生产环境最高风险技术缺口，建立 Go-Live 路线图框架。

交付物：

1. **`docs/roadmap-v7.md`** — 本文档
2. **`runtime-mode.ts` 硬化** — `NODE_ENV=production` 时拒绝隐式 mock 回退，强制要求 `USE_MOCK_DATA=false` + `DATABASE_URL`
3. **`env-check.ts` 硬化** — production 模式自动强制校验（不再依赖 `ENFORCE_REQUIRED_ENV`），增加 Stripe/GitHub OAuth 关键变量检查
4. **测试覆盖** — 为上述硬化逻辑编写单元测试
5. **`docs/roadmap-current.md` 更新** — 引用 v7.0

### STEP 2：邮箱登录 + 合规文档化

**目标**：消除 §2.1 合规硬阻塞。

交付物：

1. 邮箱/密码注册、登录、登出 API 路由
2. 密码哈希（bcrypt/argon2）+ 密码重置流程
3. 登录页 UI 增加邮箱登录表单
4. `docs/compliance-checklist.md` — 中国合规边界必确认项清单

### STEP 3：支付抽象 + 中国支付方案

**目标**：消除 §2.5 支付硬阻塞。

交付物：

1. 支付提供商抽象层（`PaymentProvider` 接口）
2. Stripe 作为默认实现
3. `docs/china-payment-plan.md` — Alipay/WeChat Pay 接入方案
4. 订阅状态机文档化

### STEP 4：运维成熟度 + 回滚策略

**目标**：消除 §2.6 运维硬阻塞。

交付物：

1. `docs/rollback-runbook.md` — 迁移回滚 + 部署回滚流程
2. 生产告警 webhook 配置指南
3. 部署检查清单

### STEP 5：最终验收 + Go-Live 判定

**目标**：逐项对照 launch-readiness-standard.md 判定清单。

交付物：

1. 全部 §3 判定清单答案
2. Go-Live Ready 或缺失项列表
3. 正式发布准备签核

---

## 4. STEP 1 详细规格

### 4.1 runtime-mode.ts 硬化

**当前行为**：
```typescript
// USE_MOCK_DATA 未设置 + DATABASE_URL 未设置 → 隐式回退 mock
return !hasDatabaseUrlConfigured();
```

**目标行为**：
```
NODE_ENV=production 时：
  - USE_MOCK_DATA=true → 抛出错误（生产禁止 mock）
  - USE_MOCK_DATA 未设置 + DATABASE_URL 未设置 → 抛出错误
  - USE_MOCK_DATA=false + DATABASE_URL 已设置 → 正常数据库模式
  
NODE_ENV!=production 时：
  - 保持现有行为（开发/CI 兼容）
```

**影响范围**：`runtime-mode.ts`  
**回归风险**：低。仅影响 production 启动路径，开发/CI 行为不变。

### 4.2 env-check.ts 硬化

**当前行为**：
```typescript
if (process.env.ENFORCE_REQUIRED_ENV !== "true") return; // 不设置就跳过
```

**目标行为**：
```
NODE_ENV=production 时：
  - 自动强制校验，无需 ENFORCE_REQUIRED_ENV
  - 校验：SESSION_SECRET, DATABASE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
  - 保留 ENFORCE_REQUIRED_ENV 作为非 production 环境的手动启用开关

NODE_ENV!=production 时：
  - 仅当 ENFORCE_REQUIRED_ENV=true 时校验（保持兼容）
```

**新增校验变量**：
- `SESSION_SECRET` — 必须存在且非空
- `DATABASE_URL` — production 模式必须存在
- `GITHUB_CLIENT_ID` — OAuth 必须可用
- `GITHUB_CLIENT_SECRET` — OAuth 必须可用

**影响范围**：`env-check.ts`、`instrumentation.ts`  
**回归风险**：低。开发环境行为不变。

---

## 5. 当前结论

**VibeHub 当前尚未达到正式上线标准。**

缺失项：
- 邮箱登录不可用，GitHub 是唯一登录入口（§2.1）
- 生产环境可隐式回退 mock 模式（§2.2）
- 中国支付路径无方案（§2.5）
- 中国合规边界未专项核验（§2.1）
- 回滚策略未文档化（§2.6）
- 生产告警机制缺失（§2.6）

本路线图 STEP 1–5 旨在系统性消除上述缺失项。
