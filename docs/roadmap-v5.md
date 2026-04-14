# VibeHub Roadmap v5.0 — 成熟开发者社区演进路线图

> 基于 v3.4 封版代码全量审计 + 后端优化路线图 v1.0 + 前端深度审计  
> 规划日期：2026-04-14  
> 视角：以成熟开发者社区的标准审视后端健壮性/完整性 + 前端功能性/美观性  
> 状态：**纯规划文档，不涉及任何代码修改**

---

## 审计基准摘要

| 维度 | 当前状态 | 差距评估 |
|------|---------|---------|
| 后端 API 路由 | 106 个 route.ts，OpenAPI 覆盖率已达 100%（非 admin） | Zod 验证仅覆盖 ~30%，统一错误处理未全面铺开 |
| 认证与权限 | HMAC session + Bearer API Key，基本安全 | CSRF token 缺失、session 无服务端吊销能力、admin 边缘校验仅检查 cookie 存在 |
| 数据库 | Prisma 6 + PostgreSQL 16，模型完整 | 部分枚举用 String 而非 enum，索引覆盖充足但缺乏查询性能基线 |
| 前端页面 | 34 个路由页面，核心链路闭环 | 无 loading/error/not-found 自定义页面，设计系统与 DESIGN.md 不统一 |
| 前端组件 | 33 个组件，全部手写 | 无共享 UI 原语层（Button/Modal/Input），无 Toast 系统 |
| i18n | EN/ZH 双语 toggle | 仅 TopNav/Footer 翻译，其余硬编码英文 |
| 测试 | 49 个测试文件（Vitest + Playwright） | WS/MCP 无专项测试，E2E 仅 1 个 spec 文件 |
| 可观测性 | requestId 已在 API 响应中 | 无结构化日志、无 APM、无告警 |
| 部署基建 | Docker Compose 仅 Postgres，nginx 无 TLS，PM2 仅 Next | WS 和 MCP 进程无 PM2 管理 |
| 设计一致性 | globals.css "Monochrome Geek" vs DESIGN.md "Apple-inspired" | 两套设计语言冲突，collections/challenges 使用了不同的浅色方案 |

---

## 阶段总览

```
P0  紧急安全与稳定性基线    — 不修不能上线
P1  核心体验补全与设计统一  — 上线后第一个迭代必须交付
P2  社区体验深化与后端加固  — 建立差异化竞争力
P3  平台能力扩张与生态建设  — 从工具走向平台
P4  基础设施与长期技术投资  — 可持续运营底座
```

---

## P0：紧急安全与稳定性基线

> 定义：生产环境上线的硬性前提条件。任何一项未关闭均构成上线阻塞。

### P0-BE-1：Session 服务端吊销能力

> **修改难度：低** — 改动高度集中（`User` 模型加一个字段 + `auth.ts` / `decodeSession` 中增加版本校验），无需引入新依赖，不涉及跨模块协调，迁移脚本简单。

**现状：** Session 为纯客户端 HMAC cookie，7 天有效期内无法服务端强制失效。若账号被盗或角色变更，只能等 cookie 自然过期。

**目标：**
- 引入 session 版本号机制（`User.sessionVersion` 字段），每次敏感操作（密码变更、角色变更、账号冻结）自增
- `decodeSession` 时校验 version 是否匹配，不匹配则拒绝
- 不需要引入 Redis session store，保持无状态架构的同时获得吊销能力

**影响范围：** `auth.ts`、`types.ts`、`User` 模型、GitHub callback

---

### P0-BE-2：CSRF 防护加固

> **修改难度：中** — 服务端逻辑改动仍集中（`auth.ts` + `middleware.ts`），但前端侧需要在所有 fetch 调用点统一补充 `X-CSRF-Token` header，改动点分散，容易遗漏，需要系统性扫描。

**现状：** 依赖 `SameSite=Lax` cookie 属性，无显式 CSRF token。对于 Cookie 认证的状态变更 API，存在跨站攻击面（尤其在未来支持 `SameSite=None` 的跨域场景）。

**目标：**
- 对所有 Cookie 认证的 mutating API（POST/PATCH/PUT/DELETE）引入 `X-CSRF-Token` 双重检验
- Token 可从 session 中派生（签名子串），无需独立存储
- 前端 fetch 封装统一携带 header

**影响范围：** `auth.ts`、`middleware.ts`、前端所有 fetch 调用点

---

### P0-BE-3：Admin 路由边缘验证加强

> **修改难度：低** — 仅修改 `middleware.ts` 一个文件，在 Edge Runtime 中用 Web Crypto 做 HMAC 校验后增加角色判断，改动范围极小，无外部依赖。

**现状：** Edge middleware 仅检查 `vibehub_session` cookie **是否存在**，不验证角色。普通用户可访问 `/admin` UI（虽然服务端会 403，但不应暴露 admin 页面结构）。

**目标：**
- middleware 中对 `/admin` 路径做 session decode + role 校验（Edge 环境可使用 Web Crypto HMAC 校验）
- 非 admin 角色直接 302 到首页，不渲染 admin layout

**影响范围：** `middleware.ts`

---

### P0-FE-1：自定义 Error / Not-Found / Loading 页面

> **修改难度：低** — 纯新增文件，不改动任何现有代码，Next.js 约定路由自动生效。子路由 `not-found` 文件同样逐一新建即可，逻辑简单，无跨模块依赖。

**现状：** 无 `error.tsx`、`not-found.tsx`、`loading.tsx`。用户遇到任何异常都是 Next.js 默认的开发者风格错误页，极大影响产品可信度。

**目标：**
- `app/error.tsx`：全局错误边界，友好的错误提示 + "返回首页"按钮
- `app/not-found.tsx`：品牌化 404 页面
- `app/loading.tsx`：骨架屏 loading 状态
- 关键子路由（`/projects/[slug]`、`/teams/[slug]`、`/discussions/[slug]`）各自定义 `not-found` 提示

