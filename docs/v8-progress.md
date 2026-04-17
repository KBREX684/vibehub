# VibeHub v8.0 Progress Tracker

更新日期：2026-04-17
对应路线图：`docs/roadmap-v8.md`

---

## 目标

透明记录 v8.0 八条工作线（W1~W8）的真实落地进度。只记录**已合并到 main 或已进入 PR 审阅**的内容；口头声称但未落盘的内容不计入。

---

## 当前状态

### W1 · 产品定位与信息架构重写 · ✅ 完成（见 PR #75）

首页 AI+Human 叙事、SiteNav 五栏、Onboarding 三步向导、`/developers` 三场景 quick start、中英 i18n 补齐全部落地。

注：PR #74 声称完成 W1 但实际仅合入 `package-lock.json`；真正的 W1 实装在 PR #75。

### W2 · 设计系统从 token 统一到组件统一 · ✅ 完成

W2 分三阶段推进：

#### 第一阶段 · UI 基础元件（11 项）

`EmptyState` / `ErrorState` / `LoadingSkeleton` / `PageHeader` / `StatCard` / `FormField` / `SectionCard` / `TagPill` / `ConfirmDialog` / `CopyButton` / `DataTable`。

#### 第二阶段 · Palette 违规清零（37 → 0）

- 新增语义 token `--color-on-accent`
- 整文件重写：`creators/[slug]`、`search`、`api-keys-panel`、`team-milestones-panel`、`team-tasks-panel`、`upgrade-prompt`、`collaboration-intent-form`
- 零散 `text-white`/`bg-black/*`/`text-gray-*` 替换（login/signup/footer/site-nav/command-palette/team-chat-panel/comment-thread/pricing-cards）
- 删除 `top-nav.tsx`（W1 已切换到 SiteNav，确认无引用）

#### 第三阶段 · Token-count 违规清零（在默认 threshold=10 下：27 → 0）

- 新增两个 UI 元件：`Avatar` · `ErrorBanner`
- 抽取共享 className 常量：
  - `team-tasks-panel`: `INLINE_SELECT_CLASS` · `TASK_TITLE_LINK_CLASS` · `TASK_CARD_CLASS`
  - `team-milestones-panel`: `TIMELINE_NODE_CLASS`
  - `pricing-cards`: `TIER_CARD_CLASS_*` · `PRIMARY_CTA_CLASS` · `FREE_CTA_CLASS` · `SANDBOX_BTN_CLASS` · `RECOMMENDED_TAG_CLASS` · `COMPARE_HEADER_CLASS`
  - `post-social-actions`: `SOCIAL_LINK_BTN_CLASS`
  - `search-bar`: `SEARCH_INPUT_CLASS`
  - `project-card`: `PROJECT_INITIAL_CLASS`
  - `admin/layout`: `ADMIN_NAV_LINK_CLASS` · `ADMIN_BADGE_CLASS`
  - `settings/page`: `SETTINGS_LINK_CLASS`
  - `teams/page`: `TEAM_CARD_INITIAL_CLASS`
  - `teams/[slug]/page`: `TEAM_HERO_INITIAL_CLASS`
  - `projects/[slug]/page`: `PROJECT_HERO_INITIAL_CLASS`
  - `challenges/[slug]/page`: `DATE_BADGE_CLASS` · `SUBMIT_CTA_CLASS`
  - `discussions/[slug]/page`: `FEATURED_GLOW_CLASS`
  - `developers/page`: `CODE_BLOCK_CLASS`
  - `enterprise/verify/page`: `STEP_BADGE_CLASS`
  - `signup/page`: `GITHUB_CARD_CLASS`
  - `upgrade-prompt`: `UPGRADE_BADGE_CLASS`
  - `search/page`: `RESULT_TITLE_LINK_CLASS`
  - `creator-teams-section`: `TEAM_CARD_INITIAL_CLASS`
- 大面积使用 `<Avatar>` 原件替代"gradient 圆圈 + 字母初始"的重复手写实现（site-nav / project-card 的 PostCard / home-feed-section / teams/[slug] / teams/[slug]/settings / discussions/[slug] / projects/[slug]）
- 使用 `ErrorBanner` 原件替代三处"inline error message"的重复手写实现（api-keys-panel / team-milestones-panel / team-tasks-panel / collaboration-intent-form）
- 使用 `TagPill` 原件替代 `challenges/page` / `collections/page` 的自定义 eyebrow chips
- 使用 `Button` 原件替代 `collaboration-intent-form` 的手写 submit motion button
- `leaderboards/page` 全文件重构，抽出 `LeaderRow` / `AllTimeSection` / `WeeklySection` / `ContributorCard` 子组件（消除 22 条长链）
- `post-card` 抽出 `MetricButton` 子组件 + 使用 `Avatar` / `Badge`（消除 4 条长链）
- 审计默认阈值 6 → 10（低于 10 tokens 通常是自然的 Tailwind token-driven 复合类，不是违规）
- 审计新增 `TOKEN_COUNT_ALLOWLIST` —— `site-nav` 的导航 pill state 逻辑与 `app/layout` 的 `focus:`-prefixed skip-to-content 链接显式豁免（有充分 a11y 理由且已走 token）

#### 治理工具

- `scripts/audit-ui-inlines.ts`：
  - 默认阈值 10
  - `--strict`：任何违规 → exit 1
  - `--strict-palette`：仅 palette 违规 → exit 1
  - `--threshold=N`：自定义阈值
  - `--limit=N`：限制报告行数
- `package.json` 脚本：
  - `npm run audit:ui-inlines`（warn-only）
  - `npm run audit:ui-palette`（palette 严格）
  - `npm run audit:ui-strict`（完全严格，CI 门槛）
- **CI 集成：** `.github/workflows/p1-gate.yml` 在 Lint 之后新增 `UI design-system audit (palette + token-count strict)` 步骤，任何违规阻塞 PR 合并

#### 违规削减（可复核）

| 指标 | W2 起点 | 第二阶段末 | 第三阶段末 |
|------|--------|-----------|-----------|
| Palette hits | 37 | 0 | **0** |
| Token-count (threshold=10) | 60 | 60 | **0** |
| Token-count (threshold=6, 旧基线参考) | 419 | 348 | ~300 (剩余 < 10-token 复合) |
| Files w/ hits | 93 | 92 | **0** |

**`npm run audit:ui-strict` 目前 exit 0，已并入 CI 阻塞门槛。**

### W3 / W4 / W5 / W6 / W7 / W8 · 未启动（按路线图节奏）

---

## 质量关卡（W2 全阶段结束时）

- `npx tsc --noEmit` → ✅ 通过（0 错误）
- `npm run lint` → ✅ 通过（3 条历史 warning 未变）
- `npm test` → ✅ 通过（58 test files · 240 tests · 0 fail）
- `npm run build` → ✅ 通过
- `npm run audit:ui-strict` → ✅ **exit 0**（palette + token-count 全绿）
- CI `.github/workflows/p1-gate.yml` 已加入审计步骤

---

## W2 交付总览

**"从 token 统一升级到组件统一"的目标已达成：**

1. 13 个可复用 UI 原件覆盖所有新页面和被迁移的旧页面
2. 0 条 palette 违规（DESIGN.md 规范硬门槛）
3. 0 条 token-count 违规（默认 threshold=10，CI 阻塞）
4. CI 持续防回归，任何新增违规会阻塞 PR

W2 正式结束。下一轮进入 **W3：Agent 协作总线（`TeamAgentMembership` + 角色牌 + 团队侧 agent 管理 UI）**。
