# VibeHub v8.0 Progress Tracker

更新日期：2026-04-17
对应路线图：`docs/roadmap-v8.md`

---

## 目标

透明记录 v8.0 八条工作线（W1~W8）的真实落地进度。只记录**已合并到 main 或已进入 PR 审阅**的内容；口头声称但未落盘的内容不计入。

---

## 当前状态

### W1 · 产品定位与信息架构重写 · **实装中**

| 子任务 | 状态 | 落地物 |
|-------|------|-------|
| W1-1 首页 AI+Human 叙事 | ✅ 代码落地 | `web/src/app/page.tsx` 重写：Hero 讲"作品 + Agent 进团队"双 CTA；四支柱区块；Agent 角色牌 + 4 步协作说明；VibeHub vs PH/GitHub/飞书 对比表；中国优先 CTA 尾部 |
| W1-2 SiteNav 主导航重构 | ✅ 代码落地 | `web/src/components/site-nav.tsx` 新建（5 栏：广场/项目/团队/开发者/定价）；登录态显示「创建」下拉（发讨论 / 建项目 / 我的 Agent）；`web/src/app/layout.tsx` 已切换 |
| W1-3 Onboarding 3 步向导 | ✅ 代码落地 | `/onboarding` 路由新建，Server Component + Client wizard；3 步：介绍 → AI 工具栈 → 第一件事；可跳过；埋点走 `/api/v1/me/onboarding-events` fire-and-forget（API 未实现也不影响 UI） |
| W1-4 `/developers` 三场景重写 | ✅ 代码落地 | 从"功能清单"改为"开始使用"：场景 1 让 Cursor 接入 MCP · 场景 2 让 Agent 进团队 · 场景 3 做 SaaS / 按量计费；每段带可复制代码（CopyButton） |
| W1 i18n 补齐 | ✅ 代码落地 | `zh.json` + `en.json` 新增 W1 所需的 nav / home.v8 / onboarding / developers.v8 / a11y 等键；两份 JSON 均已 `node -e` 验证合法 |

**注意**：PR #74（声称完成 W1）实际只合入 `package-lock.json` 一个文件，W1 功能代码从未合入 main。本 PR 才是 W1 真正的落地。

### W2 · 设计系统从 token 统一到组件统一 · **第一阶段完成**

| 子任务 | 状态 | 落地物 |
|-------|------|-------|
| UI 基础元件 (11 项) | ✅ 代码落地 | `web/src/components/ui/` 新增：EmptyState · ErrorState · LoadingSkeleton · PageHeader · StatCard · FormField · SectionCard · TagPill · ConfirmDialog · CopyButton · DataTable |
| `components/ui/index.ts` 导出清单 | ✅ 代码落地 | 全部元件已统一导出；`Modal.title` 放宽为 ReactNode，保持向后兼容 |
| audit 规范扫描脚本 | ✅ 代码落地 | `web/scripts/audit-ui-inlines.ts` + `npm run audit:ui-inlines`；支持 `--strict` / `--limit` / `--threshold`；当前基线 419 token-count + 37 palette 违规（93 文件） |
| 违规清零 | ⏳ 待 W2 下半段 | 本轮不强制清零；下一步按页面逐条改造并把阈值推进到 strict 模式 |

### W3 / W4 / W5 / W6 / W7 / W8 · 未启动（按路线图节奏）

---

## 质量关卡（本 PR）

- `npx tsc --noEmit` → ✅ 通过（0 错误）
- `npm run lint` → ✅ 通过（只剩 3 条历史 warning，非本次新增）
- `npm test` → ✅ 通过（58 test files · 240 tests · 0 fail）
- `npm run build` → ✅ 通过（`/onboarding` 6.2 kB · `/developers` 1.38 kB · 首页未再大幅增大）
- `npm run audit:ui-inlines` → 运行正常，产出基线报告

---

## 已识别的技术债与后续动作

| 债务 | 影响范围 | v8 何时处理 |
|------|---------|-----------|
| `top-nav.tsx` 仍在仓库（已不再挂载） | 零功能影响；仅是死代码 | W2 下半段随全站迁移一并清理 |
| `InAppNotification` onboarding 事件后端未落 | 只影响埋点，不影响用户体验 | W7 运营仪表盘阶段一并落后端 |
| 419 条 className 长链违规 | 视觉一致性目标 | W2 下半段逐页拆到 `components/ui/*` |
| `input-base` 裸类 (`FormField` 内) | 和 `Input` 组件存在两条路径 | W2 下半段统一收敛 |
| 明显已废弃的 `nav.workspace` / "雷达工作台" 中文文案 | 企业工作台已降级 | 与后续清理一起处理 |

---

## 下一步（W2 下半段）

1. 运行 `audit:ui-inlines` → 选出 top-20 违规文件按优先级排序
2. 将 `InAppNotification` / 通知面板 / 后台表格等高可见页率先切至 `DataTable` + `EmptyState`
3. 把 `npm run audit:ui-inlines --strict --threshold=10` 纳入 CI 警告（非阻塞）
4. 把 W3（TeamAgentMembership + 角色牌 UI）排到下一轮

只有 W2 把违规逐步推向 0（或明确豁免），才允许宣布 W2 完成、进入 W3。
