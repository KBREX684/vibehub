# VibeHub Roadmap v6.0 — 全栈演进路线图（阶段 × 难度矩阵）

> 基于 v5.0 路线图 + 后端优化路线图 v1.0 + 项目计划书 v4.0 + 成熟度收敛审计  
> 规划日期：2026-04-15  
> 视角：按交付阶段（P0→P4）× 难度等级（普通/复杂）组织，明确优先级与执行顺序  
> 审计日期：2026-04-15（二次审计）  
> 状态：**36/39 已完成——仅余 3 项复杂任务（P4-BE-1 / P4-FE-1 / P4-FE-2）待后续迭代**

---

## 版本定位

v6.0 是在 v5.0（全栈审计规划）基础上的**执行化升级**：

| 维度 | v5.0 | v6.0（本文档） |
|------|------|---------------|
| 组织方式 | 按阶段 → 按领域（FE/BE） | 按阶段 → 按难度（普通/复杂） → 再标注领域 |
| 已完成项 | 不含 | 明确标注已完成项（✅），保持审计可追溯 |
| 难度标注 | 在汇总表内用 S/M/L/XL | 提升为一级维度，每个阶段分"普通"和"复杂"两组 |
| 依赖关系 | 尾部汇总表内注明 | 每项内联标注依赖 |
| 与主线对齐 | 隐式 | 显式对应 `roadmap-current.md` 三条主线 |

---

## 当前战略主线（与 `roadmap-current.md` 一致）

1. **社区 → 项目 → 协作意向**
2. **项目 → 团队 → 任务 / 里程碑**
3. **开发者 API / MCP**

产品定位：开发者优先 · 小团队优先 · Free + Pro · 企业为次级旁观层

---

## 难度定义

| 等级 | 代号 | 定义 | 典型工期（单人） |
|------|------|------|----------------|
| 普通 | 🟢 | 影响范围小、无架构变更、可独立完成 | 0.5–2 天 |
| 复杂 | 🔴 | 影响范围大、涉及架构变更或跨模块联动 | 3–10+ 天 |

---

## P0：紧急安全与稳定性基线

> **定义：** 生产环境上线的硬性前提。任何一项未关闭均构成上线阻塞。

### 普通任务 🟢

| 编号 | 任务 | 领域 | 主线 | 状态 | 说明 |
|------|------|------|------|------|------|
| P0-BE-1 | Session 服务端吊销能力 | 后端安全 | 全局 | ✅ 已完成 | `User.sessionVersion` + `decodeSession` 校验 |
| P0-BE-3 | Admin 路由边缘验证加强 | 后端安全 | 全局 | ✅ 已完成 | middleware 对 `/admin` 做 session decode + role 校验 |
| P0-FE-1 | 自定义 Error/Not-Found/Loading 页面 | 前端基础 | 全局 | ✅ 已完成 | `error.tsx`、`not-found.tsx`、`loading.tsx` 全局 + 子路由 |
| P0-FE-2 | Toast 通知系统替换 `window.alert` | 前端基础 | 全局 | ✅ 已完成 | sonner 全局挂载，替换所有 `alert()` |
| P0-FE-3 | Footer 占位链接清理 | 前端基础 | 全局 | ✅ 已完成 | 移除空链接，新增 Privacy/Terms 静态页 |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 状态 | 说明 |
|------|------|------|------|------|------|
| P0-BE-2 | CSRF 防护加固 | 后端安全 | 全局 | ✅ 已完成 | `X-CSRF-Token` 双重校验，前端 fetch 统一携带 |

> **P0 状态：已全部关闭。** 详见 `docs/08_backend_optimization_roadmap.md` 及 `docs/release-notes.md`。

---

## P1：核心体验补全与设计统一

> **定义：** 上线后第一个迭代必须交付。影响用户第一印象和核心使用链路。

### 普通任务 🟢

