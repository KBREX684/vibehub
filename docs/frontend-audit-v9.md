# VibeHub 前端 UI 审查与美化升级专项 V9.0

> 更新日期：2026-04-18  
> 作者：PM + 前端 UI 设计负责人（Cursor Agent）  
> 配合阅读：`docs/roadmap-v9.md`  
> 本文件是 V9.0 路线图的 **正式一部分**，不是附录。所有条目都有 Phase / 版本归属，禁止做"只改 UI 不接后端"的伪升级。

---

## 0. 审美立场

VibeHub 的产品气质应该是 **"理性、克制、可信"**：

- 暗色 Monochrome Geek 基调（已在 `globals.css` 立住）；
- 只在 **Hero / 品牌句 / 付费锚点 / 数据强调** 四个位置用高饱和动效；
- 业务页（团队、合作申请、后台）**一律静止或轻微过渡**；
- 拒绝"粒子满屏、渐变满屏、光晕满屏"的风格 — 那是营销页，不是协作中枢。

仓库已自研 15+ reactbits 风格组件（`components/ui/aurora.tsx` / `shiny-text.tsx` / `split-text.tsx` / `gradient-text.tsx` / `spotlight-card.tsx` / `tilted-card.tsx` / `magnet.tsx` / `click-spark.tsx` / `particles.tsx` / `blur-text.tsx` / `animated-section.tsx` / `count-up.tsx` / `float.tsx` / `stagger-list.tsx`）以及自研可视化（`visual/hero-threads-backdrop.tsx` / `visual/project-gallery-orbit-shell.tsx` / `visual/shiny-hero-line.tsx`）。**本轮升级原则：用好存货，不引新包。**

---

## 1. 前端专项总评

**整体水平**：**已具备基础但缺乏系统化设计**。

- 最顶层（`page.tsx` 首页、`discover/page.tsx`、`developers/page.tsx`、`settings/page.tsx`）**已达到准成熟状态**；
- 中层业务页（`/teams/[slug]`、`/projects/[slug]`、`/admin/*`）**功能存在但审美较弱**；
- 关键转化组件（`collaboration-intent-form.tsx`、`project-collaboration-owner-panel.tsx`）**仍是英文原型级**，且校验与 API 不一致，**明显拖低产品完成度**。

**最大 UI 优势**

1. **设计 token 完整**：`globals.css` 的 `--color-*` / `--radius-*` / `--shadow-*` / `--font-*` 统一，组件几乎不再硬编码 hex。
2. **UI 基元齐备**：`FormField / SectionCard / PageHeader / DataTable / ConfirmDialog / ErrorState / EmptyState / StatCard / TagPill / Badge / Avatar / AvatarStack / LoadingSkeleton`。
3. **动效素材齐**：上面提到的 15+ reactbits 风组件 + `HeroThreadsBackdrop`。
4. **类型系统 + i18n 钩子齐**：`useLanguage()` / `getServerTranslator()` 基础设施完整。

**最大 UI 短板**

1. **业务表单与治理叙事脱节**：合作申请是 VibeHub 最关键的"协作撮合转化点"，但 UI 是英文表单 + `<select>` 混入 + 字数约束与后端不一致，是 **全站最显眼的审美和完整性短板**。
2. **团队页单列长滚**（成员→项目→任务→里程碑→讨论→聊天），**不像协作中枢**，像后台功能拼接。
3. **管理台大段英文硬编码**（`admin/moderation`、`admin/collaboration`、`admin/reports`、`admin/audit-logs`），风险色与信息密度随手写而不是用 `DataTable` + `TagPill` 抽象。
4. **动效使用不均**：`SpotlightCard` 只在项目卡应用良好；`Magnet / TiltedCard / ClickSpark` 几乎闲置；`Particles / Aurora` 有被滥用（如登录页 `login-aurora-background.tsx`）的风险。

**最影响完成度的页面/区域**

1. `components/collaboration-intent-form.tsx`（核心合作转化点，拖低产品可信度）；
2. `app/teams/[slug]/page.tsx`（主线页面未 Tab 化，无 Workspace 承载能力）；
3. `app/admin/*`（整体英文硬编码、密度不统一）；
4. `app/projects/[slug]/page.tsx` 底部的 `ProjectCollaborationOwnerPanel`（英文 + 操作不清晰）。

