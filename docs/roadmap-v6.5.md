# VibeHub Roadmap v6.5 — 全量代码审计查漏补缺路线图

> 基于 v6.0 收尾（P0–P4 全部完成）后的 main 分支全量审计  
> 规划日期：2026-04-16  
> 视角：安全加固、健壮性提升、质量工程、前端体验细节、基础设施补全  
> 状态：**纯规划文档，不涉及任何代码修改**

---

## 审计基准

| 维度 | 当前状态 | 剩余差距 |
|------|---------|---------|
| 安全 | Session 吊销 ✅、CSRF ✅、Admin 边缘校验 ✅ | `Math.random()` 生成 ID（14 处）、parseInt 无界限（4 处）、错误信息泄露（3 处） |
| 错误处理 | RepositoryError + apiErrorFromRepositoryCatch 已建立 | 部分路由仍 catch raw error.message；SSE 流无异常保护；字符串比较判断错误类型 |
| 测试 | 62 个后端测试文件，6 个 E2E spec | 0 个组件测试；vitest 无覆盖率配置；CI 流水线缺失 |
| 类型安全 | Zod 覆盖率 ~47% | 仍有 ~61 个路由缺少 Zod 验证；部分 hooks 使用 `as any` |
| 性能 | 慢查询日志 ✅、telemetry 模块 ✅ | Prisma 无查询超时；repository.ts 7,591 行单文件；部分 admin 端点无分页上限 |
| 前端体验 | SWR ✅、dynamic imports ✅、Web Vitals ✅ | Feed 组件缺失空状态/重试；硬编码字符串（i18n 遗漏）；无障碍属性覆盖不足 |
| 基础设施 | Docker Compose + PM2 + nginx 已有 | CI/CD 流水线未在此分支发现；环境变量校验仅 3 项；.env 模板过时 |

---

## 阶段总览

```
P0  紧急安全修补        — 可被直接利用的安全隐患
P1  健壮性与质量工程    — 代码可维护性与测试信心
P2  前端体验细节收尾    — 用户感知的粗糙边角
P3  基础设施与运维      — 持续交付与生产运维能力
```

---

## P0：紧急安全修补

> 定义：当前代码中可被直接利用或造成数据泄露的安全问题。

### P0-SEC-1：替换 Math.random() ID 生成为加密安全随机数 ⚡ 普通 ✅ 已完成

**现状：** ~~14 处使用 `Math.random().toString(36).slice(2, 8)` 生成实体 ID（通知、API Key、评论等），约 2.1 亿种可能性，可被暴力枚举。~~

**已完成：**
- 新增 `lib/crypto-id.ts` 工具模块，提供 `cryptoRandomSuffix(length)` 和 `cryptoId(prefix, length)` 函数
- 使用 `crypto.randomBytes` (Node.js) 替换后端 13 处 `Math.random()` ID 生成
- 使用 `crypto.getRandomValues` (Web Crypto API) 替换前端 `team-chat-panel.tsx` 1 处
- 影响文件：`repository.ts`（10 处）、`team.repository.ts`（2 处）、`project.repository.ts`（1 处）、`team-chat-panel.tsx`（1 处）

---

### P0-SEC-2：为所有 parseInt/Number() 调用添加有限性校验 ⚡ 普通 ✅ 已完成

**现状：** ~~4 个 API 端点的 `parseInt()` / `Number()` 未校验返回值，NaN 传入下游逻辑导致未定义行为或绕过分页限制。~~

**已完成：**
- `chat/messages/route.ts` — 添加 `Number.isFinite()` 检查 + `Math.min(Math.max(...), 200)` 上限
- `me/webhook-deliveries/route.ts` — 添加 NaN 防护 + `Math.min(limit, 500)` 上限
- `admin/webhook-deliveries/route.ts` — 添加 NaN 防护 + `Math.min(limit, 500)` 上限
- `me/notifications/route.ts` — 添加 `Math.min(limit, 500)` 上限
- 4 个 leaderboard 路由 — 添加 `Math.min(limit, 100)` 上限 cap

---

### P0-SEC-3：消除 API 响应中的原始错误信息泄露 ⚡ 普通 ✅ 已完成

**现状：** ~~至少 3 个 API 路由在 catch 块中直接返回 `error.message`，可能泄露 Prisma 内部错误、数据库结构或堆栈信息。~~