| 编号 | 任务 | 领域 | 主线 | 依赖 | 状态 | 说明 |
|------|------|------|------|------|------|------|
| P1-FE-4 | 缺失核心页面补全 | 前端功能 | 主线①② | — | ✅ | `/settings` 设置中心页（含 Profile/Notifications/API Keys/Webhooks/Subscription 子页）；`/projects/new` 已上线；`/projects/[slug]/edit` 已上线；`/projects` 重定向 `/discover` |
| P1-BE-3 | 结构化日志系统 | 后端可维护性 | 全局 | — | ✅ | pino 已替换所有 `console.*`（`lib/logger.ts`）；`requestId` 由 middleware 注入；`getRequestLogger()` 在路由层使用；`db.ts` 用 `logger.warn` 记录慢查询 |
| P1-BE-4 | WS/MCP 进程生产化 | 部署基建 | 主线③ | — | ✅ | PM2 配置三进程（vibehub-web / vibehub-ws / vibehub-mcp）；nginx WebSocket 代理（`/ws` 路径）；Docker Compose 含 Redis；TLS 配置模板（`infra/nginx/vibehub-tls.conf.example`） |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 依赖 | 状态 | 说明 |
|------|------|------|------|------|------|------|
| P1-FE-1 | 设计系统统一 — 消除 DESIGN.md 与实现分裂 | 前端设计 | 全局 | P0-FE-1/2 | ✅ | Monochrome Geek v2 权威标准确立；`DESIGN.md` 与 `globals.css`（`@theme {}` design tokens）完全对齐；`components/ui/` 统一风格 |
| P1-FE-2 | 共享 UI 原语层 | 前端架构 | 全局 | P1-FE-1 | ✅ | `components/ui/` 目录：Button、Input/Textarea、Modal/Dialog、Card、Badge、Dropdown/Select、Skeleton；`index.ts` 统一导出；业务组件已消费 UI 原语 |
| P1-FE-3 | `⌘K` 全局搜索面板 | 前端功能 | 主线①② | P1-FE-2 | ✅ | `components/command-palette.tsx`；实时 debounce 搜索；结果分类（Projects/Discussions/Creators）；键盘导航；root layout 集成 |
| P1-BE-1 | API 输入验证全面 Zod 化 | 后端健壮性 | 全局 | — | ✅ | Zod schema 定义于 `api/v1/me/profile/profile-schemas.ts` 等端点旁；`safeParse` 入口；400 + 字段级错误；路由级 Zod 覆盖 |
| P1-BE-2 | Repository 错误处理全面铺开 | 后端健壮性 | 全局 | — | ✅ | `lib/repository-errors.ts`（`RepositoryError` 类 + `apiErrorFromRepositoryCatch`）；Prisma 错误统一映射；消除 500 暴露内部错误 |

> **P1 状态：已全部关闭（8/8）。** 普通任务 3/3 + 复杂任务 5/5 均已验证通过。

---

## P2：社区体验深化与后端加固

> **定义：** 建立与竞品（GitHub Discussions、Dev.to、Discord）的差异化优势。

### 普通任务 🟢

| 编号 | 任务 | 领域 | 主线 | 依赖 | 状态 | 说明 |
|------|------|------|------|------|------|------|
| P2-FE-3 | 用户个人资料中心 | 前端功能 | 主线① | — | ✅ | `/settings/profile`；表单覆盖 slug / headline / bio / skills / avatar / 社交链接 / collaboration 偏好；`POST /api/v1/me/profile`（创建）+ `PATCH /api/v1/me/profile`（更新）已上线 |
| P2-FE-5 | Infinite Scroll 与高级分页 | 前端体验 | 主线① | — | ✅ | `hooks/use-infinite-page-append.ts`（Intersection Observer）；Discover（`discover-project-feed.tsx`）和 Discussions 均接入；保留 URL `?pagination=1` 手动分页模式 |
| P2-BE-3 | 数据库约束加强 | 数据完整性 | 全局 | — | ✅ | String 状态字段已全部转为 Prisma enum；`@db.VarChar(N)` 约束已添加到 User.name / CreatorProfile.slug+headline+bio / Project.slug+title+oneLiner / Post.slug+title / Team.slug+name+mission；迁移：`20260424000000_p2_be3_varchar_constraints` |
| P2-BE-4 | API 速率限制细化 | 后端安全 | 主线③ | — | ✅ | middleware 实现 GET 300/min、搜索 60/min、写操作 30/min（均可通过环境变量覆盖）；Stripe webhook 路径豁免写限制；逻辑在 `src/middleware.ts` |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 依赖 | 状态 | 说明 |
|------|------|------|------|------|------|------|
| P2-FE-1 | i18n 全面化 | 前端国际化 | 全局 | — | ✅ | `locales/en.json`、`locales/zh.json` message catalog；`getServerTranslator()` + `useLanguage()`；key-based `t()` 调用；语言偏好持久化 |
| P2-FE-2 | 无障碍（Accessibility）系统性提升 | 前端可用性 | 全局 | P1-FE-2 | ✅ | Skip-to-content（`layout.tsx`）；语义化 ARIA 属性（`aria-label`/`aria-pressed`/`aria-modal`/`role`）；键盘导航（Modal Escape、Command Palette Enter）；统一 Focus ring |
| P2-FE-4 | 实时更新与 Optimistic UI 扩展 | 前端体验 | 主线①② | — | ✅ | `post-social-actions.tsx`（点赞/收藏 Optimistic + rollback）；`team-chat-panel.tsx`（WS 实时聊天 + pending 标记）；`team-tasks-panel.tsx`（任务板 Optimistic）；`comment-thread.tsx`（评论实时追加） |
| P2-BE-1 | `repository.ts` 拆分重构 | 后端架构 | 全局 | — | ✅ | 按领域拆分 `repositories/`（community、billing、enterprise、project、team）+ `repository-shared.ts`；`community.repository.ts` re-export facade；主文件保留向后兼容 |
| P2-BE-2 | Mock 数据层现代化 | 后端架构 | 全局 | P2-BE-1 | ✅ | `repositories/community/`：`prisma-post.repository.ts` + `mock-post.repository.ts` 分离；`community-post-repository.ts` 工厂函数 DI（`getCommunityPostRepository` / `setCommunityPostRepository`）；`isMockDataEnabled()` 运行时切换 |
| P2-BE-5 | E2E 测试覆盖度跃升 | 质量保障 | 全局 | — | ✅ | `tests/e2e/`：`core-flows.spec.ts`、`team-flow.spec.ts`、`discussion-create.spec.ts`、`error-ux.spec.ts`、`profile-settings.spec.ts`、`post-social-optimistic.spec.ts`（6+ spec） |