---

## 2. 前端问题清单

### 🔴 高优先级

| # | 具体位置 | 问题性质 | 为何不合理 | 建议怎么改 |
|---|---|---|---|---|
| H1 | `components/collaboration-intent-form.tsx` | 英文标签 + `<select>` + 单 textarea + 鼓励 contact | 与"中国化、禁私信引流"直接冲突；`<select>` 与卡片风格不一致；`maxLength=500` 与 API 1000 不符 | Phase 0 紧急同步字数；Phase 2 重写为三字段 `<textarea>` + 字数计数 + 提交前风控声明；去掉 contact；`intentType` 改为两张选择卡（非 `<select>`） |
| H2 | `app/teams/[slug]/page.tsx` | 单列长滚（成员/项目/任务/里程碑/讨论/聊天/侧栏 9 块叠加） | 像后台功能列表，不像协作中枢；移动端阅读线过长；无 Workspace 容器位 | Phase 0 改 **顶 Tab 架构**：概览 / 工作区 / 任务 / 里程碑 / 讨论 / 活动；每 Tab 限 3 屏 |
| H3 | `app/admin/collaboration/page.tsx` / `moderation/page.tsx` / `reports/page.tsx` / `audit-logs/page.tsx` | 整页英文硬编码（如 `"Moderation queue"`, `"Back to dashboard"`, `"Review collaboration intents"`） | 中国化合规叙事下明显债务；文字不可切换语言 | Phase 0 全量接入 `getServerTranslator()`；同步补 `zh.json` / `en.json` 键 |
| H4 | `components/project-collaboration-owner-panel.tsx` | 英文 + 只有 approve/reject，无"忽略 / 拉黑举报" | 白皮书要求接收方四动作；当前仅两动作 | Phase 2 随 API 重写为四动作 Drawer + 字段化展示三句内容 |
| H5 | `app/projects/[slug]/page.tsx` Hero 部分 | `PROJECT_HERO_INITIAL_CLASS` 使用 `w-24/32 h-24/32` 主色渐变，与 `pricing-cards` 色值逻辑脱节；整块 Hero 缺少清晰层级 | Logo 占 1/4 视野但无 CTA 聚焦；徽章堆积无主次 | Phase 0 重排：固定 Logo 为 `w-20`，徽章 → `TagPill` 统一，状态徽章放标题右侧而非前置 |
| H6 | `app/globals.css` `--shadow-card: none` | 全局无阴影 + 全依赖 `border` 区分层级 | 导致卡片与背景对比弱，尤其在 Workspace 这种需要"空间感"的场景显单薄 | Phase 1 引入 `--shadow-card: 0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px var(--color-border-subtle)`（轻量）仅在 `card-elevated` 启用 |

### 🟡 中优先级

| # | 具体位置 | 问题性质 | 为何不合理 | 建议怎么改 |
|---|---|---|---|---|
| M1 | `components/pricing-cards.tsx` | 只有 Free/Pro 两列；CTA 使用 `font-mono uppercase tracking-wider` 风格过重 | 与整站中文主基调不符；未来 Team Workspace 付费位未预留 | Phase 1 第三列占位"Team Workspace（敬请期待）"；CTA 改回 sans 字体；Pro 列顶部接入 `GradientText` 一行强化 |
| M2 | `app/admin/*` 多页 | 每页各自拼表格、筛选、徽章 | 后台"拼接感"严重，密度不一 | Phase 2-4 迁移到已有 `DataTable`；筛选抽 `AdminFilterBar` 统一组件 |
| M3 | `app/discover/page.tsx` Featured Orbit | `ProjectGalleryOrbitShell` 挂在正文第二屏 | 动效强度最高的元素放在信息密度最高的页面，造成视觉竞争 | Phase 1 下移到靠近 Featured Tab 处，或仅在 `?sort=featured` 时显示 |
| M4 | `components/site-nav.tsx` 固定宽度 `w-[6.8rem]` pill | 中英文切换时宽度够，但改为三字/四字中文+英文不均时视觉重心偏移 | 已基本稳定，但若未来新增导航项会出问题 | Phase 0 将 pill 改为 `min-w-[6.5rem]` + `px-4`，允许轻微宽度波动但不跳动 |
| M5 | 全站 `font-mono` 使用 | 价签、`pricing.faq` 标题、`admin` 标签、部分支柱标题都用了 `font-mono` | 大段 mono 正文影响可读性 | Phase 0 统一 — mono 只用于：价签 / 代码片段 / 数据 ID / 时间戳 / uppercase 小标签；其他一律 `font-sans` |
| M6 | `components/collaboration-intent-form.tsx` 成功态 | 用 `ErrorBanner tone="info"` 混用于 success | 语义错位；`tone="info"` 是信息态不是成功态 | Phase 0 在 `ErrorBanner` 增加 `tone="success"` 或直接用 `badge-green` 区块替代 |
| M7 | `components/team-chat-panel.tsx` | 实时聊天是核心 IM 组件但白皮书要求不做自由私信 | 产品决策未落；UI 仍按完整聊天室呈现 | v1.2 前产品决策：降级为"工作区简讯"并禁止外链/联系方式识别；UI 加合规条（内容将被审核） |
| M8 | `app/settings/page.tsx` | 设置组卡片 `hover:bg-[var(--color-bg-surface)]` 对比过弱 | 可点性不足 | Phase 1 增加 left 3px accent border on hover |
| M9 | Login page `LoginAuroraBackground` | Aurora 全屏放在登录表单后面 | 登录是高专注场景，背景运动分散注意力 | Phase 1 将 Aurora 降透明度 40%，或改为静态 gradient |

