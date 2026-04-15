# VibeHub Roadmap v6.0 — 全栈演进路线图（阶段 × 难度矩阵）

> 基于 v5.0 路线图 + 后端优化路线图 v1.0 + 项目计划书 v4.0 + 成熟度收敛审计  
> 规划日期：2026-04-15  
> 视角：按交付阶段（P0→P4）× 难度等级（普通/复杂）组织，明确优先级与执行顺序  
> 状态：**规划文档——指导后续迭代执行**

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

| 编号 | 任务 | 领域 | 主线 | 依赖 | 说明 |
|------|------|------|------|------|------|
| P1-FE-4 | 缺失核心页面补全 | 前端功能 | 主线①② | — | `/settings` 设置中心页；确认 `/projects/new` 和 `/projects/[slug]/edit` 全链路闭环；`/projects` 重定向或独立索引页 |
| P1-BE-3 | 结构化日志系统 | 后端可维护性 | 全局 | — | pino 替换 `console.*`；`requestId` 关联；JSON 格式；关键操作 WARN/ERROR 日志 |
| P1-BE-4 | WS/MCP 进程生产化 | 部署基建 | 主线③ | — | PM2 增加 `vibehub-ws` 和 `vibehub-mcp`；nginx WebSocket 代理；Docker Compose 增 Redis；TLS 模板 |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 依赖 | 说明 |
|------|------|------|------|------|------|
| P1-FE-1 | 设计系统统一 — 消除 DESIGN.md 与实现分裂 | 前端设计 | 全局 | P0-FE-1/2 | 选定一套设计语言为权威标准（Monochrome Geek v2）；`DESIGN.md` 与 `globals.css` 完全对齐；Collections/Challenges 迁移到统一风格；建立设计 token 单一真相源 |
| P1-FE-2 | 共享 UI 原语层 | 前端架构 | 全局 | P1-FE-1 | `components/ui/` 目录：Button、Input/Textarea、Modal/Dialog、Card、Badge、Dropdown/Select、Skeleton；现有业务组件逐步消费 UI 原语 |
| P1-FE-3 | `⌘K` 全局搜索面板 | 前端功能 | 主线①② | P1-FE-2 | Command Palette 实现；实时 debounce 搜索；结果分类（Projects/Discussions/Creators）；回车导航 |
| P1-BE-1 | API 输入验证全面 Zod 化 | 后端健壮性 | 全局 | — | ~70 个路由定义 Zod schema；统一 `safeParse` 入口；400 + 字段级错误；与 OpenAPI requestBody schema 对齐；`lib/schemas/` 目录 |
| P1-BE-2 | Repository 错误处理全面铺开 | 后端健壮性 | 全局 | — | Prisma 已知错误统一映射 `RepositoryError`；route handler 统一 `apiErrorFromRepositoryCatch`；消除 500 暴露内部错误 |

---

## P2：社区体验深化与后端加固

> **定义：** 建立与竞品（GitHub Discussions、Dev.to、Discord）的差异化优势。

### 普通任务 🟢