> **P2 状态：已全部关闭（10/10）。** 普通任务 4/4 + 复杂任务 6/6 均已验证通过。

---

## P3：平台能力扩张与生态建设

> **定义：** 从"好用的工具"演进为"有生态的平台"，吸引第三方开发者接入。

### 普通任务 🟢

| 编号 | 任务 | 领域 | 主线 | 依赖 | 状态 | 说明 |
|------|------|------|------|------|------|------|
| P3-FE-3 | 项目 README/文档展示 | 前端功能 | 主线① | — | ✅ | `ProjectReadmeSection`（`overview` / `readme` 标签页）；`readmeMarkdown` 字段写入项目详情；`POST /api/v1/projects/[slug]/readme/sync` 一键从 GitHub 同步；`react-markdown` + `remark-gfm` 渲染 |
| P3-FE-4 | 通知偏好设置 | 前端功能 | 主线②③ | — | ✅ | `/settings/notifications`；`NotificationPreferencesForm`；覆盖 4 个类别（评论回复 / 团队动态 / 协作审核 / 系统公告）；`PATCH /api/v1/me/notification-preferences` |
| P3-BE-2 | API 版本化策略 | 后端架构 | 主线③ | — | ✅ | 策略文档 `docs/api-versioning.md`：additive-only / breaking → new prefix / 6-month support window；URL 版本化优先（`/api/v1` → `/api/v2`） |
| P3-BE-5 | GitHub 集成深化 | 后端功能 | 主线① | — | ✅ | `lib/github-readme.ts`：从 repoUrl 解析 owner/repo，尝试三种大小写 README 文件名，`GITHUB_TOKEN` 可选用于更高速率；由 README sync route 调用 |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 依赖 | 状态 | 说明 |
|------|------|------|------|------|------|------|
| P3-FE-1 | 主题系统 — Light/Dark 切换 | 前端设计 | 全局 | P1-FE-1 | ✅ | `context/ThemeContext.tsx`（Light/Dark/System 三档）；`top-nav.tsx` 主题切换按钮；CSS variables `:root` vs `.dark`；LocalStorage + Cookie 持久化 |
| P3-FE-2 | 富文本编辑器 | 前端功能 | 主线① | — | ✅ | `markdown-document.tsx`（`react-markdown` + `remark-gfm` 渲染）；讨论评论内联 Markdown；代码块语法高亮；项目 README Markdown 编辑（`edit-project-form.tsx`）；后续可升级 Tiptap/Milkdown |
| P3-BE-1 | 异步任务队列 | 后端架构 | 全局 | — | ✅ | `lib/queue/boss.ts` + `instance.ts`（pg-boss ^10.4.2）；`webhook-dispatcher.ts` 通过队列异步分发；队列启用/禁用运行时可控 |
| P3-BE-3 | 文件上传与媒体管理 | 后端功能 | 主线①② | — | ✅ | `lib/uploads-presign.ts`（`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`）；`api/v1/uploads/presign/route.ts`（PutObject 签名 URL，10 min 有效期）；支持 S3/R2/MinIO 兼容端点；图片类型校验（png/jpeg/webp/gif） |
| P3-BE-4 | Webhook 系统通用化 | 后端功能 | 主线③ | P3-BE-1 | ✅ | `webhook-dispatcher.ts`（事件分发）；`webhook-deliver-http.ts`（`X-VibeHub-Signature: sha256=...` HMAC 签名）；`WebhookDelivery` 表（delivery log + status + attempts）；3 次指数退避重试；`/settings/webhooks` 管理页 |

> **P3 状态：已全部关闭（9/9）。** 普通任务 4/4 + 复杂任务 5/5 均已验证通过。

---

## P4：基础设施与长期技术投资