### 🟢 低优先级

| # | 具体位置 | 问题性质 | 建议 |
|---|---|---|---|
| L1 | 全站大量 `animate-fade-in-up` | 使用过于普遍 | Phase 1 仅保留 首页 / 定价 / 设置入口；列表页改 StaggerList |
| L2 | `.container` = `min(1280px, 94vw)` | 无大屏 (>1440) 专门断点 | Phase 2 加 `2xl` 断点 1440px |
| L3 | 头像默认 `initial` 灰 | 用户感知弱 | Phase 1 改为从用户名 hash 分配 6 种预设底色 |
| L4 | 首页 `HomeCtaFooterClient` | 与 footer 视觉距离过近 | Phase 1 加 120px 上边距 |
| L5 | 滚动条 `rgba(255,255,255,0.15)` | 暗色主题下略淡 | Phase 2 改 `0.2` |

---

## 3. reactbits 接入建议（仅使用仓库已有组件）

**原则**：每处动效必须绑定一个 **具体页面/区块 + 解决的问题 + 为什么不伤害可用性**。一律 `prefers-reduced-motion` 关闭 / 降级。

### 3.1 首页（`app/page.tsx`）

| 位置 | 建议组件 | 作用目标 | 为什么适合 | 风险提醒 |
|---|---|---|---|---|
| Hero 主标题第二行 | `ShinyText` 或 `GradientText` | 让"让你的 Agent 合法进入团队"强化品牌句 | 长句 2 行不过分；已在同主题下使用 | 不要两行都动；不加于描述段 |
| Hero 背景 | 保留 `HeroThreadsBackdrop` | 微科技感 | 已较克制 | 不再追加 `Particles`；不叠加 Aurora |
| 四支柱卡（`HomePillarsClient`） | `SpotlightCard`（轻） | hover 时显焦点 | 网格需要 hover 反馈 | 仅默认 tone，不用 violet/cyan 全套 |
| Agent 四步流（How it works） | `StaggerList` 100ms | 进场节奏感 | 4 项刚好 | 不循环播放 |
| CTA footer | `Magnet` 仅主按钮 | 微黏附感 | 主 CTA 需要强调 | 范围 ≤60px，`reduced-motion` 降级 |
| **不应使用** | `Particles / Aurora / Float / BlurText / TiltedCard` | — | 会让首页看起来像营销落地页 | — |

### 3.2 导航与全局框架

| 位置 | 建议组件 | 作用目标 | 风险 |
|---|---|---|---|
| `SiteNav` 激活 pill | 保留 `motion.div layoutId="siteNavActive"` | 已有，优秀 | 无 |
| 用户下拉、创建下拉 | 保留 `AnimatePresence` + 0.14s | 已有 | 不调大 duration |
| **不加** | 顶栏背景动效 | — | 顶栏需要绝对稳定 |

### 3.3 项目展示 / 发现页

