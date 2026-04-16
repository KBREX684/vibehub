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

### P1-ROBUST-1：为剩余路由补充 Zod 输入验证 🔧 复杂 ✅ 已完成（阶段 1）

**现状：** ~~115 个 API 路由中仅 ~54 个使用 Zod 验证（覆盖率 47%）。~~

**已完成（阶段 1 — 高优先级路由）：**
- 创建 `lib/schemas/` 目录，定义共享 Zod schema（pagination、search、projectList、leaderboard、moderation）
- 为 7 个高优先级 GET 路由添加 Zod 查询参数验证：
  - `search/route.ts` — 搜索类型 + 分页
  - `public/projects/route.ts` — 项目筛选 + 分页
  - `mcp/search_projects/route.ts` — MCP 项目搜索
  - `admin/moderation/posts/route.ts` — 审核帖子列表
  - `admin/collaboration-intents/route.ts` — 协作意向列表
  - `leaderboards/weekly/projects/route.ts` — 周排行榜
  - `leaderboards/weekly/discussions/route.ts` — 讨论排行榜
- 统一验证失败响应：400 + `INVALID_QUERY_PARAMS` + 字段级错误详情
- 添加 22 个 schema 验证测试（`p1-query-schemas.test.ts`）
- **剩余 ~52 个只读 / 无参数路由暂不需要 Zod**（已使用 `safeParseIntParam` 或无参数）

---

### P1-ROBUST-2：消除脆弱的字符串匹配错误处理模式 ⚡ 普通 ✅ 已完成

**现状：** ~~多处 catch 块使用 `if (msg === "SOME_ERROR_STRING")` 判断错误类型，重构时极易失效。~~

**已完成：**
- 扩展 `route-repository-message.ts` 中的集中映射表，从 18 个错误码增加到 50+ 个
- 重构 26 个路由文件，将 ~100 处 `if (msg === "...")` 字符串匹配替换为 `apiErrorFromRepositoryMessage(msg)` 调用
- 净减约 150 行重复的错误处理代码

---

### P1-ROBUST-3：SSE 通知流异常保护 ⚡ 普通 ✅ 已完成

**现状：** ~~`PUT /api/v1/me/notifications?stream=1` 的 SSE 流缺少最大持续时间限制和心跳机制。~~

**已完成：**
- 添加最大流持续时间限制（默认 10 分钟，通过 `NOTIFICATIONS_SSE_MAX_DURATION_MS` 可配置），超时后发送 `event: timeout` 并关闭流
- 添加 30 秒间隔的 `:keepalive` SSE 注释行心跳，防止代理/负载均衡器超时断开
- 添加连续错误计数器（MAX_CONSECUTIVE_ERRORS = 5），超过阈值后发送 `event: error` 并关闭流
- 添加 `safeEnqueue` 包装器防止 enqueue 异常导致流崩溃

---

### P1-ROBUST-4：webhook-deliveries 路由添加异常处理 ⚡ 普通 ✅ 已完成

**现状：** ~~`GET /api/v1/me/webhook-deliveries` 无 try-catch，数据库异常将导致 500 且无日志。~~

**已完成：**
- 添加 try-catch + `apiErrorFromRepositoryCatch` + 结构化日志记录
- 使用 `getRequestLogger` + `serializeError` 记录异常

---

### P1-TEST-1：配置 Vitest 覆盖率并设定基线 🔧 普通 ✅ 已完成

**现状：** ~~`vitest.config.ts` 无 `coverage` 配置，无法追踪测试覆盖率或设定门禁。~~

**已完成：**
- 安装 `@vitest/coverage-v8` 并配置覆盖率收集
- 设定门禁基线：行覆盖率 ≥ 40%、分支覆盖率 ≥ 30%、函数覆盖率 ≥ 30%
- 输出格式：text + text-summary + lcov + json-summary
- 添加 `test:coverage` npm script
- 配置 `environmentMatchGlobs` 让 component/hook 测试使用 jsdom 环境