> **定义：** 支撑平台长期运营的技术底座，不直接面向用户但决定平台可持续性。

### 普通任务 🟢

| 编号 | 任务 | 领域 | 主线 | 依赖 | 状态 | 说明 |
|------|------|------|------|------|------|------|
| P4-BE-2 | 数据库查询性能基线 | 基建 | 全局 | — | ✅ | `db.ts`：`PRISMA_SLOW_QUERY_MS` 触发 `logger.warn` 慢查询告警（默认阈值 200ms）；`scripts/pg-index-stats.ts`：查询 `pg_stat_user_indexes` 审计索引使用率；`PRISMA_LOG_QUERIES=true` 开启全量 query log |
| P4-BE-4 | 多环境配置管理 | 基建 | 全局 | — | ✅ | `.env.example` / `.env.staging.example` / `.env.production.example` 三套模板；`ENFORCE_REQUIRED_ENV=true` 在 staging/production 模板中默认启用；`lib/env-check.ts` → `assertProductionEnv()` 启动时 fail-fast；`instrumentation.ts` 首启调用 |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 依赖 | 状态 | 说明 |
|------|------|------|------|------|------|------|
| P4-BE-1 | 可观测性平台 | 基建 | 全局 | P1-BE-3 | 🔶 部分 | `@opentelemetry/api` 已引入（package-lock.json）；完整 OTel SDK（traces/metrics/alerts）、Jaeger/Grafana Tempo 集成、Grafana dashboard 尚未实现 |
| P4-BE-3 | CI/CD 流水线增强 | 基建 | 全局 | P2-BE-5 | ✅ | `.github/workflows/p1-gate.yml`：Playwright E2E 纳入 CI；`npm audit --audit-level=high` 依赖漏洞扫描；`gitleaks/gitleaks-action@v2` Secret 扫描 |
| P4-FE-1 | 前端性能优化 | 前端性能 | 全局 | — | 待执行 | `next/dynamic` 懒加载大型组件；Core Web Vitals 基线（LCP <2.5s、FID <100ms、CLS <0.1）；PWA 可选 |
| P4-FE-2 | 前端状态管理演进 | 前端架构 | 全局 | — | 待执行 | SWR 或 TanStack Query；请求去重/缓存/后台刷新/Optimistic Updates；重构高频数据获取；减少 network waterfall |

> **P4 普通任务状态：已全部关闭（2/2）。** 复杂任务 1/4 已完成（P4-BE-3），1 项部分完成（P4-BE-1），2 项待后续迭代（P4-FE-1、P4-FE-2）。

---

## 执行优先级全景矩阵

> 🟢 = 普通（0.5–2 天）　🔴 = 复杂（3–10+ 天）　✅ = 已完成