| 位置 | 建议组件 | 作用目标 | 风险 |
|---|---|---|---|
| `ProjectCard` hover | 保留 `SpotlightCard`（已用） | Featured 卡强调 | 非 featured 用 `default` tone |
| Featured Orbit | 保留 `ProjectGalleryOrbitShell` 但仅在 Featured 视图启用 | 品牌位 | Latest / Hot 视图关闭 |
| 项目列表进场 | `StaggerList` 50ms | 节奏 | 每页 ≤12 张，重复翻页不再触发 |
| **不加** | `TiltedCard`（3D 倾斜） | — | 协作平台不需要 3D 感 |

### 3.4 团队 Workspace 页面

| 位置 | 建议组件 | 作用目标 | 风险 |
|---|---|---|---|
| Workspace Tab 顶栏 eyebrow 行 | `BlurText`（轻、入场一次） | 专业感 | 仅标题，不用于数据行 |
| Artifact 列表行 | `stagger` 静态（无 reactbits） | 加载感 | 无 |
| 配额条 | `CountUp` 数字 | 真实数据强调 | 不要循环 |
| 活动时间线 | 无动效 | 可读性优先 | — |
| **不加** | `Particles / Aurora` | — | 工作区是 focus 场景 |

### 3.5 合作申请（v1.3 重写后）

| 位置 | 建议组件 | 作用目标 | 风险 |
|---|---|---|---|
| 抽屉顶 eyebrow | 无 | 保持克制 | — |
| 字数计数 | `CountUp` 250 倒数 | 注意力 | 不要超过 2 个 CountUp |
| 提交成功 toast | `sonner` 已有 | — | 无 |
| **不加** | 任何背景动效 | — | 合规表单不能分神 |

### 3.6 后台管理

| 位置 | 建议组件 | 作用目标 |
|---|---|---|
| 管理台顶部 metric 卡 | `CountUp` | 数据感 |
| 风险分级徽章 | `TagPill` + 左 4px 色带 | 一眼分级 |
| **全部不加** | 粒子 / Aurora / Magnet / Float / BlurText | 后台需要阅读速度和确定性 |

### 3.7 绝对禁用清单（无视场景）

- `Particles` 全屏（仅特殊空态可考虑，且 ≤20 颗粒）；
- `Aurora` 在 Login 之外的任何业务页；
- `TiltedCard` 全站；
- `ClickSpark` 绑定到危险按钮（删除、封禁）；
- `Magnet` 强度 > 80px；
- `BlurText` 用于正文段落。

---

## 4. 前端升级方案（按模块）

### 4.1 首页升级方案

**重构目标**：10 秒读懂 "本地开发 + 云端 Team Workspace + Agent 受控"。

| 维度 | 现状 | 目标 | 具体怎么改 |
|---|---|---|---|
| Hero 布局 | 单列居中，视觉焦点够 | 保持 | 副标题追加一行"云端 Team Workspace 让作品被看见、让 Agent 合法进入团队" |
| 支柱 4 卡 | 广场 / 项目 / 团队 / Agent 总线 | **改 3 卡**：Team Workspace / 合作申请 / Agent 总线 | 突出核心付费位；广场与项目移到正文 Section |
| CTA | 双 CTA 已合理 | 保持 | 次 CTA 改指向 `/teams/new`（v1.2 后指向 Workspace 创建） |
| 动效 | `HeroThreadsBackdrop` + `motion` | 保持 | 副标题行加 `ShinyText`（不加副描述） |
| 间距 | Hero → Pillars 80px | 改 96px | 更高呼吸 |
| 配色 | 整体暗 + violet accent | 保持 | 第三支柱（Agent）用 `accent-cyan` 区分 |
| 字体 | `font-mono` 用于 eyebrow | 保持 | `home.v8.cta_footer.primary_guest` 按钮改 `font-sans` |

### 4.2 全局框架升级方案