**影响范围：** `app/` 目录，新增 3 个全局文件 + 若干子路由 not-found

---

### P0-FE-2：Toast 通知系统替换 `window.alert`

> **修改难度：中** — 引入 Toast 库本身简单，但需要全量扫描所有 `window.alert` 调用并逐一替换，同时为所有写操作补充成功/失败反馈。改动点分散，需要系统性梳理，但单个改动都不复杂。

**现状：** `pricing-cards.tsx`、`upgrade-prompt.tsx` 等使用 `window.alert()` 展示错误，多个表单成功后无反馈。

**目标：**
- 引入轻量 Toast 组件（自建或使用 sonner/react-hot-toast）
- 全局挂载到 `layout.tsx`
- 替换所有 `window.alert` 调用
- 为所有写操作（评论、帖子、团队创建等）添加成功/失败 Toast

**影响范围：** `layout.tsx`、所有使用 `alert()` 的组件、所有表单提交回调

---

### P0-FE-3：Footer 占位链接清理

> **修改难度：低** — 改动只涉及 `footer.tsx` 的 href 属性修改与新增 2 个静态内容页面，无逻辑复杂性，不涉及 API 或状态，是所有任务中风险最低的。

**现状：** Footer 中 About / Blog / Careers / Contact / Privacy / Terms 全部指向 `href="/"`，对用户构成欺骗性导航。

**目标：**
- 移除尚无内容的链接（Blog、Careers）或标记为 "Coming soon"
- 创建基础的 Privacy Policy 和 Terms of Service 页面（静态内容）
- About 链接指向首页的"关于"锚点或独立页面

**影响范围：** `footer.tsx`，新增 2 个静态页面

---

## P1：核心体验补全与设计统一

> 定义：上线后第一个迭代必须交付的核心功能补全和视觉统一。影响用户第一印象和核心使用链路。

### P1-FE-1：设计系统统一 — 消除 DESIGN.md 与实现的分裂

> **修改难度：高** — 需要在三套设计语言中做架构决策，涉及 `globals.css` CSS 变量体系的全面重定义，牵连全部 33 个组件的色彩/字体/间距调整，视觉回归测试量大，且必须在设计决策确定前无法启动实施。

**现状：**
- `DESIGN.md` 定义了 Apple-inspired 设计语言（SF Pro、Apple Blue `#0071e3`、light/dark 交替）
- `globals.css` 实现的是 "Monochrome Geek"（Inter 字体、纯黑/白、无色彩）
- Collections/Challenges 页面又使用了第三套浅色 stone/amber 风格
- 三套设计语言在同一产品中共存，缺乏专业感

**目标：**
- 做出明确设计决策：选定一套设计语言作为权威标准
- 更新 `DESIGN.md` 与 `globals.css` 保持一致
- 将 Collections/Challenges 页面迁移到统一设计语言
- 建立设计 token 的单一真相源（`globals.css` → 全部组件消费）

**影响范围：** `DESIGN.md`、`globals.css`、Collections/Challenges 页面、可能影响全部组件的色彩调整

---

### P1-FE-2：共享 UI 原语层

> **修改难度：高** — 需要从零构建完整的 UI 原语层（6-8 个组件），同时逐步重构现有 33 个业务组件以消费原语，工作量大，且变更前后需要保证视觉一致性，每一个原语组件都需考虑 variant、size、状态、可访问性。

**现状：** 33 个组件全是业务组件，无共享的 Button / Input / Modal / Card / Badge / Dropdown 原语。样式通过 Tailwind 工具类在各处重复定义。

**目标：**
- 建立 `components/ui/` 目录，包含核心原语：
  - `Button`（variant: primary / secondary / ghost / destructive；size: sm / md / lg）
  - `Input` / `Textarea`（统一 focus ring、error 状态）
  - `Modal` / `Dialog`（统一 overlay、动画、ESC 关闭、焦点陷阱）
  - `Card`（统一 surface 样式、hover 效果）
  - `Badge`（状态标签、计数标签）
  - `Dropdown` / `Select`
  - `Skeleton`（loading 占位）
- 现有业务组件逐步消费 UI 原语，减少样式重复

**影响范围：** 新建 `components/ui/`，逐步重构所有现有组件

---

### P1-FE-3：`⌘K` 全局搜索面板

> **修改难度：中** — 新建独立的 `CommandPalette` 组件，接入已有的 `GET /api/v1/search` API，改动范围清晰（组件 + `layout.tsx` 监听器），技术上无高风险点，但需处理键盘焦点管理、debounce、分类展示等细节。

**现状：** TopNav 中有 `⌘K` 视觉提示但无实际键盘快捷键绑定。`/search` 页面存在但需手动导航。

**目标：**
- 实现 `⌘K` / `Ctrl+K` 全局快捷键
- 弹出 Command Palette 样式的搜索面板（overlay modal）
- 支持实时搜索（debounce → `GET /api/v1/search`）
- 结果分类展示（Projects / Discussions / Creators）
- 回车导航到结果页

**影响范围：** 新建 `CommandPalette` 组件、`layout.tsx` 挂载键盘监听

---

### P1-FE-4：缺失的核心页面

> **修改难度：低** — 主要是新建 `/settings` 中心页（静态链接聚合）和添加 `/projects` 重定向，核心功能闭环确认仅需端到端测试验证，不需大量新增代码。

**现状：** 部分核心链路缺少前端页面：
- `/projects` 项目列表索引页不存在（仅有 `/discover`）
- `/settings` 设置中心页不存在（直接暴露子页面）
- `/projects/new` 和 `/projects/[slug]/edit` 虽有页面但功能连通性待确认