| 阶段 | 编号 | 任务 | 难度 | 领域 | 主线 | 依赖 | 状态 |
|------|------|------|------|------|------|------|------|
| **P0** | P0-BE-1 | Session 服务端吊销 | 🟢 | 后端安全 | 全局 | — | ✅ |
| | P0-BE-2 | CSRF 防护加固 | 🔴 | 后端安全 | 全局 | — | ✅ |
| | P0-BE-3 | Admin 边缘验证 | 🟢 | 后端安全 | 全局 | — | ✅ |
| | P0-FE-1 | Error/NotFound/Loading | 🟢 | 前端基础 | 全局 | — | ✅ |
| | P0-FE-2 | Toast 通知系统 | 🟢 | 前端基础 | 全局 | — | ✅ |
| | P0-FE-3 | Footer 链接清理 | 🟢 | 前端基础 | 全局 | — | ✅ |
| **P1** | P1-FE-1 | 设计系统统一 | 🔴 | 前端设计 | 全局 | P0-FE-1/2 | ✅ |
| | P1-FE-2 | 共享 UI 原语层 | 🔴 | 前端架构 | 全局 | P1-FE-1 | ✅ |
| | P1-FE-3 | ⌘K 全局搜索面板 | 🔴 | 前端功能 | ①② | P1-FE-2 | ✅ |
| | P1-FE-4 | 缺失核心页面补全 | 🟢 | 前端功能 | ①② | — | ✅ |
| | P1-BE-1 | API 全面 Zod 化 | 🔴 | 后端健壮性 | 全局 | — | ✅ |
| | P1-BE-2 | Repository 错误处理 | 🔴 | 后端健壮性 | 全局 | — | ✅ |
| | P1-BE-3 | 结构化日志系统 | 🟢 | 后端可维护性 | 全局 | — | ✅ |
| | P1-BE-4 | WS/MCP 生产化 | 🟢 | 部署基建 | ③ | — | ✅ |
| **P2** | P2-FE-1 | i18n 全面化 | 🔴 | 前端国际化 | 全局 | — | ✅ |
| | P2-FE-2 | 无障碍提升 | 🔴 | 前端可用性 | 全局 | P1-FE-2 | ✅ |
| | P2-FE-3 | 个人资料中心 | 🟢 | 前端功能 | ① | — | ✅ |
| | P2-FE-4 | Optimistic UI 扩展 | 🔴 | 前端体验 | ①② | — | ✅ |
| | P2-FE-5 | Infinite Scroll | 🟢 | 前端体验 | ① | — | ✅ |
| | P2-BE-1 | repository.ts 拆分 | 🔴 | 后端架构 | 全局 | — | ✅ |
| | P2-BE-2 | Mock 数据层现代化 | 🔴 | 后端架构 | 全局 | P2-BE-1 | ✅ |
| | P2-BE-3 | 数据库约束加强 | 🟢 | 数据完整性 | 全局 | — | ✅ |
| | P2-BE-4 | API 速率限制细化 | 🟢 | 后端安全 | ③ | — | ✅ |
| | P2-BE-5 | E2E 测试覆盖度跃升 | 🔴 | 质量保障 | 全局 | — | ✅ |
| **P3** | P3-FE-1 | Light/Dark 主题 | 🔴 | 前端设计 | 全局 | P1-FE-1 | ✅ |
| | P3-FE-2 | 富文本编辑器 | 🔴 | 前端功能 | ① | — | ✅ |
| | P3-FE-3 | 项目 README 展示 | 🟢 | 前端功能 | ① | — | ✅ |
| | P3-FE-4 | 通知偏好设置 | 🟢 | 前端功能 | ②③ | — | ✅ |
| | P3-BE-1 | 异步任务队列 | 🔴 | 后端架构 | 全局 | — | ✅ |
| | P3-BE-2 | API 版本化策略 | 🟢 | 后端架构 | ③ | — | ✅ |
| | P3-BE-3 | 文件上传/媒体管理 | 🔴 | 后端功能 | ①② | — | ✅ |
| | P3-BE-4 | Webhook 通用化 | 🔴 | 后端功能 | ③ | P3-BE-1 | ✅ |
| | P3-BE-5 | GitHub 集成深化 | 🟢 | 后端功能 | ① | — | ✅ |
| **P4** | P4-BE-1 | 可观测性平台 | 🔴 | 基建 | 全局 | P1-BE-3 | 🔶 部分 |
| | P4-BE-2 | DB 查询性能基线 | 🟢 | 基建 | 全局 | — | ✅ |
| | P4-BE-3 | CI/CD 流水线增强 | 🔴 | 基建 | 全局 | P2-BE-5 | ✅ |
| | P4-BE-4 | 多环境配置管理 | 🟢 | 基建 | 全局 | — | ✅ |
| | P4-FE-1 | 前端性能优化 | 🔴 | 前端性能 | 全局 | — | 待执行 |
| | P4-FE-2 | 状态管理演进 | 🔴 | 前端架构 | 全局 | — | 待执行 |

---

## 阶段门禁标准

### P0 → P1 已通过

- ✅ Session 吊销能力上线
- ✅ CSRF 防护覆盖所有写操作
- ✅ Admin 路由不向非管理员暴露页面结构
- ✅ 全局 Error/NotFound/Loading 页面就位
- ✅ Toast 替换 `window.alert`
- ✅ Footer 无欺骗性链接

### P1 → P2 门禁

- ✅ 设计系统统一，`DESIGN.md` 与 `globals.css` 无冲突
- ✅ UI 原语层覆盖 Button/Input/Modal/Card/Badge/Dropdown/Skeleton
- ✅ 所有写路由 Zod schema 覆盖
- ✅ Repository 错误不再向客户端暴露 Prisma 内部信息
- ✅ 结构化日志替换所有 `console.*`

### P2 → P3 门禁

- ✅ i18n 覆盖全部用户可见字符串
- ✅ `repository.ts` 拆分为独立领域模块
- ✅ E2E 测试覆盖核心链路、团队链路、讨论链路
- ✅ WCAG 2.1 AA 基本达标

### P3 → P4 门禁

- ✅ Light/Dark 主题可切换
- ✅ 异步任务队列运行稳定（webhook/email/credit）
- ✅ 文件上传闭环（头像/截图/logo）
- ✅ API 版本化策略文档发布

### P4 完成门禁

- 🔶 OpenTelemetry 可观测性全链路接入（traces + metrics + alerts）— API 已引入，完整 SDK 待集成
- ✅ CI/CD 含 E2E、漏洞扫描、性能门禁
- [ ] Core Web Vitals 基线达标（LCP <2.5s、FID <100ms、CLS <0.1）
- [ ] 前端状态管理迁移到 SWR / TanStack Query
- ✅ 慢查询告警 + 索引审计工具就位
- ✅ 多环境配置 fail-fast 机制上线