| 维度 | 变更 |
|---|---|
| **Spacing scale** | 统一 `py-8 / pb-24` 为页面容器标准；section 之间 `space-y-10` / `space-y-12`；移除零散 `mt-5 mb-4` 混用 |
| **Radius** | Workspace / Form / Drawer 用 `--radius-xl`；Card 用 `--radius-lg`；Button `--radius-md`；Pill `--radius-pill` |
| **Border** | 主卡 `--color-border`；强调卡 `--color-border-strong`；Hover 提一级 |
| **Shadow** | 引入 `--shadow-card-subtle = 0 1px 0 rgba(255,255,255,0.03) inset`（极淡 inner stroke）；Modal/Drawer 用现有 `--shadow-modal` |
| **Typography** | `h1 clamp(1.75rem, 3vw, 2.5rem)`（当前 `2rem~3.5rem` 稍大）；正文 `text-sm`（14px）保持；`font-mono` 仅限 **数据/时间戳/小徽章/价签** |
| **国际化稳定** | 导航 pill `min-w-[6.5rem] px-4`（非 `w-[6.8rem]`）；用户菜单名字 `max-w-[8rem] truncate`；语言切换按钮保持 `w-[4.75rem]` |
| **边距容器** | `.container` 在 `≥1440px` 增加 `max-w-[1320px]` 断点 |

### 4.3 社区与项目展示页升级方案

**`/discover`**

- Page header Logo 方块从 cyan 改为 `--color-primary-subtle`（更中性）；
- Featured orbit 移到 `sort=featured` 显示；
- Filter bar 改用 `FormField` 包裹每个 `<select>`，统一 label/hint 布局；
- 无结果态改用 `EmptyState` 组件。

**`/projects/[slug]`**

- Hero: Logo `w-20 h-20`；状态与徽章统一 `TagPill`，status 放标题右侧；
- 新增顶 Tab：概览 / README / 合作 / 里程碑（公开）；
- 合作申请区改为 **右侧粘性卡片 + "发起合作申请" 打开抽屉**（不再正文大表单）。

**`/teams`**

- Teams grid 无变更，但 `empty state` 视觉弱 → 改用 `EmptyState` + 示例卡片；
- Create CTA 改用 `Magnet`（已在 UI 组件）。

**`/developers`**

- 已较好；优化 Code block 用 `SectionCard` 包裹；CopyButton 已在用。

### 4.4 Team Workspace 页面升级方案（v1.2 新建）

**信息架构**（顶 Tab）

1. **概览**：团队描述、成员条、最近 5 件 artifact、最近 3 次快照、状态徽章；
2. **工作区**：Artifact 列表（表格 + 卡片两种视图）、上传区、配额条、权限说明；
3. **快照**：时间线（创建者头像 + Agent 角色牌）；
4. **任务**（复用现有 TeamTasksPanel）；
5. **里程碑**（复用 TeamMilestonesPanel）；
6. **讨论**（复用 TeamDiscussionsPanel）；
7. **活动**（复用 team-activity-timeline）；
8. **成员与 Agent**（合并现 `agents` 子页入口，作为次级导航）。

**模块布局建议**

- 左：64px 图标列 Tab 或顶 pill Tab；
- 右：内容区 `max-w-[1080px]`；
- 工作区页：上方 `StatCard` 三宫格（总容量 / 已用 / 近 7 天上传数）+ 筛选栏 + 列表；
- 快照：时间线左 dot-line，右卡片（标题 / 摘要 / 创建者 / 确认结果 / 操作）；
- 成员 + Agent：双栏，左人类成员，右 Agent 角色牌（与现有 `team-agents-client` 一致但收敛）。

**卡片/面板规范**

- Artifact 卡：`SectionCard` 基础 → `icon + filename + meta(size/time/uploader) + visibility badge + overflow menu`；
- 操作按钮统一 `Button size="sm" variant="secondary"` + `ConfirmDialog` 删除；
- 权限角色：`TagPill accent` 对应：member = default / admin = violet / owner = success / Agent = cyan。

**reactbits 局部增强**

- 工作区顶 eyebrow `BlurText`（入场一次）；
- 配额条用 `CountUp`；
- 快照时间线节点 hover 用 `SpotlightCard` 轻效果；
- **不加**：Particles / Aurora / TiltedCard。

### 4.5 合作申请相关页面升级方案

**形态抉择**：**右侧抽屉（Drawer）**，不用模态（Modal）—— 模态易阻断阅读；不用页内大表单（现状）—— 太散。

**结构**