---

### P1-TEST-2：为核心 UI 组件添加单元测试 🔧 复杂 ✅ 已完成

**现状：** ~~0 个组件测试文件。`components/ui/` 下 9 个原语组件无任何测试。~~

**已完成：**
- 安装 `@testing-library/react`、`@testing-library/jest-dom`、`@testing-library/user-event`、`jsdom`
- 创建 `tests/setup-dom.ts` 配置 jest-dom 扩展匹配器
- 为全部 9 个 UI 组件编写测试（73 个测试用例）：
  - `button.test.tsx` — 渲染、variant/size 样式、loading/disabled 状态、ref 转发
  - `input.test.tsx` — Input 和 Textarea 的 label、error、required、id 生成
  - `badge.test.tsx` — variant 样式、pill 圆角
  - `card.test.tsx` — Card/CardHeader/CardBody/CardFooter、elevated/noHover
  - `skeleton.test.tsx` — aria-hidden、circle、CardSkeleton
  - `modal.test.tsx` — open/close、Escape 键、role/aria 属性、title
  - `select.test.tsx` — label、error、ChevronDown 图标
  - `dropdown.test.tsx` — 触发打开/关闭、Escape 关闭、aria-expanded、menuitem
  - `index.test.tsx` — 验证 14 个 barrel 导出完整性

---

### P1-TEST-3：为自定义 hooks 添加单元测试 ⚡ 普通 ✅ 已完成

**现状：** ~~`use-infinite-page-append.ts`、`use-web-vitals.ts`、`use-api.ts`、`use-api-mutation.ts` 均无测试。~~

**已完成：**
- 为全部 4 个 hook 编写测试（42 个测试用例）：
  - `use-api.test.tsx` — 7 个 SWR hook 的 URL 传递、条件 fetch、数据提取（24 用例）
  - `use-api-mutation.test.tsx` — 初始状态、成功/失败路径、loading 状态、回调（9 用例）
  - `use-infinite-page-append.test.tsx` — 初始状态、hasMore、loadMore、错误处理（5 用例）
  - `use-web-vitals.test.tsx` — jsdom 安全性、幂等性（4 用例）

---

## P2：前端体验细节收尾

> 定义：用户可感知的粗糙边角打磨。

### P2-UX-1：Feed 组件添加空状态与重试机制 ⚡ 普通 ✅ 已完成

**现状：** ~~`discover-project-feed.tsx`、`discussions-post-feed.tsx` 在数据为空或加载失败时无友好 UI。~~

**已完成：**
- `discover-project-feed.tsx` 添加空状态 UI（FolderOpen 图标 + 引导文案 + "创建项目" CTA 按钮）
- `discussions-post-feed.tsx` 添加空状态 UI（MessageSquarePlus 图标 + 引导文案 + "发起讨论" CTA 按钮）
- 错误状态添加 RefreshCw 重试按钮
- 动态网格添加 `aria-live="polite"` + `aria-relevant="additions"`，错误区域添加 `role="alert"`

---

### P2-UX-2：补充前端 i18n 遗漏 ⚡ 普通 ✅ 已完成

**现状：** ~~Feed 组件中"Loading more…"、"End of results"等硬编码英文字符串未纳入 i18n。~~

**已完成：**
- 审计 Feed 组件 6 个硬编码字符串（Loading more…, End of results, Prefer page-by-page navigation?）替换为 `t()` 调用
- 新增 40+ i18n 键覆盖 feed、comment、post、project、creator stats、task status、admin collab
- `locales/en.json` 和 `locales/zh.json` 同步更新

---

### P2-UX-3：前端 fetch 添加超时与中止控制 ⚡ 普通 ✅ 已完成

**现状：** ~~多数组件 fetch 调用无 `AbortController` 或超时设置，网络挂起时 UI 无限等待。~~