**目标：**
- `/settings` 创建设置中心页（链接到 subscription、api-keys、profile 等子页面）
- 确认 `/projects/new` → `POST /api/v1/projects` 全链路闭环
- 确认 `/projects/[slug]/edit` → `PATCH /api/v1/projects/[slug]` 全链路闭环
- 为 `/projects` 设置重定向到 `/discover`（或创建独立索引页）

**影响范围：** 新建/修改 2-3 个页面

---

### P1-BE-1：API 输入验证全面 Zod 化

> **修改难度：高** — 需要为约 70 个路由编写 Zod schema，工作量大且需要理解每个路由的业务逻辑与字段约束；同时要统一 OpenAPI requestBody schema，保持两者一致性。单个改动模式固定，但数量庞大，容易引入遗漏和不一致。

**现状：** 106 个路由中仅 ~31 个使用 Zod 验证。多数写路由使用手动 `if` 检查或不检查，存在：
- 类型不安全的输入直接传入 repository
- 不一致的错误响应格式
- 无法自动生成 API 文档中的 requestBody schema

**目标：**
- 为所有 POST/PATCH/PUT/DELETE 路由定义 Zod schema
- 在路由入口统一调用 `schema.safeParse(body)`
- 验证失败返回 400 + 结构化字段级错误信息
- 将 Zod schema 与 OpenAPI requestBody schema 对齐
- 建立约定：新路由必须先定义 Zod schema

**影响范围：** ~70 个路由文件，新建 `lib/schemas/` 目录

---

### P1-BE-2：Repository 错误处理全面铺开

> **修改难度：中** — 模式已有（`RepositoryError` / `apiErrorFromRepositoryCatch` 已定义），只需在全部路由中统一套用；关键风险是需正确映射各种 Prisma 错误码（P2002/P2025 等），避免暴露内部信息的同时不改变正确响应。

**现状：** `RepositoryError` + `apiErrorFromRepositoryCatch` 已定义但仅在少数路由使用。大部分路由仍然 catch 原始 Error + `error.message` 暴露。

**目标：**
- 所有 repository 函数对 Prisma 已知错误（P2002/P2025 等）统一映射为 `RepositoryError`
- 所有 route handler 统一使用 `apiErrorFromRepositoryCatch` 捕获
- 消除 500 响应中暴露 Prisma 内部错误信息的风险
- 建立代码审查规范：禁止在 route handler 中直接 `catch (e) { return apiError({ message: e.message }) }`

**影响范围：** `repository.ts`、`repositories/*.ts`、所有 route handler

---

### P1-BE-3：结构化日志系统

> **修改难度：中** — 引入 pino 并新建 `lib/logger.ts` 模块设计上不复杂，但需全量替换所有 `console.*` 调用，且要在每个请求上下文中正确传递 `requestId`，涉及中间件和多个 handler，改动点较分散。

**现状：** 全局使用 `console.log` / `console.error`，无结构化日志、无日志级别、无 correlation ID。生产环境排障困难。

**目标：**
- 引入轻量结构化日志库（如 pino）
- 每个请求携带 `requestId`（已在 API 响应中，需提升到日志上下文）
- 日志格式统一为 JSON（便于 ELK / CloudWatch 等采集）
- 关键操作（认证、支付、审核、权限拒绝）必须有 WARN/ERROR 级日志
- 替换所有 `console.*` 调用

**影响范围：** 新建 `lib/logger.ts`，全局替换 `console.*`

---

### P1-BE-4：WebSocket 与 MCP 进程生产化

> **修改难度：低** — 仅修改 `infra/` 目录下 3 个配置文件（PM2 ecosystem、nginx conf、docker-compose.yml），属于纯配置变更，不涉及业务逻辑，但需要对 nginx WebSocket 升级配置和 Redis 服务有一定运维知识。

**现状：** `ws-server.ts` 和 `mcp-server.ts` 无 PM2 配置、nginx 无 WebSocket 代理、Docker Compose 无 Redis。

**目标：**
- PM2 ecosystem 增加 `vibehub-ws` 和 `vibehub-mcp` 进程
- nginx 配置增加 WebSocket 升级代理（`/ws → 127.0.0.1:3001`）
- Docker Compose 增加 Redis 服务（用于 WS 多实例和 API 速率限制）
- nginx 增加基础 TLS 配置模板

**影响范围：** `infra/` 目录的 3 个配置文件

---

## P2：社区体验深化与后端加固

> 定义：建立与竞品（GitHub Discussions、Dev.to、Discord 开发者社区）的差异化优势。

### P2-FE-1：i18n 全面化

> **修改难度：高** — 需要抽取约 300-500 个硬编码字符串 key 并维护 EN/ZH 两套翻译，涉及所有页面和组件文件，工作量巨大；机制重构（从双语字符串到 key-based 查找）还需确保没有翻译遗漏和 key 冲突。

**现状：** `LanguageContext` + `t()` 机制存在但仅翻译了 TopNav/Footer（~2 个文件）。其余全部硬编码英文。`<html lang>` 不随语言切换。

**目标：**
- 引入 message catalog 机制（JSON 文件 per locale：`locales/en.json`、`locales/zh.json`）
- `t()` 改为基于 key 的查找（如 `t("discover.title")`）而非硬编码双语字符串
- 覆盖所有用户可见字符串（估计 ~300-500 个 key）
- `<html lang>` 随 `LanguageContext` 动态切换
- 持久化语言偏好到 localStorage / cookie

**影响范围：** `LanguageContext.tsx`、所有页面和组件文件

---

### P2-FE-2：无障碍（Accessibility）系统性提升

> **修改难度：高** — WCAG 2.1 AA 合规需要对全部交互组件进行系统性审计和改造，涵盖 ARIA 属性、焦点管理、键盘导航、颜色对比度等多维度；每个维度都需要专项知识，且难以通过简单的批量替换完成，需要逐组件验证。