```
┌──────────────────────────────────────────┐
│ Eyebrow: COLLABORATION REQUEST          │
│ Title: 申请与「{project.title}」合作     │
│ Description: 提交前请阅读合作准则         │
├──────────────────────────────────────────┤
│ [Tab] 我想加入  |  我想招募               │
│                                          │
│ ① 我是谁 / 我能做什么（≤250 字）          │
│   [textarea] + 字数 CountUp               │
│                                          │
│ ② 我为什么联系你（≤250 字）               │
│   [textarea] + 字数 CountUp               │
│                                          │
│ ③ 我希望怎样合作（≤250 字）               │
│   [textarea] + 字数 CountUp               │
│                                          │
│ [合规提示] 禁止外链/联系方式直发            │
│ [合规提示] 提交内容将被审核               │
│                                          │
│ [取消]              [提交合作申请]         │
└──────────────────────────────────────────┘
```

**接收方视图（项目所有者）**

- 改造 `project-collaboration-owner-panel.tsx` 为独立 `/projects/[slug]/intents` 子 Tab 或侧抽屉；
- 列表：按 `pending / approved / rejected / blocked`；
- 卡片：三字段分块展示 + 申请人 Avatar + 时间 + 四动作按钮组：
  - `接受 → 可选邀请到哪个团队`（保持现有下拉）
  - `婉拒 → 可附一句原因（≤100 字）`
  - `忽略 → 静默关闭，不通知申请人`
  - `拉黑并举报 → 进入 ReportTicket（ConfirmDialog）`

**后台审核视图（`/admin/collaboration`）**

- 顶部 filter bar：状态 / 项目 / 时间范围 / 风险分级；
- 每行 `DataTable` row，展开抽屉看完整三字段；
- 动作：批准 / 拒绝 / 标记高风险 / 转到用户限制台；
- 高风险自动用左 `4px` 红带 + `TagPill accent="error"`。

### 4.6 后台页面升级方案

**共同视觉语言**

- 背景 `--color-admin-bg`（已存在 `#060810`，比业务页稍深）；
- 每页顶用 `PageHeader` 组件（消灭每页自拼 header）；
- 所有表格改用 `DataTable`；筛选抽 `AdminFilterBar`（待建）；
- 风险色：低 / 中 / 高 = `--color-info` / `--color-warning` / `--color-error`；以 **左 4px 色带** 呈现，而非大面积背景色；
- 状态徽章：统一 `TagPill`；`mono size="sm" capitalize`；
- 日志/时间线：复用 `team-activity-timeline` 的样式（左 dot + 右文字），时间戳用 `font-mono`。

**关键页面改造**

| 页面 | 改造 |
|---|---|
| `/admin`（首页） | 6 个 `StatCard` → 3-column；funnel 改 `CountUp` + 进度微条 |
| `/admin/moderation` | `DataTable` + 批量选择；AI suggestion 并入行内展开 |
| `/admin/collaboration` | 见 §4.5 |
| `/admin/reports` | `DataTable` + filter bar（status / reporter / target type） |
| `/admin/audit-logs` | 时间线 + 单行可复制的 JSON（`CopyButton`） |
| `/admin/restrictions`（v2.0 新建） | 三 Tab + 到期自动解除倒计时（CountUp 倒数） |

**不要做的事**

- 不要给后台加背景动效；
- 不要给后台用 `font-mono` 正文；
- 不要用情绪化 emoji 图标；
- 不要在表格行内嵌动画。

---

## 5. 前端进入总路线图的方式

| Phase | 前端工作 | 说明 |
|---|---|---|
| **Phase 0** | 合作申请 `maxLength` 对齐；合作申请 + admin 四页 i18n 清零；首页 Hero 副标 + 支柱文案调整；团队页 Tab 骨架（占位）；全站 `font-mono` 使用复查；导航 pill `min-w` 稳定；首页动效节流（`ShinyText` 进入 Hero）；`SiteNav` 预留 workspace 入口 | 纯前端，无后端依赖，**v1.1 必须完成** |
| **Phase 1** | Workspace Tab 正式上线（列表 / 上传 / 配额 / 权限态）；`StatCard` + `CountUp` 配额展示；定价页预留第三列占位；登录 Aurora 降级；Home `HomeCtaFooterClient` 间距修正 | **必须等 Phase 1 后端 API 到位**；UI 完成度以 v1.2 交付为准 |
| **Phase 2** | 三句式合作申请 Drawer；所有者面板四动作；快照时间线；项目页 Tab 化；admin collaboration 改造 | **依赖 Phase 2 后端迁移**；禁止先做 UI |
| **Phase 3** | 团队「活动」Tab 聚合视图；Agent 角色牌 tooltip 升级；设置页 Agent 确认队列分组 | **依赖 Phase 3 MCP 工具与 audit 扩展** |
| **Phase 4** | `/admin/restrictions` 三 Tab；合规可见化面板；工作区设置数据区域；全站后台 i18n 收尾 | **依赖 Phase 4 后端 Restriction 模型** |
| **上线前必做 polish** | 全站 `prefers-reduced-motion`；a11y `aria-describedby` 绑字数统计；键盘导航（Tab 顺序）；移动端 `safe-area-inset`；RTL 稳定性回归（虽未启用，但组件不能假设 LTR） | 每个 Phase 前置 |