**已完成：**
- 移除 28+ 处 catch 块 fallback 中的 `details: msg`/`details: message` 字段
- `me/profile/route.ts` GET — 替换 `error.message` 为泛化消息
- `mcp/v2/invoke/route.ts` — 生产环境不再返回 `err.message`（仅开发模式保留）
- `me/api-keys/route.ts` POST — 添加 `apiErrorFromRepositoryMessage` 处理已知错误码
- 清理所有未使用的 `msg` 变量以保持 lint 清洁
- 保留 `safeServerErrorDetails()` 调用（生产环境返回 `undefined`，安全）

---

## P1：健壮性与质量工程

> 定义：提升代码可维护性、类型安全性和测试覆盖率。

### P1-ROBUST-1：为剩余 ~61 个路由补充 Zod 输入验证 🔧 复杂

**现状：** 115 个 API 路由中仅 ~54 个使用 Zod 验证（覆盖率 47%），剩余 53% 的变更端点（POST/PATCH/PUT/DELETE）缺少类型化输入校验。

**目标：**
- 为所有 mutation 端点定义 Zod schema
- 为 query parameter 密集的 GET 端点（搜索、筛选、分页）添加 Zod 校验
- 统一验证失败响应格式（400 + 字段级错误）
- 在 `lib/schemas/` 下按领域组织 schema 文件

**复杂度：** 复杂（~61 个路由文件，每个需定义 schema + 集成）

---

### P1-ROBUST-2：消除脆弱的字符串匹配错误处理模式 ⚡ 普通

**现状：** 多处 catch 块使用 `if (msg === "SOME_ERROR_STRING")` 判断错误类型，重构时极易失效。

**目标：**
- 为 repository 层定义类型化错误枚举（如 `RepositoryErrorCode.INVALID_API_KEY_LABEL`）
- 所有路由统一使用 `apiErrorFromRepositoryCatch` + 类型化错误码匹配
- 消除所有 `error.message === "..."` 字符串比较

**复杂度：** 普通（~10 处修改 + 枚举定义）

---

### P1-ROBUST-3：SSE 通知流异常保护 ⚡ 普通

**现状：** `PUT /api/v1/me/notifications?stream=1` 的 SSE 流缺少 try-catch，Prisma 查询失败或 encoder 异常将导致流静默崩溃。

**目标：**
- 在 SSE 轮询循环中添加 try-catch，异常时发送 `event: error` 通知客户端
- 为 SSE 流添加心跳机制（每 30s 发送 `:keepalive` 注释行）
- 添加最大流持续时间限制（如 10 分钟后自动关闭，客户端自动重连）

**复杂度：** 普通

---

### P1-ROBUST-4：webhook-deliveries 路由添加异常处理 ⚡ 普通

**现状：** `GET /api/v1/me/webhook-deliveries` 无 try-catch，数据库异常将导致 500 且无日志。

**目标：**
- 添加 try-catch + `apiErrorFromRepositoryCatch`
- 添加结构化日志记录

**复杂度：** 普通

---

### P1-TEST-1：配置 Vitest 覆盖率并设定基线 🔧 普通

**现状：** `vitest.config.ts` 无 `coverage` 配置，无法追踪测试覆盖率或设定门禁。

**目标：**
- 配置 `@vitest/coverage-v8`
- 设定初始覆盖率门禁（行覆盖率 ≥ 40%，分支覆盖率 ≥ 30%）
- 在 CI 中输出覆盖率报告

**复杂度：** 普通

---

### P1-TEST-2：为核心 UI 组件添加单元测试 🔧 复杂

**现状：** 0 个组件测试文件。`components/ui/` 下 9 个原语组件（Button, Input, Modal, Card, Badge, Dropdown, Select, Skeleton, index）无任何测试。

**目标：**
- 为 `components/ui/` 下所有原语组件编写测试（rendering, props, accessibility）
- 为关键业务组件添加基础 smoke test（post-card, project-card, team-tasks-panel）
- 使用 `@testing-library/react` 或 Vitest 内置 JSX 支持

**复杂度：** 复杂（~15 个测试文件）

---

### P1-TEST-3：为自定义 hooks 添加单元测试 ⚡ 普通

**现状：** `use-infinite-page-append.ts`、`use-web-vitals.ts`、`use-api.ts`、`use-api-mutation.ts` 均无测试。

**目标：**
- 使用 `@testing-library/react` 的 `renderHook` 测试所有 hooks
- 覆盖正常路径、错误路径、边界条件

**复杂度：** 普通（4 个 hook 文件）

---

## P2：前端体验细节收尾