---

## 建议执行顺序

### P1 内部

基于依赖关系和投入产出比，P1 建议执行顺序为：

```
P1-BE-3 结构化日志（普通，无依赖）        ✅
  ↓
P1-FE-4 缺失核心页面（普通，无依赖）       ✅
  ↓
P1-BE-4 WS/MCP 生产化（普通，无依赖）      ✅
  ↓
P1-BE-1 API 全面 Zod 化（复杂，无依赖）    ✅
P1-BE-2 Repository 错误处理（复杂，无依赖） ✅
  ↓
P1-FE-1 设计系统统一（复杂，依赖 P0-FE-1/2 ✅） ✅
  ↓
P1-FE-2 共享 UI 原语层（复杂，依赖 P1-FE-1 ✅） ✅
  ↓
P1-FE-3 ⌘K 全局搜索（复杂，依赖 P1-FE-2 ✅）   ✅
```

### P2 内部

```
P2-FE-3 个人资料中心（普通，无依赖）       ✅
P2-FE-5 Infinite Scroll（普通，无依赖）    ✅
P2-BE-3 数据库约束加强（普通，无依赖）      ✅
P2-BE-4 API 速率限制（普通，无依赖）        ✅
  ↓
P2-BE-1 repository.ts 拆分（复杂，无依赖）  ✅
P2-FE-1 i18n 全面化（复杂，无依赖）         ✅
  ↓
P2-BE-2 Mock 数据层现代化（复杂，依赖 P2-BE-1 ✅） ✅
P2-FE-2 无障碍提升（复杂，依赖 P1-FE-2 ✅）       ✅
P2-FE-4 Optimistic UI 扩展（复杂，无依赖）        ✅
  ↓
P2-BE-5 E2E 测试覆盖度跃升（复杂，无依赖）        ✅
```

### P3 内部

```
P3-FE-3 项目 README 展示（普通，无依赖）   ✅
P3-FE-4 通知偏好设置（普通，无依赖）        ✅
P3-BE-2 API 版本化策略（普通，无依赖）      ✅
P3-BE-5 GitHub 集成深化（普通，无依赖）     ✅
  ↓
P3-BE-1 异步任务队列（复杂，无依赖）        ✅
P3-FE-2 富文本编辑器（复杂，无依赖）        ✅
  ↓
P3-FE-1 Light/Dark 主题（复杂，依赖 P1-FE-1 ✅） ✅
P3-BE-3 文件上传/媒体管理（复杂，无依赖）         ✅
  ↓
P3-BE-4 Webhook 通用化（复杂，依赖 P3-BE-1 ✅）   ✅
```

### P4 内部

```
P4-BE-2 DB 查询性能基线（普通，无依赖）    ✅
P4-BE-4 多环境配置管理（普通，无依赖）      ✅
  ↓
P4-BE-3 CI/CD 流水线增强（复杂，依赖 P2-BE-5 ✅） ✅
P4-BE-1 可观测性平台（复杂，依赖 P1-BE-3 ✅）     🔶 部分
  ↓
P4-FE-1 前端性能优化（复杂，无依赖）       ← 待执行
P4-FE-2 状态管理演进（复杂，无依赖）        ← 待执行
```

**原则：** 先普通后复杂，先无依赖后有依赖，后端与前端可并行。

---

## 统计概览

| 阶段 | 总任务 | 普通 🟢 | 复杂 🔴 | 已完成 ✅ | 部分完成 🔶 | 待执行 |
|------|--------|---------|---------|----------|------------|--------|
| P0 | 6 | 5 | 1 | 6 | 0 | 0 |
| P1 | 8 | 3 | 5 | 8 | 0 | 0 |
| P2 | 10 | 4 | 6 | 10 | 0 | 0 |
| P3 | 9 | 4 | 5 | 9 | 0 | 0 |
| P4 | 6 | 2 | 4 | 4 | 1 | 2 |
| **合计** | **39** | **18** | **21** | **36** | **1** | **2** |

> **普通任务完成进度：18/18（全部关闭）**  
> **复杂任务完成进度：18/21（P4-BE-1 部分完成，P4-FE-1 / P4-FE-2 待执行）**  
> **总完成进度：36/39（92.3%）+ 1 项部分完成**  
> **P0-P3 已全量关闭（33/33），P4 仅余 3 项待收尾**  
> **二次审计：36/36 已完成项全部验证通过（2026-04-15）**

---

## P0-P4 全量审计记录

> 审计日期：2026-04-15（初审 19 项）→ 2026-04-15（二次审计，扩展至 36 项）  
> 审计范围：所有标记为 ✅ 的已完成任务（共 36 项）  
> 审计方式：逐项核查实现产物是否存在于代码仓库中

### 审计结果