**可先纯前端优化（无需等后端）**

- 首页文案与 Hero 副标；
- `CollaborationIntentForm` `maxLength` 同步（属于前端修 bug 而非新功能）；
- admin 四页 i18n；
- 全站 `font-mono` 使用复查；
- 滚动条、间距、radius 统一；
- 登录页 Aurora 降级；
- 动效节流。

**必须等后端到位再做（做了会形成伪升级）**

- Workspace Tab 实体 UI（等 `WorkspaceArtifact` API）；
- 三句合作申请提交流（等 schema 迁移）；
- 快照时间线（等 `SnapshotCapsule`）；
- 限制台（等 `Restriction` 模型）；
- 合规面板真实数据（等 `ComplianceDisclosure`）。

**可以先做设计系统与视觉统一（无风险）**

- 抽 `AdminFilterBar` 组件；
- 抽 `StatusPill`（基于 `TagPill` 封装风险分级）；
- 抽 `RiskBar`（左 4px 色带封装）；
- 抽 `ContactBlockedHint`（三句式合规提示）；
- 全站 section `space-y` 统一；
- `page-hero` CSS 类统一。

---

## 6. 给前端 Agent 的执行清单

### v1.1 — 纯前端，本版本必须完成

**P0（必须当版本完成）**

1. ✅ `components/collaboration-intent-form.tsx`  
   - 全量 i18n；  
   - `maxLength` 同步为与 API 一致；  
   - `intentType` 由 `<select>` 改为两张选择卡（`join` / `recruit`）；  
   - success 态使用独立语义色（不用 info tone）；  
   - 明确标注"后续将升级为三句式"（注释，不在 UI 显示）。
2. ✅ `components/project-collaboration-owner-panel.tsx`  
   - 全量 i18n；  
   - 文案与 `CollaborationIntentForm` 一致；  
   - 功能暂不改（四动作留给 v1.3）。
3. ✅ admin 英文清扫（至少 4 页）：  
   - `app/admin/moderation/page.tsx`  
   - `app/admin/collaboration/page.tsx`  
   - `app/admin/reports/page.tsx`  
   - `app/admin/audit-logs/page.tsx`  
   - 方法：`getServerTranslator()` + 补 `zh.json` / `en.json` 键。
4. ✅ `app/page.tsx` Hero 副标 + 支柱文案微调（接入 Workspace 词汇）。
5. ✅ `app/teams/[slug]/page.tsx`  
   - 改 **顶 Tab 架构**：概览 / 工作区（禁用占位，带 tooltip "v1.2 上线"）/ 任务 / 里程碑 / 讨论 / 活动；  
   - 现有 panels 一一对应至 Tab；  
   - 移动端 Tab 可横向滚动。
6. ✅ `components/site-nav.tsx`  
   - 主 pill `w-[6.8rem]` → `min-w-[6.5rem] px-4`；  
   - 用户名 `truncate max-w-[8rem]`。
7. ✅ 更新 e2e 选择器（`team-flow.spec.ts`, `profile-settings.spec.ts`）。
8. ✅ `npm run check` 必须绿（lint + test + validate:openapi + generate:types + build）。

**P1（本版本应做）**

- `app/components/login-aurora-background.tsx` 透明度 → 40%；
- `app/globals.css` `font-mono` 使用审查，非数据类改 `font-sans`；
- 首页 `HomeCtaFooterClient` 上边距 → 96px。

### v1.2 — 必须联动后端

**P0**