**现状：** 部分 `aria-label` 零散存在，但缺乏系统性：
- 交互按钮缺少 `aria-expanded`、`aria-controls`
- 移动端菜单无焦点陷阱
- 无 Skip-to-content 链接
- Focus ring 不一致

**目标：**
- 达到 WCAG 2.1 AA 级标准
- 所有交互元素有语义化 ARIA 属性
- 键盘导航完整（Tab 顺序、ESC 关闭、Enter 确认）
- Skip-to-content 链接
- Focus ring 通过 UI 原语层统一
- 颜色对比度审计（特别是灰色文字在黑色背景上的 `#71717A` 可能不达标）

**影响范围：** 全部交互组件，`globals.css`

---

### P2-FE-3：用户个人资料中心

> **修改难度：中** — 需要新建前端页面 + 一个 API 路由 + profile repository，头像上传需要对接对象存储（与 P3-BE-3 文件上传有耦合），其他字段编辑逻辑清晰，整体改动边界明确。

**现状：** 有 `/creators/[slug]` 公开展示页，但缺少用户自己的设置/编辑中心。头像、个人介绍、社交链接等无编辑入口。

**目标：**
- `/settings/profile` 个人资料编辑页（头像上传、个人介绍、社交链接、技术栈标签）
- 配合 `PATCH /api/v1/me/profile` API
- 头像使用 Next.js Image 优化 + 上传到对象存储

**影响范围：** 新建 1 个页面 + 1 个 API 路由 + profile repository

---

### P2-FE-4：实时更新与 Optimistic UI 扩展

> **修改难度：中** — Optimistic UI 需要在多个组件中管理本地状态与服务端状态的同步，失败回滚逻辑复杂；SSE 替换轮询需要新建服务端流式端点；整体改动分散在多个组件，每项单独实现不难但组合测试有一定挑战。

**现状：** 仅团队聊天有 WebSocket 实时通信，通知使用 60s 轮询。其他场景（帖子点赞、新评论、团队任务变更）无实时反馈。

**目标：**
- 帖子/评论的点赞、收藏操作实现 Optimistic UI
- 通知使用 SSE（Server-Sent Events）替代轮询，减少无效请求
- 团队任务板支持实时变更推送（通过现有 WS 通道扩展）
- 讨论详情页评论列表支持新评论实时追加

**影响范围：** `PostSocialActions`、`CommentThread`、`TopNav` 通知、`TeamTasksPanel`

---

### P2-FE-5：Infinite Scroll 与高级分页

> **修改难度：低** — 后端 cursor 分页已就绪，前端只需基于 Intersection Observer 封装 `useInfiniteScroll` hook 并接入两个列表页；URL-based 分页保留逻辑和滚动位置恢复有一定细节，但整体复杂度可控。

**现状：** 发现页/讨论页使用传统 prev/next 分页按钮。后端已支持 cursor 分页。

**目标：**
- 为 Discover、Discussions 列表引入 Infinite Scroll（基于 Intersection Observer）
- 保留手动分页作为可选模式（URL-based，便于分享特定页面）
- 滚动位置恢复（浏览器后退时回到原位）

**影响范围：** Discover 页面、Discussions 页面，新建 `useInfiniteScroll` hook

---

### P2-BE-1：`repository.ts` 拆分重构

> **修改难度：高** — 7,342 行 / 145 个函数的文件拆分必须保证所有现有 import 路径正常工作（通过 facade re-export），且需要在重构过程中确保 mock 路径同步更新；任何遗漏都会导致运行时错误，回归测试量大，是代码库风险最高的重构之一。

**现状：** `repository.ts` 有 7,342 行、145 个导出函数。这是整个代码库最大的技术债：
- Code review 几乎不可能有效进行
- Mock 和 Prisma 路径的行为一致性无法可靠保证
- 新功能添加只会让文件继续膨胀

**目标：**
- 按领域拆分为独立模块（已有 `repositories/` 目录可继续扩展）：
  - `auth.repository.ts` — session/API key 相关
  - `post.repository.ts` — 帖子 CRUD + 搜索
  - `user.repository.ts` — 用户 profile + follow + 信誉
  - `notification.repository.ts` — 通知 CRUD
  - `admin.repository.ts` — 管理后台逻辑
  - `mcp.repository.ts` — MCP 工具逻辑
- 保留 `repository.ts` 作为 re-export facade（向后兼容）
- 每个模块独立管理 mock 数据（`__mocks__/` 子目录）

**影响范围：** `repository.ts` → 8-10 个独立模块

---

### P2-BE-2：Mock 数据层现代化

> **修改难度：高** — 需要为每个 repository 设计并实现 Interface + Prisma 实现 + Mock 实现三层结构，并重写全部 repository 函数；架构级重构，需在 P2-BE-1 拆分完成后进行，否则改动对象本身就是不稳定的。

**现状：** `isMockDataEnabled()` 在每个 repository 函数中做 if/else 分支。mock 和真实路径的行为漂移风险极高。

**目标：**
- 引入 Repository Interface Pattern：定义 `IPostRepository` 等接口
- `PrismaPostRepository` 和 `MockPostRepository` 分别实现
- 通过依赖注入（简单的工厂函数）在启动时选择实现
- Mock 实现与 Prisma 实现完全隔离，消除 if/else 嵌套
- 为每个 repository 接口添加 contract test（同一套测试跑两个实现）

**影响范围：** 全部 repository 代码，架构级重构

---

### P2-BE-3：数据库约束加强

> **修改难度：中** — Prisma schema 修改本身不复杂，但每个 String→enum 变更都需要生成对应的 migration，并确认生产数据库中的现有数据能正常迁移；需要审计所有 `String` 字段，涉及字段数量多，逐一评估有一定工作量。

**现状：** 部分字段使用 `String` 类型存储枚举值（如 `ReportTicket.status`、`EnterpriseMemberInvite.status`），缺乏数据库层约束。