| 编号 | 任务 | 领域 | 主线 | 依赖 | 说明 |
|------|------|------|------|------|------|
| P2-FE-3 | 用户个人资料中心 | 前端功能 | 主线① | — | `/settings/profile` 编辑页（头像上传、介绍、社交链接、技术栈标签）；`PATCH /api/v1/me/profile`；Next.js Image 优化 |
| P2-FE-5 | Infinite Scroll 与高级分页 | 前端体验 | 主线① | — | Discover/Discussions 引入 Intersection Observer 无限滚动；保留 URL-based 手动分页；滚动位置恢复 |
| P2-BE-3 | 数据库约束加强 | 数据完整性 | 全局 | — | String 枚举改 Prisma enum；CHECK 约束；字段长度/格式约束；NOT NULL 审计 |
| P2-BE-4 | API 速率限制细化 | 后端安全 | 主线③ | — | GET 宽松限制 300/min；搜索 60/min；Stripe webhook 豁免；per-scope 限制；环境变量可配 |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 依赖 | 说明 |
|------|------|------|------|------|------|
| P2-FE-1 | i18n 全面化 | 前端国际化 | 全局 | — | JSON message catalog（`locales/en.json`、`locales/zh.json`）；`t()` 改 key-based；覆盖全部用户可见字符串 ~300-500 key；`<html lang>` 动态切换；语言偏好持久化 |
| P2-FE-2 | 无障碍（Accessibility）系统性提升 | 前端可用性 | 全局 | P1-FE-2 | WCAG 2.1 AA；语义化 ARIA 属性；键盘导航完整；Skip-to-content；统一 Focus ring；颜色对比度审计 |
| P2-FE-4 | 实时更新与 Optimistic UI 扩展 | 前端体验 | 主线①② | — | 帖子/评论 Optimistic UI（点赞/收藏）；通知 SSE 替代轮询；任务板 WS 实时推送；评论实时追加 |
| P2-BE-1 | `repository.ts` 拆分重构 | 后端架构 | 全局 | — | 7342 行 → 按领域拆 8-10 个模块（`auth.repository.ts`、`post.repository.ts` 等）；保留 re-export facade；独立 mock 数据 |
| P2-BE-2 | Mock 数据层现代化 | 后端架构 | 全局 | P2-BE-1 | Repository Interface Pattern；`PrismaXxxRepository` + `MockXxxRepository` 分离；工厂函数 DI；contract test |
| P2-BE-5 | E2E 测试覆盖度跃升 | 质量保障 | 全局 | — | 核心链路/团队链路/讨论链路/Admin链路 E2E；错误场景 403/404/429；CI 真实 DB；新增 5-8 个 spec |

---

## P3：平台能力扩张与生态建设

> **定义：** 从"好用的工具"演进为"有生态的平台"，吸引第三方开发者接入。

### 普通任务 🟢

| 编号 | 任务 | 领域 | 主线 | 依赖 | 说明 |
|------|------|------|------|------|------|
| P3-FE-3 | 项目 README/文档展示 | 前端功能 | 主线① | P3-FE-2 | 项目详情页 Markdown README 标签页；可选 GitHub 同步；代码片段高亮 |
| P3-FE-4 | 通知偏好设置 | 前端功能 | 主线②③ | — | `/settings/notifications`；按类别开关（评论回复、团队动态、协作审核、系统公告）；`NotificationPreference` 模型 |
| P3-BE-2 | API 版本化策略 | 后端架构 | 主线③ | — | 策略文档（向后兼容 / breaking change 新版本 / 旧版支持周期）；`Accept-Version` header 或 `/api/v2` 路径；按版本 OpenAPI spec |
| P3-BE-5 | GitHub 集成深化 | 后端功能 | 主线① | — | 项目关联 GitHub repo 自动同步 README/Stars/Forks；可选 PR/Issue 活跃度指标；webhook 接收 GitHub events |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 依赖 | 说明 |
|------|------|------|------|------|------|
| P3-FE-1 | 主题系统 — Light/Dark 切换 | 前端设计 | 全局 | P1-FE-1 | Light/Dark/System 三档；CSS variables `:root` vs `.dark`；用户偏好持久化；全部 UI 原语两套配色 |
| P3-FE-2 | 富文本编辑器 | 前端功能 | 主线① | — | Markdown 编辑器（实时预览）；代码块高亮；图片上传（粘贴/拖放）；评论内联 Markdown；Tiptap/Milkdown/Monaco 选型 |
| P3-BE-1 | 异步任务队列 | 后端架构 | 全局 | — | pg-boss（基于 PostgreSQL）或 BullMQ（基于 Redis）；webhook 分发 + 重试、email 发送、积分计算、排行榜物化迁移到异步；admin 面板查看任务状态 |
| P3-BE-3 | 文件上传与媒体管理 | 后端功能 | 主线①② | — | S3/R2/MinIO 集成；签名上传 URL（`POST /api/v1/uploads/presign`）；图片校验 + 缩略图生成；头像/截图/logo 上传闭环；CDN 分发 |
| P3-BE-4 | Webhook 系统通用化 | 后端功能 | 主线③ | P3-BE-1 | 完整事件类型（`post.created`、`project.updated`、`team.member_joined` 等）；`/settings/webhooks` 管理页；HMAC 签名；失败重试 3 次指数退避；delivery log；测试端点 |

---

## P4：基础设施与长期技术投资

> **定义：** 支撑平台长期运营的技术底座，不直接面向用户但决定平台可持续性。