1. ✅ 团队 Workspace Tab 实体上线：  
   - 文件列表（卡片 + 表格两种）；  
   - 上传（非图片白名单；drag-drop）；  
   - 删除 `ConfirmDialog`；  
   - 配额条 `StatCard` + `CountUp`；  
   - 空态 / 加载态 / 403 / 配额满 / 扫描中 **五态齐备**；  
   - 权限 badge：`TagPill`。
2. ✅ `/settings/subscription` 显示 Workspace 存储配额。
3. ✅ 定价页第三列占位（"Team Workspace 即将推出"）—— **feature flag 控制**，后端未开放时可灰显。

**联动要求**：本版本 UI 必须等 `GET/POST/DELETE /api/v1/teams/[slug]/artifacts` 真实可用；禁止 mock 合并。

### v1.3 — 必须联动后端

**P0**

1. ✅ 合作申请 Drawer 重写（三字段 + 字数 `CountUp` + 合规提示）；
2. ✅ `project-collaboration-owner-panel` 四动作 + 抽屉展开详情；
3. ✅ 项目页 Tab 化（概览 / README / 合作 / 里程碑）；
4. ✅ `/teams/[slug]/snapshots/[id]` 公开只读页；
5. ✅ 团队页「快照」子区（时间线）。

**联动要求**：等 schema 迁移 + `SnapshotCapsule` API + 三字段 zod 上线。

### v2.0 — 必须联动后端

**P0**

1. ✅ 团队「活动」Tab 聚合视图（包含 artifact / snapshot / agent / confirmation）；
2. ✅ `/admin/restrictions` 三 Tab + 到期倒数 `CountUp`；
3. ✅ 用户/团队/Agent 详情页状态条（被限制时红色顶条）；
4. ✅ 工作区设置：数据区域选择 + 合规可见化面板；
5. ✅ 管理台全量 i18n 收尾；
6. ✅ 抽出 `AdminFilterBar` / `StatusPill` / `RiskBar` / `ContactBlockedHint` 复用组件。

### 纯 UI 改造（可任意 Phase 并行，不依赖后端）

- 抽象 `AdminFilterBar` / `RiskBar` / `StatusPill`；
- 全站 `space-y` 统一；
- `font-mono` 使用复查；
- `.container` 增 `2xl` 断点；
- 头像底色 hash；
- 登录页 Aurora 降级。

### 必须联动后端的前端工作（严禁单侧 PR）

- Workspace Tab 实体；
- 三句合作申请；
- 快照时间线；
- 限制台；
- 合规面板；
- Agent 对 artifact/snapshot 的确认队列；
- 数据区域开关。

### 质量门禁（每个 PR 必须通过）

- `npm run lint`
- `npm run test`
- `npm run validate:openapi`
- `npm run generate:types`（无 diff）
- `npm run build`
- Playwright 关键 e2e（`core-flows.spec.ts`, `team-flow.spec.ts`, `w4-community-loop.spec.ts`）
- `prefers-reduced-motion` 回归
- 移动端 360/768/1024 回归
- 中英文切换回归

---

## 7. 反面案例（禁止出现）

这些做法会直接视为 **伪升级**，不予合并：

1. 团队页加"工作区" Tab 但 Tab 内只有静态文案占位而非骨架；
2. 合作申请换三字段 textarea 但 submit 仍发送单 `message`；
3. Workspace 配额条显示固定 `50%`；
4. 限制台按钮 click 只 `toast.success` 不落 DB；
5. 首页吹"合规可见化"但点进去只有 MD 静态页；
6. `admin` 页面加花哨背景动效；
7. 新增 reactbits 组件未走 `components/ui/index.ts` 导出；
8. 引入任何新的动效/UI npm 包（我们已有足够素材）。

---

## 8. 与 V9.0 主路线图的关系

本文件 **不是独立附录**，而是 V9.0 路线图的 **前端子章节展开**：

- V9.0 §4 Phase 0 的"前端任务" = 本文件 §6 v1.1 清单；
- V9.0 §4 Phase 1 的"前端任务" = 本文件 §6 v1.2 清单；
- V9.0 §4 Phase 2 的"前端任务" = 本文件 §6 v1.3 清单；
- V9.0 §4 Phase 3 / Phase 4 的"前端任务" = 本文件 §6 v2.0 清单。

任何前端工作的优先级，以 V9.0 §5 版本拆分为准；本文件给出的是 **"如何改"** 的视觉、布局、组件与动效细则，不独立推进。