**目标：**
- 将 String 枚举改为 Prisma enum 类型（`ReportStatus`、`InviteStatus` 等）
- 为 `ModerationCase` 等多态引用添加 CHECK 约束
- 审计所有 `String` 字段，确认是否应该有长度限制或格式约束
- 添加数据库层的 NOT NULL 约束（对于逻辑上不应为空的字段）

**影响范围：** `schema.prisma` + migration，相关 repository 代码

---

### P2-BE-4：API 速率限制细化

> **修改难度：中** — 现有速率限制基础设施已存在，主要工作是在 `middleware.ts` 中扩展 per-route 差异化配置，豁免 Stripe webhook，并添加 GET 请求限制；逻辑改动集中，但配置项多且需在生产环境中谨慎验证阈值的合理性。

**现状：** 写操作 30/min per IP（middleware），API key 通用限制（Redis/memory）。但：
- GET 请求无速率限制（可被爬虫滥用）
- 无 per-route 差异化限制（搜索 vs 列表 vs 详情）
- Stripe webhook 受同一 IP 限制（可能影响 Stripe 重试）

**目标：**
- 为 GET 请求添加宽松限制（如 300/min per IP）
- 搜索路由更严格限制（如 60/min）
- Stripe webhook 路由豁免 IP 限制（通过签名验证代替）
- 基于 API key 的 per-scope 限制（`read:public` 较宽松，`write:*` 较严格）
- 所有限制可通过环境变量配置

**影响范围：** `middleware.ts`、`redis-rate-limit.ts`、`billing/webhook/route.ts`

---

### P2-BE-5：E2E 测试覆盖度跃升

> **修改难度：高** — 需要为 5 条核心链路编写 5-8 个 Playwright spec，每个 spec 都要考虑测试数据的创建/清理、认证状态管理、异步操作等；E2E 测试调试耗时，且 CI 中运行真实 DB 需要额外配置，整体工程量大。

**现状：** Playwright 仅 1 个 spec 文件（`core-flows.spec.ts`），覆盖面极为有限。

**目标：**
- 核心链路 E2E：注册 → 创建 Profile → 发布项目 → 提交协作意向
- 团队链路 E2E：创建团队 → 入队申请 → 审批 → 创建任务 → 完成任务
- 讨论链路 E2E：发帖 → 评论 → 回复 → 编辑 → 删除
- Admin 链路 E2E：审核帖子 → 审核企业认证
- 错误场景：403/404/429 的用户体验验证
- CI 中 E2E 使用真实 DB（已有 Postgres service container）

**影响范围：** `tests/e2e/` 新增 5-8 个 spec 文件

---

## P3：平台能力扩张与生态建设

> 定义：从"好用的工具"演进为"有生态的平台"，吸引第三方开发者接入。

### P3-FE-1：主题系统 — Light/Dark 切换

> **修改难度：高** — 需要在 `globals.css` 中为所有 CSS 变量定义双套配色，并审查全部组件确保无硬编码颜色；依赖 P1-FE-1 设计系统统一先完成，否则 light/dark 切换会继承现有三套设计语言的混乱；此外 SSR 水合时的主题闪烁（FOUC）处理也有一定技术复杂度。

**现状：** `<html className="dark">` 硬编码，纯暗色模式，无切换能力。

**目标：**
- 支持 Light / Dark / System 三档主题
- 通过 CSS variables 切换（`:root` vs `.dark` 选择器）
- 用户偏好持久化到 localStorage
- 所有 UI 原语支持两套配色
- 营销页（Home/Pricing）可以使用与应用不同的主题策略

**影响范围：** `globals.css` 大幅重构、所有组件审查

---

### P3-FE-2：富文本编辑器

> **修改难度：高** — 选型和集成富文本编辑器本身已有相当复杂度（Tiptap/Milkdown 配置），代码块高亮、图片粘贴上传、实时预览等特性各需单独集成和调试；编辑器内容的存储格式（Markdown vs HTML vs JSON）还会影响后端接口设计。

**现状：** 讨论发帖和评论使用纯文本 textarea，无格式化能力。

**目标：**
- 为讨论发帖引入 Markdown 编辑器（实时预览）
- 支持代码块高亮（对开发者社区至关重要）
- 支持图片上传（粘贴/拖放）
- 评论支持内联 Markdown
- 可选方案：Tiptap / Milkdown / Monaco（代码场景）

**影响范围：** 新建编辑器组件、讨论新建/编辑页面、评论组件

---

### P3-FE-3：项目 README / 文档展示

> **修改难度：中** — 核心是在项目详情页添加 Markdown 渲染标签页；如果引入 GitHub 自动同步则需要 GitHub API 集成（与 P3-BE-5 重叠），若只做手动 README 字段则改动非常轻量；依赖 P3-FE-2 的 Markdown 渲染器。

**现状：** 项目详情页展示基础信息，但无法展示项目 README 或文档。

**目标：**
- 项目详情页支持 Markdown 渲染的 README 标签页
- 可选从 GitHub 同步 README
- 支持基础的代码片段高亮展示

**影响范围：** 项目详情页 + Markdown 渲染器

---

### P3-FE-4：通知偏好设置

> **修改难度：低** — 需要新建一个 `/settings/notifications` 页面 + API 路由 + `NotificationPreference` 数据模型；各层改动相互独立，模式清晰（增删改查），无复杂的业务逻辑或并发问题。

**现状：** 通知全量推送，用户无法选择性订阅/退订。

**目标：**
- `/settings/notifications` 通知偏好页
- 按类别开关：评论回复、团队动态、协作审核、系统公告
- 配合后端 `NotificationPreference` 模型

**影响范围：** 新建 1 个设置页面 + API + 数据模型

---

### P3-BE-1：异步任务队列