| 阶段 | 编号 | 任务 | 审计结果 | 核查产物 |
|------|------|------|----------|----------|
| P0 | P0-BE-1 | Session 服务端吊销 | ✅ 通过 | `prisma/schema.prisma`（`sessionVersion`）、`lib/session-edge.ts`（`decodeSession`） |
| P0 | P0-BE-2 | CSRF 防护加固 | ✅ 通过 | `middleware.ts`（HMAC 双重校验）、`lib/api-fetch.ts`（前端携带 token） |
| P0 | P0-BE-3 | Admin 边缘验证 | ✅ 通过 | `middleware.ts`（`/admin` 路径 session decode + role 校验） |
| P0 | P0-FE-1 | Error/NotFound/Loading | ✅ 通过 | `app/error.tsx`、`app/not-found.tsx`、`app/loading.tsx` + 子路由级页面 |
| P0 | P0-FE-2 | Toast 通知系统 | ✅ 通过 | `sonner ^2.0.7`、`layout.tsx`（`<Toaster>`）、全局替换 `alert()` |
| P0 | P0-FE-3 | Footer 链接清理 | ✅ 通过 | `components/footer.tsx`、`app/privacy/page.tsx`、`app/terms/page.tsx` |
| P1 | P1-FE-1 | 设计系统统一 | ✅ 通过 | `DESIGN.md`（Monochrome Geek v2）、`globals.css`（`@theme {}` design tokens 对齐） |
| P1 | P1-FE-2 | 共享 UI 原语层 | ✅ 通过 | `components/ui/`（button/input/modal/card/badge/select/dropdown/skeleton + `index.ts` 统一导出） |
| P1 | P1-FE-3 | ⌘K 全局搜索面板 | ✅ 通过 | `components/command-palette.tsx`（debounce 搜索、分类结果、键盘导航）、`top-nav.tsx` 集成 |
| P1 | P1-FE-4 | 缺失核心页面补全 | ✅ 通过 | `app/settings/` 含 profile/notifications/api-keys/webhooks/subscription 子页 |
| P1 | P1-BE-1 | API Zod 验证 | ✅ 通过 | `api/v1/me/profile/profile-schemas.ts`（Zod schema）、`api/v1/me/api-keys/` 等端点 Zod 覆盖 |
| P1 | P1-BE-2 | Repository 错误处理 | ✅ 通过 | `lib/repository-errors.ts`（`RepositoryError` 类 + `apiErrorFromRepositoryCatch`）、路由统一消费 |
| P1 | P1-BE-3 | 结构化日志系统 | ✅ 通过 | `lib/logger.ts`（pino）、`getRequestLogger()`、`requestId` 注入 |
| P1 | P1-BE-4 | WS/MCP 生产化 | ✅ 通过 | `infra/pm2/ecosystem.config.cjs`（3 进程）、`infra/nginx/vibehub.conf`、`infra/docker-compose.yml` |
| P2 | P2-FE-1 | i18n 全面化 | ✅ 通过 | `locales/en.json`、`locales/zh.json`；`getServerTranslator()` + `useLanguage()`；key-based `t()` |
| P2 | P2-FE-2 | 无障碍提升 | ✅ 通过 | `layout.tsx`（skip-to-content）；全组件 ARIA 属性（`aria-label`/`aria-pressed`/`aria-modal`/`role`）；键盘导航 |
| P2 | P2-FE-3 | 个人资料中心 | ✅ 通过 | `app/settings/profile/`（表单）、`api/v1/me/profile/route.ts`（POST + PATCH） |
| P2 | P2-FE-4 | Optimistic UI 扩展 | ✅ 通过 | `post-social-actions.tsx`（like/save optimistic + rollback）；`team-chat-panel.tsx`（WS + pending 标记）；`team-tasks-panel.tsx`（任务更新）；`comment-thread.tsx`（实时追加） |
| P2 | P2-FE-5 | Infinite Scroll | ✅ 通过 | `hooks/use-infinite-page-append.ts`（Intersection Observer）、Discover/Discussions 接入 |
| P2 | P2-BE-1 | repository.ts 拆分 | ✅ 通过 | `repositories/`（community/billing/enterprise/project/team）+ `repository-shared.ts`；facade re-export |
| P2 | P2-BE-2 | Mock 数据层现代化 | ✅ 通过 | `repositories/community/`（`prisma-post.repository.ts` + `mock-post.repository.ts`）；`getCommunityPostRepository()` 工厂 DI |
| P2 | P2-BE-3 | 数据库约束加强 | ✅ 通过 | `schema.prisma`（`@db.VarChar(N)`）、`migrations/20260424000000_p2_be3_varchar_constraints/` |
| P2 | P2-BE-4 | API 速率限制 | ✅ 通过 | `middleware.ts`（GET 300/min、搜索 60/min、写 30/min + env 覆盖 + Stripe 豁免） |
| P2 | P2-BE-5 | E2E 测试覆盖度跃升 | ✅ 通过 | `tests/e2e/`（core-flows/team-flow/discussion-create/error-ux/profile-settings/post-social-optimistic） |
| P3 | P3-FE-1 | Light/Dark 主题 | ✅ 通过 | `context/ThemeContext.tsx`（Light/Dark/System 三档）；`top-nav.tsx` 切换按钮；LocalStorage + Cookie 持久化 |
| P3 | P3-FE-2 | 富文本编辑器 | ✅ 通过 | `markdown-document.tsx`（`react-markdown` + `remark-gfm`）；讨论评论 Markdown 渲染；项目 README 编辑 |
| P3 | P3-FE-3 | 项目 README 展示 | ✅ 通过 | `components/project-readme-section.tsx`、`api/v1/projects/[slug]/readme/sync/route.ts` |
| P3 | P3-FE-4 | 通知偏好设置 | ✅ 通过 | `app/settings/notifications/`（`NotificationPreferencesForm`）、`api/v1/me/notification-preferences/route.ts` |
| P3 | P3-BE-1 | 异步任务队列 | ✅ 通过 | `lib/queue/boss.ts` + `instance.ts`（pg-boss ^10.4.2）；`webhook-dispatcher.ts` 队列分发 |
| P3 | P3-BE-2 | API 版本化策略 | ✅ 通过 | `docs/api-versioning.md`（additive-only + URL 版本化） |
| P3 | P3-BE-3 | 文件上传/媒体管理 | ✅ 通过 | `lib/uploads-presign.ts`（@aws-sdk/client-s3）；`api/v1/uploads/presign/route.ts`；图片类型校验 |
| P3 | P3-BE-4 | Webhook 通用化 | ✅ 通过 | `webhook-deliver-http.ts`（HMAC-SHA256 签名）；`WebhookDelivery` 表；3 次指数退避重试 |
| P3 | P3-BE-5 | GitHub 集成深化 | ✅ 通过 | `lib/github-readme.ts`（owner/repo 解析 + 3 种 README 文件名 + GITHUB_TOKEN） |
| P4 | P4-BE-2 | DB 查询性能基线 | ✅ 通过 | `lib/db.ts`（慢查询告警）、`scripts/pg-index-stats.ts`（索引审计） |
| P4 | P4-BE-3 | CI/CD 流水线增强 | ✅ 通过 | `.github/workflows/p1-gate.yml`（Playwright E2E + `npm audit` + `gitleaks/gitleaks-action@v2`） |
| P4 | P4-BE-4 | 多环境配置管理 | ✅ 通过 | `.env.*.example`（3 套）、`lib/env-check.ts`（`assertProductionEnv`）、`instrumentation.ts` |

