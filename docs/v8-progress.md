# VibeHub v8.0 Progress Tracker

更新日期：2026-04-17
对应路线图：`docs/roadmap-v8.md`

---

## 目标

透明记录 v8.0 八条工作线（W1~W8）的真实落地进度。只记录**已合并到 main 或已进入 PR 审阅**的内容；口头声称但未落盘的内容不计入。

---

## 当前状态

### W1 · 产品定位与信息架构重写 · ✅ 第一轮完成

| 子任务 | 状态 | 落地物 |
|-------|------|-------|
| W1-1 首页 AI+Human 叙事 | ✅ PR #75 合入前 | `web/src/app/page.tsx` |
| W1-2 SiteNav 主导航 | ✅ PR #75 合入前 | `web/src/components/site-nav.tsx` |
| W1-3 Onboarding 3 步向导 | ✅ PR #75 合入前 | `web/src/app/onboarding/` |
| W1-4 `/developers` 三场景重写 | ✅ PR #75 合入前 | `web/src/app/developers/page.tsx` |
| W1 i18n 中英补齐 | ✅ PR #75 合入前 | `zh.json` + `en.json` |

注：PR #74 声称完成 W1 但实际只合入 `package-lock.json`；真正的 W1 落地见 PR #75。

### W2 · 设计系统从 token 统一到组件统一 · ✅ 第一轮 + ✅ 第二轮完成

#### 第一轮（PR #75）— UI 基础元件

| 元件 | 用途 |
|------|------|
| `EmptyState` / `ErrorState` | 统一空态 / 错误态 |
| `LoadingSkeleton` | 四预设（list / card-grid / detail / table） |
| `PageHeader` / `SectionCard` | 页面标题 / section 容器 |
| `StatCard` | 指标卡（给 W7 仪表盘） |
| `FormField` | 表单字段统一壳 |
| `TagPill` | 带 accent token 的 pill |
| `ConfirmDialog` | 破坏性动作确认 |
| `CopyButton` | 剪贴板按钮（W1-4 依赖） |
| `DataTable` | 后台通用表格 |

#### 第二轮（本轮，PR #75 后续 commit）— 迁移 + 清零 palette 违规

目标：把 `scripts/audit-ui-inlines` 的基线大幅压低，palette 硬违规清零。

**设计 token 扩展：**
- `globals.css` 新增 `--color-on-accent: #FFFFFF`（明暗主题一致）
  - 用途：在饱和彩色 fill 上的前景文字/图标（通知徽章、gradient 头像、accent 填充按钮）
  - 在 `DESIGN.md` §2 同步文档化

**页面级迁移（完整重写到 v8 primitives）：**
- `web/src/app/creators/[slug]/page.tsx` — 去除 `bg-white` / `bg-[#2d2d30]` / `text-white` / `bg-[#81e6d9]` Apple Bento 残留，改用 PageHeader + SectionCard + StatCard + TagPill + EmptyState
- `web/src/app/search/page.tsx` — 去除 `rgba(255,255,255,0.85)` glass 容器，改用 PageHeader + EmptyState + TagPill + token driven pill filter
- `web/src/components/upgrade-prompt.tsx` — modal 与 banner 两种形态都改用 token；使用现成 Button
- `web/src/components/api-keys-panel.tsx` — 大量 Apple liquid-glass 残留清零，迁到 SectionCard + FormField + TagPill + ConfirmDialog + CopyButton + LoadingSkeleton；`window.confirm` 换为 ConfirmDialog
- `web/src/components/team-milestones-panel.tsx` — 同上；timeline / progress bar 全走 token
- `web/src/components/team-tasks-panel.tsx` — Kanban 看板、状态色卡、操作按钮全走 token + TagPill；`window.confirm` 换为 ConfirmDialog
- `web/src/components/collaboration-intent-form.tsx` — input 统一走 `.input-base`；CTA 走 token
- `web/src/components/site-nav.tsx` / `footer.tsx` / `login` / `signup` / `command-palette` — `text-white` / `text-black` 等零散 token 违规改为语义 token
- `web/src/components/team-chat-panel.tsx` / `comment-thread.tsx` / `pricing-cards.tsx` — 同上

**代码删除：**
- `web/src/components/top-nav.tsx` 删除（confirmed 无引用，W1 已切换到 SiteNav）

**治理工具升级：**
- `scripts/audit-ui-inlines.ts` 新增 `--strict-palette` 模式（仅对 palette 违规非零退出）
- `package.json` 新增 `npm run audit:ui-palette`（作为 CI palette 硬门槛候选）

**违规削减（可复核）：**

| 指标 | W2 第一轮 | W2 第二轮 | 变化 |
|------|----------|----------|-----|
| Palette hits | 37 | **0** | ✅ −100% |
| Token-count hits (>6) | 419 | 348 | −17% |
| Files w/ hits | 93 | 92 | −1 |

`npm run audit:ui-palette` 目前 exit 0，具备随时切入 CI 的条件。

#### W2 仍待完成（第三轮，下一轮再做）

- Token-count 基线继续压低：目标 < 200，优先攻击 `app/discussions/[slug]` / `app/projects/[slug]` / `app/notifications` / `teams/[slug]` 等 hotspot
- 将 `--strict` 完整模式推进 CI（当前只推 palette 子集）
- 清理残余 `rounded-[32px]` / `shadow-[0_..._]` 旧 Apple Bento 遗产（非 palette 但是风格断层）

### W3 / W4 / W5 / W6 / W7 / W8 · 未启动（按路线图节奏）

---

## 质量关卡（本轮）

- `npx tsc --noEmit` → ✅ 通过（0 错误）
- `npm run lint` → ✅ 通过（3 条历史 warning 未变，本轮未新增）
- `npm test` → ✅ 通过（58 test files · 240 tests · 0 fail）
- `npm run build` → ✅ 通过（`/teams/[slug]` 15.1 kB → 12.2 kB，减重收益）
- `npm run audit:ui-inlines` → 运行正常
- `npm run audit:ui-palette` → ✅ **exit 0**

---

## 下一步（W2 第三轮）

1. 把 top 20 token-count 违规文件按优先级列清单
2. 批次 D：`app/projects/[slug]` / `app/discussions/[slug]` / `app/notifications`
3. 批次 E：admin 路径（后续 W7 仪表盘会重写，这里只做最小干预）
4. W3 准备：`TeamAgentMembership` 迁移 + API 骨架

完成后评估是否把 `--strict --threshold=10` 推进 CI 警告，并把 `--strict-palette` 升级为 CI 阻塞门槛。