**已完成：**
- `apiFetch` 添加默认 `AbortSignal.timeout(15_000)`（已有 signal 的调用不被覆盖）
- SWR fetcher 添加 `AbortSignal.timeout(15_000)`
- `discover-project-feed.tsx` 和 `discussions-post-feed.tsx` 的 fetchPage 添加 `AbortSignal.timeout(15_000)`
- 超时时间选择 15s（比服务端默认的 10s 查询超时稍长，避免误报）

---

### P2-UX-4：无障碍属性补全 ⚡ 普通 ✅ 已完成

**现状：** ~~仅 66 个 aria 属性分布在整个组件集中，缺少 `aria-current="page"` 等。~~

**已完成：**
- 导航 links（desktop + mobile）添加 `aria-current="page"`
- Feed 动态网格添加 `aria-live="polite"` + `aria-relevant="additions"`
- Loading 状态元素添加 `aria-live="polite"`
- 错误区域添加 `role="alert"`

---

### P2-UX-5：AuthContext 拆分减少不必要重渲染 🔧 复杂 ✅ 已完成

**现状：** ~~`AuthContext` 持有 unreadCount 等高频变更数据，导致所有 `useAuth()` 消费者在计数变化时重渲染。~~

**已完成：**
- 创建独立 `NotificationContext`（`src/app/context/NotificationContext.tsx`），持有 `unreadCount` + `setUnreadCount`
- SSE 连接逻辑（`startNotificationSse`、`closeNotificationSse`）从 AuthContext 移入 NotificationContext
- AuthContext 移除 `unreadCount`、`setUnreadCount` 字段，仅保留 `user`、`loading`、`login`、`logout`、`refresh`
- `NotificationProvider` 嵌套在 `AuthProvider` 内部，通过 `userId` prop 驱动 SSE 连接
- `top-nav.tsx` 更新为 `useNotifications()` 读取 unreadCount
- 拆分后 useAuth() 消费者（comment-thread、top-nav menu 等）不再因通知计数变化而重渲染

---

## P3：基础设施与运维

> 定义：保障持续集成与生产运维能力。

### P3-INFRA-1：建立 GitHub Actions CI/CD 流水线 🔧 复杂 ✅ 已完成

**现状：** ~~当前分支无可用的 `.github/workflows/` CI 配置（仅历史 `p1-gate.yml` 存在于 main）。~~

**已完成：**
- `ci.yml` — lint + vitest + validate:openapi + generate:types + build（push/PR → main 触发，Postgres service container）
- `e2e.yml` — Playwright E2E（独立 workflow，Postgres 实例，失败时上传 report artifact）
- `security.yml` — npm audit + CodeQL + gitleaks（push/PR + 每周一 04:00 UTC 定期扫描）
- `bundle-size.yml` — next build 输出解析 + sticky PR comment 报告
- 所有 workflow 配置 `concurrency` 取消旧运行，减少 CI 资源浪费

---

### P3-INFRA-2：完善环境变量校验 ⚡ 普通 ✅ 已完成

**现状：** ~~`env-check.ts` 仅校验 3 个变量（`SESSION_SECRET`、`DATABASE_URL`、`ENFORCE_REQUIRED_ENV`），生产关键变量未校验。~~

**已完成：**
- 创建 `lib/env-schema.ts` — Zod schema 定义 50+ 环境变量（`boolStr`、`positiveInt`、`optStr` 三种转换器）
- 三级校验策略：必需 / 条件必需 / 可选带默认值
- `superRefine` 实现条件依赖校验（Stripe 全套、S3 凭证、SMTP 认证等）
- 重写 `env-check.ts`：enforcement mode 硬失败 + dev mode 软警告
- 幂等 guard（`_validated` flag）防止重复调用

---

### P3-INFRA-3：Prisma 查询超时配置 ⚡ 普通 ✅ 已完成

**现状：** ~~`db.ts` 中 PrismaClient 无查询超时设置，长时间查询可无限挂起。~~