> 定义：用户可感知的粗糙边角打磨。

### P2-UX-1：Feed 组件添加空状态与重试机制 ⚡ 普通

**现状：** `discover-project-feed.tsx`、`discussions-post-feed.tsx` 在数据为空或加载失败时无友好 UI。

**目标：**
- 添加空状态插图 + 引导文案（"还没有项目，来发布第一个？"）
- 错误状态添加"重试"按钮
- 使用 `aria-live="polite"` 标注动态更新区域

**复杂度：** 普通

---

### P2-UX-2：补充前端 i18n 遗漏 ⚡ 普通

**现状：** Feed 组件中"Loading more…"、"End of results"等硬编码英文字符串未纳入 i18n。

**目标：**
- 审计所有组件的硬编码用户可见字符串
- 为遗漏字符串添加 `t()` 调用 + 翻译键
- 确保 `locales/en.json` 和 `locales/zh.json` 同步

**复杂度：** 普通

---

### P2-UX-3：前端 fetch 添加超时与中止控制 ⚡ 普通

**现状：** 多数组件 fetch 调用无 `AbortController` 或超时设置，网络挂起时 UI 无限等待。

**目标：**
- 为所有客户端 fetch 调用添加 `AbortSignal.timeout(10000)`
- 组件卸载时中止进行中的请求（防止内存泄漏）
- 在 `apiFetch` 封装中统一添加默认超时

**复杂度：** 普通

---

### P2-UX-4：无障碍属性补全 ⚡ 普通

**现状：** 仅 66 个 aria 属性分布在整个组件集中，缺少 `aria-expanded`、`aria-current="page"`、`aria-describedby`、`aria-live` 等。

**目标：**
- 为所有图标按钮添加 `aria-label`
- 为可折叠/展开元素添加 `aria-expanded`
- 为导航当前页添加 `aria-current="page"`
- 为表单错误添加 `aria-describedby` 关联
- 为动态加载区域添加 `aria-live="polite"`

**复杂度：** 普通（分散修改，每处 1-2 行）

---

### P2-UX-5：AuthContext 拆分减少不必要重渲染 🔧 复杂

**现状：** `AuthContext` 持有 unreadCount 等高频变更数据，导致所有 `useAuth()` 消费者在计数变化时重渲染。

**目标：**
- 将 `unreadCount` 拆分到独立 `NotificationContext`
- 或使用 `useSyncExternalStore` + selector 模式避免不必要重渲染
- 确保拆分后所有消费者行为不变

**复杂度：** 复杂

---

## P3：基础设施与运维

> 定义：保障持续集成与生产运维能力。

### P3-INFRA-1：建立 GitHub Actions CI/CD 流水线 🔧 复杂

**现状：** 当前分支无可用的 `.github/workflows/` CI 配置（仅历史 `p1-gate.yml` 存在于 main）。

**目标：**
- `ci.yml`：lint + type-check + vitest + build（每次 push/PR 触发）
- `e2e.yml`：Playwright E2E（使用 Postgres service container）
- `security.yml`：`npm audit` + CodeQL 扫描
- `bundle-size.yml`：`next build` 输出 size 对比，PR comment 报告

**复杂度：** 复杂

---

### P3-INFRA-2：完善环境变量校验 ⚡ 普通

**现状：** `env-check.ts` 仅校验 3 个变量（`SESSION_SECRET`、`DATABASE_URL`、`ENFORCE_REQUIRED_ENV`），生产关键变量（Stripe、GitHub OAuth、S3 等）未校验。

**目标：**
- 使用 Zod 定义完整的环境变量 schema
- 区分必需 / 可选 / 带默认值三类
- 启动时校验，缺失必需变量立即报错退出
- 更新 `.env.example`、`.env.production.example`、`.env.staging.example` 保持同步

**复杂度：** 普通

---

### P3-INFRA-3：Prisma 查询超时配置 ⚡ 普通

**现状：** `db.ts` 中 PrismaClient 无查询超时设置，长时间查询可无限挂起。

**目标：**
- 配置 Prisma `connection_limit` 和连接超时
- 通过 `DATABASE_URL` 参数设置 `connect_timeout` 和 `pool_timeout`
- 为应用层添加默认查询超时（10s）

**复杂度：** 普通

---

### P3-INFRA-4：更新 .env 模板文件 ⚡ 普通

**现状：** `.env.production.example` 仅 3 个变量，`.env.staging.example` 仅 2 个变量，与实际运行所需严重不符。