> **修改难度：高** — 引入任务队列是基础设施级变更，需要选型（pg-boss vs BullMQ）、设计任务 schema、实现重试与幂等性，并重构现有 webhook/email/credit 同步逻辑为异步任务；系统性改动，任何遗漏都可能导致静默失败。

**现状：** 所有操作同步执行，包括 webhook 分发、邮件发送、贡献积分计算等。

**目标：**
- 引入轻量任务队列（pg-boss 基于 PostgreSQL，或 BullMQ 基于 Redis）
- 迁移以下操作到异步：
  - Webhook 事件分发 + 重试
  - Email 通知发送
  - 贡献积分增量计算
  - 排行榜物化
- 任务执行状态可在 admin 面板查看

**影响范围：** 新建 `lib/queue/`、重构 webhook/email/credit 逻辑

---

### P3-BE-2：API 版本化策略

> **修改难度：中** — 策略文档部分复杂度低，但实现 `Accept-Version` header 路由或 `/api/v2` 路径分发需要设计路由层的版本分发机制；OpenAPI spec 按版本独立维护和客户端 SDK 生成各自有一定工程成本，整体中等难度。

**现状：** 所有 API 在 `/api/v1` 下，但无版本演进策略。一旦需要 breaking change 无应对方案。

**目标：**
- 制定 API 版本化策略文档：
  - 向后兼容变更直接在 v1 中发布
  - Breaking change 需要新版本号
  - 旧版本支持周期（最少 6 个月）
- API 路由支持 `Accept-Version` header 或 `/api/v2` 路径
- OpenAPI spec 按版本独立维护
- 客户端 SDK（生成类型文件）按版本发布

**影响范围：** 文档 + 路由结构设计

---

### P3-BE-3：文件上传与媒体管理

> **修改难度：高** — 涉及对象存储选型与集成（S3/R2/MinIO）、预签名 URL 机制、服务端图片校验与缩略图生成、CDN 配置，以及前端多个上传入口的改造；每个环节都有独立的复杂度，且需要处理上传失败、文件类型绕过等安全问题。

**现状：** 无文件上传能力。项目截图、用户头像等均为外部 URL 引用。

**目标：**
- 集成对象存储（S3 / R2 / MinIO）
- 签名上传 URL 机制（`POST /api/v1/uploads/presign`）
- 图片尺寸/格式校验 + 缩略图生成
- 用户头像、项目截图、团队 logo 的上传闭环
- CDN 分发

**影响范围：** 新建上传路由 + lib/storage + 多个前端组件

---

### P3-BE-4：Webhook 系统通用化

> **修改难度：中** — 模型已存在，主要工作是扩展事件类型枚举、实现 HMAC 签名、开发重试逻辑（需要与 P3-BE-1 任务队列配合）、新建管理页面；各模块改动边界清晰，但事件分发层重构需要梳理所有触发点，有一定系统性工作量。

**现状：** `WebhookEndpoint` 模型已存在但功能有限，仅支持通知事件。

**目标：**
- 支持完整的事件类型（`post.created`、`project.updated`、`team.member_joined` 等）
- 用户可在 `/settings/webhooks` 管理 webhook 端点
- Webhook 请求包含 HMAC 签名（`X-VibeHub-Signature`）
- 失败重试（3 次，指数退避）+ delivery log
- Webhook 测试端点（`POST /api/v1/me/webhooks/:id/test`）
- OpenAPI 文档完整覆盖 event payload schema

**影响范围：** 扩展现有 webhook 模型、新建管理页面、事件分发层重构

---

### P3-BE-5：GitHub 集成深化

> **修改难度：中** — README 同步和 stats 展示扩展属于对已有集成的扩展，GitHub API 调用逻辑模式明确；接收 GitHub webhook events 需要新建端点并处理 event routing，整体改动范围明确，无重大架构风险。

**现状：** 仅 OAuth 登录 + 项目 GitHub stats 展示。

**目标：**
- 项目关联 GitHub repo 后自动同步 README、Stars、Forks
- 可选：PR/Issue 活跃度指标展示
- 可选：webhook 接收 GitHub events（push、release）触发项目状态更新

**影响范围：** 新建 GitHub API 集成模块、项目模型扩展

---

## P4：基础设施与长期技术投资

> 定义：支撑平台长期运营的技术底座，不直接面向用户但决定平台可持续性。

### P4-BE-1：可观测性平台

> **修改难度：高** — 集成 OpenTelemetry SDK + Jaeger/Grafana 需要部署和配置监控基础设施，在代码中插桩 tracing/metrics，设计 dashboard 和告警规则；跨越代码、部署、运维三个层面，任一层面配置错误都会导致数据丢失或误报。

**现状：** 无 APM、无 metrics、无告警。结构化日志在 P1 引入但仍需采集和分析。

**目标：**
- 集成 APM（OpenTelemetry SDK → Jaeger/Grafana Tempo）
- 关键业务指标 metrics（注册转化率、帖子发布量、API 调用量）
- 告警规则（5xx 率、延迟 P99、队列积压）
- Grafana dashboard（或等效的可视化方案）
- 运行时 health 检查增强（`/api/v1/health` 增加 DB/Redis/WS 连通性检查）

**影响范围：** 新建 `lib/telemetry/`，部署基建配置

---

### P4-BE-2：数据库查询性能基线

> **修改难度：中** — 开启 Prisma query logging 和慢查询告警是配置级改动；`EXPLAIN ANALYZE` 集成到 CI 需要一定脚本工程量；索引使用率审计和连接池监控是数据库运维知识密集型任务，需要具体解读 `pg_stat_user_indexes` 数据。

**现状：** 无查询性能监控，不知道哪些查询慢、哪些索引无效。