### 普通任务 🟢

| 编号 | 任务 | 领域 | 主线 | 依赖 | 说明 |
|------|------|------|------|------|------|
| P4-BE-2 | 数据库查询性能基线 | 基建 | 全局 | — | `EXPLAIN ANALYZE` 集成 CI/staging；Prisma query logging；慢查询告警 >200ms；索引使用率审计；连接池监控 |
| P4-BE-4 | 多环境配置管理 | 基建 | 全局 | — | `.env.development/.staging/.production` 模板；启动时必需变量校验；配置项文档化；Docker Compose 分环境 |

### 复杂任务 🔴

| 编号 | 任务 | 领域 | 主线 | 依赖 | 说明 |
|------|------|------|------|------|------|
| P4-BE-1 | 可观测性平台 | 基建 | 全局 | P1-BE-3 | OpenTelemetry SDK → Jaeger/Grafana Tempo；业务 metrics（注册转化率、发布量、API 调用量）；告警规则（5xx 率、P99 延迟、队列积压）；Grafana dashboard；health 增强（DB/Redis/WS 连通性） |
| P4-BE-3 | CI/CD 流水线增强 | 基建 | 全局 | P2-BE-5 | Playwright E2E 纳入 CI；依赖漏洞扫描（`npm audit`/Snyk/Trivy）；Secret 扫描（gitleaks/truffleHog）；Bundle size 监控；Lighthouse CI 性能门禁 |
| P4-FE-1 | 前端性能优化 | 前端性能 | 全局 | — | `template.tsx` 全局动画改可选；移除 `unoptimized`；`next/dynamic` 懒加载大型组件；Core Web Vitals 基线（LCP <2.5s、FID <100ms、CLS <0.1）；PWA 可选 |
| P4-FE-2 | 前端状态管理演进 | 前端架构 | 全局 | — | SWR 或 TanStack Query；请求去重/缓存/后台刷新/Optimistic Updates；重构高频数据获取；减少 network waterfall |

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
| **P1** | P1-FE-1 | 设计系统统一 | 🔴 | 前端设计 | 全局 | P0-FE-1/2 | 待执行 |
| | P1-FE-2 | 共享 UI 原语层 | 🔴 | 前端架构 | 全局 | P1-FE-1 | 待执行 |
| | P1-FE-3 | ⌘K 全局搜索面板 | 🔴 | 前端功能 | ①② | P1-FE-2 | 待执行 |
| | P1-FE-4 | 缺失核心页面补全 | 🟢 | 前端功能 | ①② | — | 待执行 |
| | P1-BE-1 | API 全面 Zod 化 | 🔴 | 后端健壮性 | 全局 | — | 待执行 |
| | P1-BE-2 | Repository 错误处理 | 🔴 | 后端健壮性 | 全局 | — | 待执行 |
| | P1-BE-3 | 结构化日志系统 | 🟢 | 后端可维护性 | 全局 | — | 待执行 |
| | P1-BE-4 | WS/MCP 生产化 | 🟢 | 部署基建 | ③ | — | 待执行 |
| **P2** | P2-FE-1 | i18n 全面化 | 🔴 | 前端国际化 | 全局 | — | 待执行 |
| | P2-FE-2 | 无障碍提升 | 🔴 | 前端可用性 | 全局 | P1-FE-2 | 待执行 |
| | P2-FE-3 | 个人资料中心 | 🟢 | 前端功能 | ① | — | 待执行 |
| | P2-FE-4 | Optimistic UI 扩展 | 🔴 | 前端体验 | ①② | — | 待执行 |
| | P2-FE-5 | Infinite Scroll | 🟢 | 前端体验 | ① | — | 待执行 |
| | P2-BE-1 | repository.ts 拆分 | 🔴 | 后端架构 | 全局 | — | 待执行 |
| | P2-BE-2 | Mock 数据层现代化 | 🔴 | 后端架构 | 全局 | P2-BE-1 | 待执行 |
| | P2-BE-3 | 数据库约束加强 | 🟢 | 数据完整性 | 全局 | — | 待执行 |
| | P2-BE-4 | API 速率限制细化 | 🟢 | 后端安全 | ③ | — | 待执行 |
| | P2-BE-5 | E2E 测试覆盖度跃升 | 🔴 | 质量保障 | 全局 | — | 待执行 |
| **P3** | P3-FE-1 | Light/Dark 主题 | 🔴 | 前端设计 | 全局 | P1-FE-1 | 待执行 |
| | P3-FE-2 | 富文本编辑器 | 🔴 | 前端功能 | ① | — | 待执行 |
| | P3-FE-3 | 项目 README 展示 | 🟢 | 前端功能 | ① | P3-FE-2 | 待执行 |
| | P3-FE-4 | 通知偏好设置 | 🟢 | 前端功能 | ②③ | — | 待执行 |
| | P3-BE-1 | 异步任务队列 | 🔴 | 后端架构 | 全局 | — | 待执行 |
| | P3-BE-2 | API 版本化策略 | 🟢 | 后端架构 | ③ | — | 待执行 |
| | P3-BE-3 | 文件上传/媒体管理 | 🔴 | 后端功能 | ①② | — | 待执行 |
| | P3-BE-4 | Webhook 通用化 | 🔴 | 后端功能 | ③ | P3-BE-1 | 待执行 |
| | P3-BE-5 | GitHub 集成深化 | 🟢 | 后端功能 | ① | — | 待执行 |
| **P4** | P4-BE-1 | 可观测性平台 | 🔴 | 基建 | 全局 | P1-BE-3 | 待执行 |
| | P4-BE-2 | DB 查询性能基线 | 🟢 | 基建 | 全局 | — | 待执行 |
| | P4-BE-3 | CI/CD 流水线增强 | 🔴 | 基建 | 全局 | P2-BE-5 | 待执行 |
| | P4-BE-4 | 多环境配置管理 | 🟢 | 基建 | 全局 | — | 待执行 |
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