**已完成：**
- 添加 `PRISMA_QUERY_TIMEOUT_MS` 环境变量（默认 10,000ms）
- 通过 `Promise.race` 实现应用层 per-query 超时（timeout timer 使用 `unref()` 避免阻止进程退出）
- 超时与慢查询日志合并到统一的 `$extends` 回调，无多层 middleware 嵌套
- 文档注释说明 Postgres-level 超时（`connect_timeout`、`pool_timeout`、`statement_timeout`）应通过 DATABASE_URL 参数配置

---

### P3-INFRA-4：更新 .env 模板文件 ⚡ 普通 ✅ 已完成

**现状：** ~~`.env.production.example` 仅 6 个变量，`.env.staging.example` 仅 6 个变量。~~

**已完成：**
- `.env.production.example` — 完整 50+ 变量模板，按功能分区（Core/Database/Auth/Rate Limit/Redis/WS/Notifications/Stripe/S3/SMTP/Queues/Misc）
- `.env.staging.example` — staging 专用模板（启用 PRISMA_LOG_QUERIES、放宽 PRISMA_SLOW_QUERY_MS 至 100ms）
- 每个变量标注必需性级别（🔴 REQUIRED / 🟡 RECOMMENDED / ⚪ OPTIONAL）
- 注释说明用途、默认值、关联依赖

---

## 执行优先级汇总表

| 编号 | 任务 | 优先级 | 领域 | 难度 | 依赖 |
|------|------|--------|------|------|------|
| P0-SEC-1 | 替换 Math.random() ID 生成 | 🔴 P0 | 安全 | 普通 | ✅ 已完成 |
| P0-SEC-2 | parseInt 有限性校验 | 🔴 P0 | 安全 | 普通 | ✅ 已完成 |
| P0-SEC-3 | 消除错误信息泄露 | 🔴 P0 | 安全 | 普通 | ✅ 已完成 |
| P1-ROBUST-1 | 剩余路由 Zod 验证补全 | 🟠 P1 | 健壮性 | 复杂 | ✅ 阶段 1 已完成 |
| P1-ROBUST-2 | 类型化错误枚举替换字符串匹配 | 🟠 P1 | 健壮性 | 普通 | ✅ 已完成 |
| P1-ROBUST-3 | SSE 流异常保护 | 🟠 P1 | 健壮性 | 普通 | ✅ 已完成 |
| P1-ROBUST-4 | webhook-deliveries 异常处理 | 🟠 P1 | 健壮性 | 普通 | ✅ 已完成 |
| P1-TEST-1 | Vitest 覆盖率配置 | 🟠 P1 | 测试 | 普通 | ✅ 已完成 |
| P1-TEST-2 | UI 组件单元测试 | 🟠 P1 | 测试 | 复杂 | ✅ 已完成 |
| P1-TEST-3 | Hooks 单元测试 | 🟠 P1 | 测试 | 普通 | ✅ 已完成 |
| P2-UX-1 | Feed 空状态与重试 | 🟡 P2 | 前端体验 | 普通 | ✅ 已完成 |
| P2-UX-2 | i18n 遗漏补充 | 🟡 P2 | 前端体验 | 普通 | ✅ 已完成 |
| P2-UX-3 | fetch 超时与中止 | 🟡 P2 | 前端体验 | 普通 | ✅ 已完成 |
| P2-UX-4 | 无障碍属性补全 | 🟡 P2 | 前端体验 | 普通 | ✅ 已完成 |
| P2-UX-5 | AuthContext 拆分 | 🟡 P2 | 前端架构 | 复杂 | ✅ 已完成 |
| P3-INFRA-1 | CI/CD 流水线 | 🟢 P3 | 基建 | 复杂 | ✅ 已完成 |
| P3-INFRA-2 | 环境变量校验完善 | 🟢 P3 | 基建 | 普通 | ✅ 已完成 |
| P3-INFRA-3 | Prisma 查询超时 | 🟢 P3 | 基建 | 普通 | ✅ 已完成 |
| P3-INFRA-4 | .env 模板更新 | 🟢 P3 | 基建 | 普通 | ✅ 已完成 |

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