**目标：**
- 将所有环境变量（含注释说明）同步到三个 .env 模板
- 标注每个变量的必需性、默认值、用途

**复杂度：** 普通

---

## 执行优先级汇总表

| 编号 | 任务 | 优先级 | 领域 | 难度 | 依赖 |
|------|------|--------|------|------|------|
| P0-SEC-1 | 替换 Math.random() ID 生成 | 🔴 P0 | 安全 | 普通 | ✅ 已完成 |
| P0-SEC-2 | parseInt 有限性校验 | 🔴 P0 | 安全 | 普通 | ✅ 已完成 |
| P0-SEC-3 | 消除错误信息泄露 | 🔴 P0 | 安全 | 普通 | ✅ 已完成 |
| P1-ROBUST-1 | 剩余路由 Zod 验证补全 | 🟠 P1 | 健壮性 | 复杂 | — |
| P1-ROBUST-2 | 类型化错误枚举替换字符串匹配 | 🟠 P1 | 健壮性 | 普通 | — |
| P1-ROBUST-3 | SSE 流异常保护 | 🟠 P1 | 健壮性 | 普通 | — |
| P1-ROBUST-4 | webhook-deliveries 异常处理 | 🟠 P1 | 健壮性 | 普通 | — |
| P1-TEST-1 | Vitest 覆盖率配置 | 🟠 P1 | 测试 | 普通 | — |
| P1-TEST-2 | UI 组件单元测试 | 🟠 P1 | 测试 | 复杂 | P1-TEST-1 |
| P1-TEST-3 | Hooks 单元测试 | 🟠 P1 | 测试 | 普通 | P1-TEST-1 |
| P2-UX-1 | Feed 空状态与重试 | 🟡 P2 | 前端体验 | 普通 | — |
| P2-UX-2 | i18n 遗漏补充 | 🟡 P2 | 前端体验 | 普通 | — |
| P2-UX-3 | fetch 超时与中止 | 🟡 P2 | 前端体验 | 普通 | — |
| P2-UX-4 | 无障碍属性补全 | 🟡 P2 | 前端体验 | 普通 | — |
| P2-UX-5 | AuthContext 拆分 | 🟡 P2 | 前端架构 | 复杂 | — |
| P3-INFRA-1 | CI/CD 流水线 | 🟢 P3 | 基建 | 复杂 | — |
| P3-INFRA-2 | 环境变量校验完善 | 🟢 P3 | 基建 | 普通 | — |
| P3-INFRA-3 | Prisma 查询超时 | 🟢 P3 | 基建 | 普通 | — |
| P3-INFRA-4 | .env 模板更新 | 🟢 P3 | 基建 | 普通 | P3-INFRA-2 |

---

## 统计

| 阶段 | 普通 | 复杂 | 合计 |
|------|------|------|------|
| P0 紧急安全 | 3 | 0 | 3 |
| P1 健壮性与质量 | 5 | 2 | 7 |
| P2 前端体验 | 4 | 1 | 5 |
| P3 基建运维 | 3 | 1 | 4 |
| **合计** | **15** | **4** | **19** |

---

## 与 v5.0/v6.0 路线图的关系

本文档（v6.5）是 v5.0（规划）→ v6.0（执行 P0–P4 全量交付）之后的**查漏补缺层**：

| 维度 | v5.0 路线图 | v6.0 执行 | v6.5 本文档 |
|------|-----------|----------|------------|
| 范围 | 全面规划（36 项） | 全部执行并收尾 | 审计发现的残余问题（19 项） |
| 安全 | P0-BE-1/2/3 | ✅ 已完成 | 补充 ID 安全、输入校验、信息泄露 |
| 测试 | P2-BE-5 E2E 跃升 | ✅ 已完成 | 补充组件测试、覆盖率配置、CI |
| 前端 | P4-FE-1/2 性能与状态管理 | ✅ 已完成 | 补充空状态、超时、无障碍、i18n 遗漏 |
| 基建 | P4-BE-3/4 CI 与多环境 | ✅ 已完成 | 补充完整 CI/CD、环境校验、查询超时 |

---

## 配套文档索引

- 当前主线战略：`docs/roadmap-current.md`
- 完整规划（v5.0）：`docs/roadmap-v5.md`
- 查漏补缺（v6.5）：`docs/roadmap-v6.5.md`（本文档）
- 历史演进：`docs/roadmap-history.md`
- 发布记录：`docs/release-notes.md`