- [ ] 设计系统统一，`DESIGN.md` 与 `globals.css` 无冲突
- [ ] UI 原语层覆盖 Button/Input/Modal/Card/Badge/Dropdown/Skeleton
- [ ] 所有写路由 Zod schema 覆盖
- [ ] Repository 错误不再向客户端暴露 Prisma 内部信息
- [ ] 结构化日志替换所有 `console.*`

### P2 → P3 门禁

- [ ] i18n 覆盖全部用户可见字符串
- [ ] `repository.ts` 拆分为独立领域模块
- [ ] E2E 测试覆盖核心链路、团队链路、讨论链路
- [ ] WCAG 2.1 AA 基本达标

### P3 → P4 门禁

- [ ] Light/Dark 主题可切换
- [ ] 异步任务队列运行稳定（webhook/email/credit）
- [ ] 文件上传闭环（头像/截图/logo）
- [ ] API 版本化策略文档发布

---

## 建议执行顺序（P1 内部）

基于依赖关系和投入产出比，P1 建议执行顺序为：

```
P1-BE-3 结构化日志（普通，无依赖）
  ↓
P1-FE-4 缺失核心页面（普通，无依赖）
  ↓
P1-BE-4 WS/MCP 生产化（普通，无依赖）
  ↓
P1-BE-1 API 全面 Zod 化（复杂，无依赖）  ← 可与下方并行
P1-BE-2 Repository 错误处理（复杂，无依赖）← 可与上方并行
  ↓
P1-FE-1 设计系统统一（复杂，依赖 P0-FE-1/2 ✅）
  ↓
P1-FE-2 共享 UI 原语层（复杂，依赖 P1-FE-1）
  ↓
P1-FE-3 ⌘K 全局搜索（复杂，依赖 P1-FE-2）
```

**原则：** 先普通后复杂，先无依赖后有依赖，后端与前端可并行。

---

## 统计概览

| 阶段 | 总任务 | 普通 🟢 | 复杂 🔴 | 已完成 ✅ | 待执行 |
|------|--------|---------|---------|----------|--------|
| P0 | 6 | 5 | 1 | 6 | 0 |
| P1 | 8 | 3 | 5 | 0 | 8 |
| P2 | 10 | 4 | 6 | 0 | 10 |
| P3 | 9 | 4 | 5 | 0 | 9 |
| P4 | 6 | 2 | 4 | 0 | 6 |
| **合计** | **39** | **18** | **21** | **6** | **33** |

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