**目标：**
- 为核心查询建立性能基线（`EXPLAIN ANALYZE` 集成到 CI 或 staging）
- Prisma query logging in development（`log: ['query']`）
- 慢查询告警（> 200ms 的查询记录到日志）
- 索引使用率审计（`pg_stat_user_indexes`）
- 连接池监控（活跃/空闲连接数）

**影响范围：** `db.ts` 配置增强、运维脚本

---

### P4-BE-3：CI/CD 流水线增强

> **修改难度：中** — 每项增强（E2E stage、漏洞扫描、secret 扫描、bundle size、Lighthouse CI）都是在 `.github/workflows/` 中添加独立 job，模式固定；主要挑战是 Playwright E2E 在 CI 中的环境配置（数据库、headless Chrome），其余项是工具集成。

**现状：** CI 已覆盖 lint + test + build + OpenAPI 验证，但缺少：
- E2E 测试未在 CI 中运行
- 无安全扫描
- 无依赖漏洞检查
- 无性能回归检测

**目标：**
- CI 增加 Playwright E2E stage（headless Chrome）
- 依赖漏洞扫描（`npm audit` / Snyk / Trivy）
- Secret 泄露扫描（gitleaks / truffleHog）
- Bundle size 监控（`next build` 输出 size 对比）
- Lighthouse CI（核心页面性能评分门禁）

**影响范围：** `.github/workflows/`

---

### P4-BE-4：多环境配置管理

> **修改难度：低** — 主要是新建 `.env.*` 模板文件和编写启动时配置校验脚本（检查必需变量），改动完全集中在配置和文档层面，不涉及业务逻辑，风险极低。

**现状：** 仅有 `.env.example`，无 staging/production 环境配置区分。

**目标：**
- 建立 `.env.development` / `.env.staging` / `.env.production` 模板
- 敏感配置通过环境变量注入（已是当前模式），但增加启动时校验（缺失必需变量时拒绝启动）
- 配置项文档化（每个环境变量的用途、默认值、是否必需）
- Docker Compose 分环境（dev 含 mock data、staging 含完整基建）

**影响范围：** `.env.*` 模板、启动校验脚本、文档

---

### P4-FE-1：前端性能优化

> **修改难度：中** — 移除 `unoptimized` 属性和添加 `next/dynamic` 懒加载模式清晰；`template.tsx` 全局动画的重构需要谨慎评估对所有页面过渡的影响；Core Web Vitals 基线建立属于测量性工作；PWA 支持（Service Worker）若纳入则复杂度上升。

**现状：**
- `template.tsx` 将全部页面包裹在 Framer Motion client component 中，破坏 Server Components 的流式 SSR 优势
- 项目卡片使用 `unoptimized` 属性跳过 Next.js 图片优化
- 无代码分割（`next/dynamic` / `React.lazy`）
- 无 Service Worker / PWA 能力

**目标：**
- 将 `template.tsx` 的全局动画改为可选或仅对特定路由生效
- 移除 `unoptimized` 属性，配置 `next.config.ts` 的 `images.remotePatterns`
- 对大型组件（编辑器、图表、Admin 面板）使用 `next/dynamic` 懒加载
- Core Web Vitals 基线建立（LCP < 2.5s、FID < 100ms、CLS < 0.1）
- 考虑 PWA 支持（Service Worker、离线阅读缓存、推送通知）

**影响范围：** `template.tsx`、`next.config.ts`、大型组件

---

### P4-FE-2：前端状态管理演进

> **修改难度：中** — 引入 SWR 或 TanStack Query 本身成熟稳定，但需要重构所有客户端 fetch 调用为 hooks 形式，涉及改动点分散；Optimistic Updates 和缓存失效策略需要仔细设计，避免引入数据不一致问题。

**现状：** 仅 React Context（AuthContext + LanguageContext），无服务端状态缓存。每次页面导航都重新请求数据。

**目标：**
- 引入轻量级服务端状态管理（SWR 或 TanStack Query）
- 核心收益：请求去重、缓存、后台刷新、Optimistic Updates、离线支持
- 重构高频数据获取（通知轮询、列表页、详情页）使用 hooks
- 减少不必要的 network waterfall

**影响范围：** 新增依赖、重构所有客户端 fetch 调用

---

## 执行优先级汇总表

> **修改难度说明：** 三档划分综合考量改动范围广度、技术复杂度、跨模块协调成本及回归风险。
> - 🟢 **低**：改动范围集中或模式固定，风险可控，无需跨模块协调
> - 🟡 **中**：改动点分散或需一定技术深度，但边界清晰，可分步推进
> - 🔴 **高**：涉及架构级重构、大量文件变更或多系统协调，回归测试量大