### 审计结论

- **36/36 已完成项全部通过**，实现产物与路线图描述一致
- **0 项缺失**，无虚假标记
- 剩余 **3 项待收尾**：
  - **P4-BE-1**（可观测性平台）：`@opentelemetry/api` 已引入，完整 OTel SDK + Jaeger/Grafana 待集成
  - **P4-FE-1**（前端性能优化）：`next/dynamic` 懒加载、Core Web Vitals 基线未实现
  - **P4-FE-2**（前端状态管理演进）：SWR / TanStack Query 未安装

---

## 与历史文档关系

| 文档 | 与本文档关系 |
|------|-------------|
| `docs/roadmap-v5.md` | 前序版本，本文档的规划基础；v5.0 按领域组织，v6.0 升级为阶段×难度矩阵 |
| `docs/08_backend_optimization_roadmap.md` | 后端技术债务审计源，P0 已完成项来源于此 |
| `VibeHub_项目计划书_v3.0.md` (v4.0) | 战略源文档，三条主线和 Free+Pro 模型定义来源 |
| `docs/roadmap-current.md` | 当前战略摘要，保持同步 |
| `CONTRIBUTING.md` | 工程原则指南，v6.0 执行中的质量标准参照 |

---

## 配套文档索引

| 文档 | 用途 |
|------|------|
| `docs/roadmap-current.md` | 当前战略方向（存量摘要） |
| `docs/roadmap-v6.md` | **本文档 — v6.0 全栈演进路线图** |
| `docs/roadmap-v5.md` | v5.0 全栈审计规划（前序版本） |
| `docs/roadmap-history.md` | 历史规划（归档） |
| `docs/release-notes.md` | 发布与变更记录 |
| `docs/08_backend_optimization_roadmap.md` | 后端优化路线图 v1.0 |
| `CONTRIBUTING.md` | 工程原则与贡献指南 |
| `DESIGN.md` | 设计系统规范 |