| 编号 | 任务 | 优先级 | 领域 | 修改难度 | 依赖 |
|------|------|--------|------|----------|------|
| P0-BE-1 | Session 服务端吊销能力 | 🔴 P0 | 后端安全 | 🟢 低 | — |
| P0-BE-2 | CSRF 防护加固 | 🔴 P0 | 后端安全 | 🟡 中 | — |
| P0-BE-3 | Admin 路由边缘验证加强 | 🔴 P0 | 后端安全 | 🟢 低 | — |
| P0-FE-1 | 自定义 Error/Not-Found/Loading 页面 | 🔴 P0 | 前端基础 | 🟢 低 | — |
| P0-FE-2 | Toast 通知系统 | 🔴 P0 | 前端基础 | 🟡 中 | — |
| P0-FE-3 | Footer 占位链接清理 | 🔴 P0 | 前端基础 | 🟢 低 | — |
| P1-FE-1 | 设计系统统一 | 🟠 P1 | 前端设计 | 🔴 高 | P0-FE-1/2 |
| P1-FE-2 | 共享 UI 原语层 | 🟠 P1 | 前端架构 | 🔴 高 | P1-FE-1 |
| P1-FE-3 | ⌘K 全局搜索面板 | 🟠 P1 | 前端功能 | 🟡 中 | P1-FE-2 |
| P1-FE-4 | 缺失核心页面补全 | 🟠 P1 | 前端功能 | 🟢 低 | — |
| P1-BE-1 | API 输入验证全面 Zod 化 | 🟠 P1 | 后端健壮性 | 🔴 高 | — |
| P1-BE-2 | Repository 错误处理全面铺开 | 🟠 P1 | 后端健壮性 | 🟡 中 | — |
| P1-BE-3 | 结构化日志系统 | 🟠 P1 | 后端可维护性 | 🟡 中 | — |
| P1-BE-4 | WS/MCP 进程生产化 | 🟠 P1 | 部署基建 | 🟢 低 | — |
| P2-FE-1 | i18n 全面化 | 🟡 P2 | 前端国际化 | 🔴 高 | — |
| P2-FE-2 | 无障碍系统性提升 | 🟡 P2 | 前端可用性 | 🔴 高 | P1-FE-2 |
| P2-FE-3 | 用户个人资料中心 | 🟡 P2 | 前端功能 | 🟡 中 | — |
| P2-FE-4 | 实时更新与 Optimistic UI | 🟡 P2 | 前端体验 | 🟡 中 | — |
| P2-FE-5 | Infinite Scroll | 🟡 P2 | 前端体验 | 🟢 低 | — |
| P2-BE-1 | `repository.ts` 拆分重构 | 🟡 P2 | 后端架构 | 🔴 高 | — |
| P2-BE-2 | Mock 数据层现代化 | 🟡 P2 | 后端架构 | 🔴 高 | P2-BE-1 |
| P2-BE-3 | 数据库约束加强 | 🟡 P2 | 数据完整性 | 🟡 中 | — |
| P2-BE-4 | API 速率限制细化 | 🟡 P2 | 后端安全 | 🟡 中 | — |
| P2-BE-5 | E2E 测试覆盖度跃升 | 🟡 P2 | 质量保障 | 🔴 高 | — |
| P3-FE-1 | 主题系统 Light/Dark 切换 | 🟢 P3 | 前端设计 | 🔴 高 | P1-FE-1 |
| P3-FE-2 | 富文本编辑器 | 🟢 P3 | 前端功能 | 🔴 高 | — |
| P3-FE-3 | 项目 README/文档展示 | 🟢 P3 | 前端功能 | 🟡 中 | P3-FE-2 |
| P3-FE-4 | 通知偏好设置 | 🟢 P3 | 前端功能 | 🟢 低 | — |
| P3-BE-1 | 异步任务队列 | 🟢 P3 | 后端架构 | 🔴 高 | — |
| P3-BE-2 | API 版本化策略 | 🟢 P3 | 后端架构 | 🟡 中 | — |
| P3-BE-3 | 文件上传与媒体管理 | 🟢 P3 | 后端功能 | 🔴 高 | — |
| P3-BE-4 | Webhook 系统通用化 | 🟢 P3 | 后端功能 | 🟡 中 | P3-BE-1 |
| P3-BE-5 | GitHub 集成深化 | 🟢 P3 | 后端功能 | 🟡 中 | — |
| P4-BE-1 | 可观测性平台 | 🔵 P4 | 基建 | 🔴 高 | P1-BE-3 |
| P4-BE-2 | 数据库查询性能基线 | 🔵 P4 | 基建 | 🟡 中 | — |
| P4-BE-3 | CI/CD 流水线增强 | 🔵 P4 | 基建 | 🟡 中 | P2-BE-5 |
| P4-BE-4 | 多环境配置管理 | 🔵 P4 | 基建 | 🟢 低 | — |
| P4-FE-1 | 前端性能优化 | 🔵 P4 | 前端性能 | 🟡 中 | — |
| P4-FE-2 | 前端状态管理演进 | 🔵 P4 | 前端架构 | 🟡 中 | — |

---

## 与后端优化路线图 v1.0 的关系

本文档（v5.0）是在后端优化路线图 v1.0（`docs/08_backend_optimization_roadmap.md`）基础上的**全面扩展**：

| 维度 | v1.0 后端优化路线图 | v5.0 本文档 |
|------|-------------------|------------|
| 覆盖范围 | 仅后端 | 前端 + 后端 + 基建 + 设计 |
| 已完成项处理 | 标注 ✅ 保留 | 仅规划未完成项，已完成项不重复 |
| P0 安全项 | 4 项（P0-1 ~ P0-4，已标注完成） | 新增 3 项后端安全 + 3 项前端基线 |
| 前端审计 | 无 | 完整的 34 页面 + 33 组件 + 设计系统审计 |
| 设计一致性 | 未涉及 | DESIGN.md vs globals.css 冲突分析 + 统一方案 |

v1.0 中标注"已完成"的 P0-1 ~ P0-4、P1-1 ~ P1-7、P2-1 ~ P2-6、P3-1 ~ P3-5、P4-1 ~ P4-4 **不再重复列入**本路线图。本文档聚焦尚未规划或尚未实现的演进方向。

---

## 配套文档索引

| 文档 | 用途 |
|------|------|
| `docs/roadmap-current.md` | 当前战略方向（存量） |
| `docs/roadmap-history.md` | 历史规划（归档） |
| `docs/release-notes.md` | 发布与变更记录 |
| `docs/08_backend_optimization_roadmap.md` | 后端优化路线图 v1.0（存量，含已完成标注） |
| `docs/roadmap-v5.md` | **本文档 — v5.0 全栈演进路线图** |
| `docs/04_frontend_backend_mapping.md` | 前后端映射审计 |
| `docs/05_no_fake_feature_checklist.md` | 功能真实性审计 |
| `docs/06_openapi_route_audit.md` | OpenAPI 路由审计 |
| `docs/07_mcp_capability_matrix.md` | MCP 能力矩阵 |
