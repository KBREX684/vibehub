> ⛔ **已归档（2026-04-19）**：本文件原是 v10.0 IA 的配套 UI 提示词集，现 v10 已被
> **`docs/v11.0-final-chapter-rfc.md`** 取代。
> v11.0 砍掉了 Team Workspace / Discover / Intents / Project Library / Agent Task Center 等大半页面。
> 现役 UI 提示词请见 **`docs/v11.0-figma-prompts.md`**（待出，结构沿用本文件 §0/§1/§2，
> 但 §5 页面级提示词只保留 Home / Studio / Ledger / Card / Pricing / Settings 六页）。
> 风格 DNA（Monochrome Geek + Geist Mono + Apple Blue 单主色）100% 沿用，无需重做 token。

# VibeHub v10.0 Figma / AI UI 生成提示词集

> 版本：v10.0（**已归档**）
> 用途：曾用于喂给 Figma Make / v0 / Galileo / UIzard 生成 v10 UI。
> 风格 DNA 来源：仓库 `DESIGN.md` + `web/src/app/globals.css`。参照公司：Linear / Vercel / Raycast / Supabase Studio / GitHub Primer。
> 配合 IA：`docs/ia-v10-refactor-plan.md`（同样已归档）。

---

## 0. 风格 DNA 锚定提示词（**每次开新 Figma 文件之前先贴这段**）

```text
You are generating UI for "VibeHub v10.0" — a China-first collaboration
platform for small developer teams (2–10 people) where humans and AI agents
co-work. It is NOT a forum, NOT GitHub, NOT an IDE, NOT a chat app.

Design DNA (obey strictly):
- Aesthetic: "Monochrome Geek Dark". A dense developer tool, not a social app.
- Primary reference stack, weighted:
    Linear app UI (40%) — density, tabs, activity stream, command palette
    Vercel marketing (25%) — hero restraint, Geist typography, quiet black
    Raycast (15%) — global create menu, drawers, keyboard UI
    Supabase Studio (10%) — data tables, status pills, empty states
    GitHub Primer (10%) — admin tables, governance surfaces
- Do NOT borrow:
    No Linear purple gradient heroes
    No Vercel conic/3D background art
    No SaaS glow, no neon, no bright gradient CTAs
    No Notion-style illustrations
    No rounded-full pastel buttons

Palette (dark mode only, near-black canvas):
- Canvas #09090B
- Surface #101014, Surface Hover #17171C, Elevated #16161C
- Border rgba(255,255,255,0.08), Border Strong rgba(255,255,255,0.16)
- Text Primary #EDEDED, Secondary #A1A1AA, Tertiary #71717A, Muted #52525B
- Accent Apple Blue #0071e3 (single primary CTA color)
- Accent Violet #a78bfa (teams/collaboration)
- Accent Cyan #22d3ee (discovery/discussions)
- Success #34d399, Warning #fbbf24, Error #f87171, Info #60a5fa

Typography:
- UI: Inter, weight 400/500/600; tracking -0.02em on headings
- Code / tags / slugs / timestamps: Geist Mono (mandatory)

Shape & elevation:
- Flat. Elevation by border, not by shadow.
- Radii: 6/8/12 for UI elements, 16/24 only for hero panels
- Buttons and pills use 6–8; avoid rounded-full except for avatars and tags

Density rules:
- Desktop base = 14px body, 12px caption, 13px table cell
- 8-pt grid spacing
- Card padding 16–20; section spacing 32–64
- Never use animated backgrounds or parallax

Copy rules:
- Chinese-first, but UI structure must be English-compatible
- Numbers, dates, code, IDs always in Geist Mono

Produce pixel-precise, dev-handoff-ready frames. No decorative illustrations.
No mock data that contradicts state semantics (empty = truly empty).
```

---

## 1. Design Tokens 提示词（导入 Figma Variables）

```text
Create Figma Variables (modes: "dark" only for v10.0; reserve "light" mode but leave empty).
Collections and variables:

1) color/bg
   canvas = #09090B
   surface = #101014
   surface-hover = #17171C
   elevated = #16161C
   subtle = rgba(255,255,255,0.03)

2) color/text
   primary = #EDEDED
   secondary = #A1A1AA
   tertiary = #71717A
   muted = #52525B
   inverse = #000000
   on-accent = #FFFFFF

3) color/border
   default = rgba(255,255,255,0.08)
   subtle = rgba(255,255,255,0.04)
   strong = rgba(255,255,255,0.16)
   focus-ring = rgba(255,255,255,0.32)

4) color/accent
   apple = #0071e3
   apple-hover = #0062cc
   apple-subtle = rgba(0,113,227,0.12)
   violet = #a78bfa
   violet-hover = #8b5cf6
   violet-subtle = rgba(167,139,250,0.10)
   cyan = #22d3ee
   cyan-hover = #06b6d4
   cyan-subtle = rgba(34,211,238,0.10)

5) color/semantic
   success = #34d399 / subtle rgba(52,211,153,0.10)
   warning = #fbbf24 / subtle rgba(251,191,36,0.10)
   error   = #f87171 / subtle rgba(248,113,113,0.10)
   info    = #60a5fa / subtle rgba(96,165,250,0.10)

6) radius
   xs=2 sm=4 md=6 lg=8 xl=12 2xl=16 3xl=24 pill=9999

7) shadow
   card = none
   modal = 0 20px 60px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.10)

8) space (8pt scale)
   1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64 20=80

9) text/family
   sans = Inter
   mono = Geist Mono

10) text/size
    micro=11 caption=12 body-sm=13 body=14 body-lg=16
    h4=18 h3=22 h2=28 h1=36 display=48

Bind every component style to these variables. Do NOT inline hex.
```

---

## 2. 组件库提示词（一次性生成 Component Library）

```text
Generate a Figma component library named "VibeHub/UI v10". Every component
must have variants for: size (sm/md/lg), state (default/hover/active/disabled/focus),
and where applicable, tone (neutral/apple/violet/cyan/success/warning/error).

Components to produce (dev-handoff ready, auto-layout everywhere):

A. Primitives
- Button (primary / secondary / ghost / destructive; sizes sm 28, md 32, lg 40)
  * Primary = filled white on bg-canvas, text inverse
  * Apple-accent CTA = filled #0071e3 with on-accent text
  * Secondary = transparent + border-default
  * Ghost = transparent + text-secondary
- IconButton 28/32/40; square, radius-md
- Input (text / search / password); left icon slot; focus ring 1px rgba(255,255,255,0.32)
- Textarea; 3-line default
- Select (custom dropdown styled like Linear's, not native chevron-heavy)
- Checkbox, Radio, Toggle (all using border-first style, no inner shadow)
- Avatar (sm 20, md 28, lg 40, xl 64) + AvatarStack
- Badge (pill) tones × solid/subtle
- StatusPill (specific): `draft / public / private / open-source / archived / open / accepted / declined / expired / blocked / pending / running / pending-confirm / done / failed`
- Tag (mono font, pill, tone neutral by default)
- Tooltip (surface-elevated, radius-md, 4px padding-x 8)
- Kbd (mono font pill, border-default, 11px)
- Divider (horizontal / vertical, border-subtle)
- Skeleton (subtle animated shimmer, 1.4s linear, opacity 0.3–0.7)
- EmptyState (icon 32 + title h4 + 1-line description + optional CTA)
- Toast (success/info/warning/error; bottom-right; auto-dismiss indicator bar)
- ConfirmDialog (title + body + destructive CTA with typed confirmation)

B. Shell & Layout
- TopNav (two modes: guest, authed). See §3 prompt.
- LeftRail (Workspace Console left rail, 220px). See §4 prompt.
- ConsoleShell = LeftRail + Main + RightRail (320px collapsible)
- PageHeader (title + subtitle + filter slot + primary action slot)
- SectionCard (surface + 1px border + 16–20 padding; no shadow)
- WorkspaceTopBar (info strip: name, project, counts, actions)
- ComplianceStrip (data region, cross-border flag, model filing, audit retention)
- ViewTabs (query-string driven, underline indicator, uses `motion.layoutId`)
- DrawerSheet (right-side on desktop 480px; bottom-sheet on mobile)
- CommandPalette (like Raycast, 640px, with group headers)

C. Domain cards
- ProjectCard v2 (cover 16:9 top / title / author chip / type / visibility badge /
  license mono tag / collab status pill / recommendation signal bar /
  description 2-line clamp / primary CTA "查看详情" / secondary CTA "协作意向")
- IntentCard (three-paragraph: pitch / whyYou / howCollab; four actions:
  接受 / 婉拒 / 忽略 / 拉黑并举报; status pill; timestamps)
- TaskCard (actor avatar + action verb + target + state pill + time + confirm CTA)
- ActivityEvent (actor + verb + target + audit envelope chips:
  workspaceId / snapshotId / agentBindingId; mono timestamp)
- SnapshotCard (title / intent 1-line / previous-snapshot link /
  artifact count chip / deliverable status pill)
- AgentBadge (role: Reader / Executor / Reviewer / Coordinator; icon + mono label)
- NotificationRow (category icon + sentence + time + link target)

All components must snap to 8-pt grid and consume color/radius/space tokens.
```

---

## 3. 顶栏提示词（TopNav — Guest & Authed）

```text
Design the VibeHub v10.0 top navigation bar, sticky, height 56.

Guest variant (未登录):
- Left: Logo mark (bolt icon inside a 28px rounded-md surface with 1px border) + "VibeHub"
- Center: pill-shaped nav group on color/bg/surface with 1px border-default, 4px padding.
  Items (equal width ~108px): 首页 · 发现 · 定价
  Active item = color/bg/elevated + border-strong + text-primary, using a
  shared layoutId pill indicator (Framer Motion).
- Right: search bar (240px, text-xs placeholder, ⌘K kbd chip), language toggle
  (EN/中), "登录" ghost button, "免费注册" primary button (apple-accent).
- No notification bell, no avatar, no create menu.

Authed variant (已登录):
- Left: Logo (same)
- Center: pill nav group (items: 发现 · 工作台 · 项目库)
- Right, in order:
  1) Search bar (same)
  2) [+ 创建] dropdown button (white fill on black, chevron).
     Menu items (256px width):
       - 新建项目 (FolderPlus icon + desc "创建草稿/已公开项目")
       - 新建 Team Workspace (Users icon + desc "邀请 2-10 人协作")
       - 导入项目 (Download icon + desc "从 GitHub 链接导入只读镜像")
       - divider
       - 发起 Agent 任务 (Bot icon + desc "跨空间单次 Agent 任务")
     Personal Workspace is NOT an option here.
  3) [升级] button — visible only when subscription.tier === 'free'.
     Style: ghost + 1px border-subtle + warning tint text
  4) [🔔] icon button with red-apple dot if unread > 0
  5) [Avatar v] dropdown: user name + email header, then
     个人主页 / 项目库 / 订阅与账单 / 管理后台(admin only) / 退出

Mobile (≤ 768): replace center nav with hamburger; collapse right side
except bell + avatar. "创建" menu becomes a full-width sheet.

Reference: Linear's app header structure + Vercel's marketing nav restraint.
Do NOT use a glassmorphism blur heavier than 8px.
```

---

## 4. Workspace Console Shell 提示词（左栏 + 主区 + 右栏）

```text
Design the VibeHub Workspace Console shell used for every /work/** page.

Layout (desktop ≥1280):
[ LeftRail 220 | Main fluid | RightRail 320 collapsible ]

LeftRail (fixed 220, bg color/bg/canvas, right border-default):
- Top: small logo + product name, 40px tall
- Section 1 "Spaces":
    🗂 Personal Workspace          (icon Home, active indicator = 2px left bar in apple-accent)
    👥 Team Workspace               (icon Users)
         ├─ team-alpha               (8px avatar bubble + name)
         ├─ team-beta
         └─ + 新建                   (dashed border, violet-accent)
- Divider
- Section 2 "Work":
    📁 项目库                       — /work/library
    📨 协作意向            [3]      — /work/intents       (red dot if >0)
    🤖 Agent 任务         [2 待确认] — /work/agent-tasks   (warning-tinted chip)
    🔔 通知               [7]       — /work/notifications
- Spacer
- Bottom:
    ⚙️ 设置
    Small user chip (avatar + name + chevron) opening same menu as top-nav avatar

Item row: 36px tall, 10px horizontal padding, radius-md, icon 16, label body-sm.
Active = bg color/bg/surface + text-primary + 2px left bar apple-accent.
Hover = bg color/bg/subtle.
Badges use StatusPill size=xs.

Main region:
- Top: WorkspaceTopBar (48–56 tall), bg color/bg/canvas, border-bottom subtle
- Row 2: ComplianceStrip (24 tall, mono caption, 4 fields separated by
  vertical dividers): 数据区域 · 跨境 · 模型备案 · 审计留存
- Row 3: ViewTabs (48 tall, underline indicator, mono caption counts)
- Below: page content (Activity / Tasks / Files / Snapshots / Members / Agents / Settings)

RightRail (320 collapsible):
- Collapsed state = 48px rail with vertical icons representing each right-rail mode:
  Agent console / Tasks / Files / Snapshots / Activity mini
- Expanded header: "Agent 控制台" + close button
- Expanded sections (stacked):
  1) Agent list (AgentBadge rows + "running 2" / "idle 3" mono counters)
  2) Running tasks (TaskCard xs variant)
  3) Pending confirmations (warning-toned TaskCard + inline approve/reject)
  4) Recent output (3 items, link to /work/agent-tasks?task=...)
  5) Quick "发起任务" button bottom sticky

Scroll behavior: LeftRail + RightRail independently scrollable; Main scrolls in own region.

Do NOT render: live chat input, personal messages, any "DM" concept.
```

---

## 5. 页面级提示词（逐页，可单独使用）

> 每页提示词自带所需 section、空态、禁止项、移动端降级。

### 5.1 Home `/` — 公开层

```text
Design VibeHub Home "/" as a product-explanation page, NOT a community
feed. Breakpoints: 1440 / 1024 / 375.

Sections, top to bottom, each separated by 80px:

1) Hero (full-bleed 600px tall, radius-3xl on container inner)
   - 60/40 split on desktop
   - Left 60%: eyebrow mono caption "中国中文开发者 · 人-Agent 协作平台";
     H1 two lines (display 48/600, tracking -0.02em);
     body-lg 14-line-height description max 520px;
     2 CTAs horizontally:
       CTA1 apple-accent "去发现项目" → /discover
       CTA2 ghost bordered "免费注册" → /signup
     micro note under CTAs: "Free · Pro ¥29/月 · Team Workspace 扩展包"
   - Right 40%: a 480×400 static SVG diagram showing the 5-step main loop:
     Discover → Intent → Workspace → Agent Task → Snapshot/Deliverable
     Use mono labels, 1px borders, no gradients.

2) Main-loop section (4 horizontal blocks, equal width)
   Each block = icon 40 + mono step number + h3 title + body-sm description.
   Block 1: 发现项目 (Compass icon, cyan accent)
   Block 2: 发起协作 (MessageSquarePlus, violet)
   Block 3: Workspace 协作 (Users, apple)
   Block 4: Agent 推进 (Bot, success)

3) Workspace value section (2-column)
   Left card "Personal Workspace": icon + h3 + 4 bullets
     · 项目驾驶舱：任务 + Agent 执行卡片流
     · 快照与交付记录
     · 存储用量可见
     · 绑定 Agent 独立审计
   Right card "Team Workspace": icon + h3 + 4 bullets
     · 活动流：只有带审计信封的事件
     · 成员 + Agent 角色统一管理
     · Snapshot Capsule 与 Deliverable 闭环
     · 合规徽条可见（数据区域 / 跨境 / 备案）
   Each card: SectionCard, 24 padding, subtle violet (right) / apple (left) top border 2px.

4) Collaboration demo section (4 static frames in a row, 16:10 aspect)
   Frame 1: team members discussing (mock ActivityStream)
   Frame 2: someone @Agent assigning a task
   Frame 3: Agent progress + AgentActionAudit
   Frame 4: human-confirmation + Snapshot created

5) Trust & Compliance row (single card, 3 columns)
   - 审计 · 权限 · 交付确认
   - 中国数据区域 · 跨境边界
   - AIGC 公示 · 模型登记
   Pull real data from /api/v1/public/compliance at runtime (Figma: placeholder mono values).

6) Pricing teaser (3 small cards, do NOT duplicate full pricing page)
   Free / Pro ¥29 / Team Workspace 扩展包; each card ends with
   "查看完整定价 →" link to /pricing.

7) Footer (4 columns: 产品 / 开发者 / 法律 / 语言与区域) + 底部品牌线

FORBIDDEN in Home:
- NO live project feed
- NO activity/animation backgrounds
- NO leaderboard, NO community metrics ("10k 开发者" etc.)
- NO 3D or conic gradient hero art

Mobile: all sections stack single-column. Hero image moves below copy.
```

### 5.2 Discover `/discover` — 公开层

```text
Design VibeHub Discover "/discover" as a pure project discovery page.

Breakpoints: 1440 / 1024 / 375.

1) Page header (sticky top below TopNav, 120 tall on desktop)
   - Title "Discover" h2 + subtitle body-sm
   - Full-width search input (centered, 720px max) with left Compass icon,
     right kbd chip ⌘K
   - Filter row below: quick tag chips (mono) + sort dropdown + project-type
     toggle group:
       全部 · 正在招募协作 · 开源 · 仅展示 · 最新公开快照 · 高推荐
     Active toggle = color/bg/elevated + border-strong
   - Mobile: collapse filters into a "筛选" DrawerSheet

2) Featured gallery orbit (200px tall)
   - Horizontal scrollable band of 6–8 featured ProjectCard (compact, 320×160)
   - DO NOT auto-rotate; only hover + keyboard arrow scroll
   - Sticky left/right fade masks

3) Project grid
   - 3 columns on 1440, 2 on 1024, 1 on 375
   - Gap 24
   - Each card = ProjectCard v2 (see §2)
   - Grid-item skeletons on loading (6 shimmer cards)

4) Pagination
   - Cursor-based "加载更多" button (ghost) at bottom-center
   - Alternative classic page numbers when URL ?pagination=1 (accessibility)

Empty state (when filters yield 0 results):
  - Icon Compass 32
  - "这里暂时没有匹配的项目"
  - Ghost button "清除所有筛选"

FORBIDDEN:
- NO hero banner on Discover (no big copy above the filters)
- NO activity feed
- NO "creator of the day" or similar social gamification panels
```

### 5.3 Project Detail `/p/[slug]` — 公开层

```text
Design the VibeHub Project Detail page as a conversion page for
Collaboration Intent, NOT a discussion thread.

Layout: main 720 + right sticky rail 320 on desktop 1280+.
Below 1024: right rail moves under section 4.

Main column top-to-bottom:

1) Project info header
   - Breadcrumb mono: Discover / 项目
   - Cover image (16:9, radius-xl, optional)
   - H1 project name + StatusPill (visibility × open-source × collab-open/closed)
   - Meta row: author avatar + name, team chip (if bound), license mono tag,
     "权利主体" line, "最近更新" mono date
   - Primary CTA "发起协作意向" (apple-accent) + secondary "查看公开快照"
     (ghost, only if published snapshots exist) + icon button "收藏"

2) Project showcase
   - Description markdown (body-lg, line-height 1.7, max 720 width)
   - Screenshots gallery (max 6, 16:10, 2-col grid, lightbox on click)
   - "关键特点" bullet list (3–6 items, Check icon + body-sm)
   - "最近更新" 3 latest events (mono timestamps)

3) Project evaluation
   - 3 bars: 完整度 / 可理解度 / 协作意愿度 (score 0-5, mono)
   - Bar style: 200 wide, 4 tall, subtle bg + cyan fill
   - Recommendation signal: small histogram of weekly recommendations

4) 留言 & 纠错 (single list, unified table)
   - Filter: 全部 · 留言 · 纠错 · 仅未处理
   - Each row:
       type badge (留言 / 纠错)
       author avatar + name
       body clamp 3 lines
       StatusPill (open / accepted / dismissed) — ONLY for 纠错 rows
       mono timestamp
   - No nested replies. No thread view. No "+ reply" action.
   - Compose box at top:
       tabbed: "写留言" / "提交纠错"
       max 1000 chars, no attachments

5) 协作意向区 (anchored section, apple-accent top border 2px)
   - Big CTA "发起协作意向" opens three-paragraph DrawerSheet
     (see §5.4 IntentDrawer)
   - Current role demand chips (e.g. "需要：前端 / 产品")
   - "是否开放协作" StatusPill

6) For authorized viewers (owner or team member), show:
   - [查看公开快照] → /p/[slug]/snapshots/[id]
   - [进入工作空间] → /work/team/[teamSlug] or /work/personal

Right rail (sticky):
   - Project at a glance box (mono metrics: 收藏 / 协作意向数 / 快照数 / 最后活动)
   - Author card
   - Related projects (3, ProjectCard compact)

FORBIDDEN:
- NO issue tracker layout
- NO forum-style reply trees
- NO @mentions, NO emoji reactions on the comment list
- Comments do NOT auto-become tasks
```

### 5.4 IntentDrawer 三句式协作意向抽屉

```text
Design a right-side DrawerSheet (480 on desktop, bottom-sheet on mobile)
titled "发起协作意向".

Structure:
- Header: project name + close X
- Body, 3 textarea blocks stacked:
  1) 我是谁 / 我能做什么     (placeholder: "用一句话介绍你自己与你能贡献的能力")
  2) 我为什么联系你         (placeholder: "说明你选择这个项目的理由")
  3) 我希望怎样合作         (placeholder: "描述期望的协作形式与节奏")
  Each textarea: 3 rows, max 250 chars, live counter bottom-right (mono),
  red when exceed.
- No URL / email / phone / WeChat fields. Inline warning if user pastes such.
- Footer:
  Left: "每句最长 250 字 · 不支持附件和外链"
  Right: 取消 (ghost) + 发起协作意向 (apple-accent primary)

Success state (after submit):
  Replace body with a success panel:
    CheckCircle 32
    "已发送。对方可以接受、婉拒、忽略或拉黑并举报。"
    "30 天未处理将自动过期。"
    two buttons: "查看我的发出记录" → /work/intents?tab=sent ; "关闭"

Block-and-report flow is on the receiver side (see §5.6), not here.
```

### 5.5 Personal Workspace `/work/personal` — 工作层

```text
Design the Personal Workspace cockpit. Use ConsoleShell.

WorkspaceTopBar:
- Left: Home icon + "我的工作区" + current project selector (dropdown chip)
- Mono metric chips: 3 Agents · 18 快照 · 2.3/5 GB
- Right: quick action buttons: 新建项目 · 上传 · 创建快照

ComplianceStrip: hidden for Personal (Personal is always local-only).

ViewTabs (under top bar): 任务 · 活动流 · 文件 · 快照 · Agent
DEFAULT TAB = 任务 (NOT activity stream).

Main content for "任务" tab (this is the cockpit):
- 4 column groups titled "进行中 / 待确认 / 已完成 / 失败"
- Each column = vertical list of TaskCard (see §2 domain cards)
- TaskCard variant here:
    actor avatar (user or Agent)
    mono verb: "为 @project-x 生成 OpenAPI 文档"
    state pill
    Agent binding chip (AgentBadge)
    short output preview line (clamp)
    footer action: if pending-confirm → [确认] [驳回]; else → [查看详情]
- Empty column = EmptyState inside each lane (icon + 1-line copy)
- No chat input at the bottom. Full stop.

Selecting a TaskCard opens DrawerSheet:
- Tabs: 输入上下文 · 执行过程 · 输出结果 · 审计记录 (AgentActionAudit timeline) · 确认
- Bottom sticky action row with 确认 / 驳回 / 补充指令 (textarea opens inline)

Activity tab: ActivityStream read-only, same events as Team WS but
scoped to personal.
Files tab: WorkspaceArtifact grid.
Snapshots tab: Snapshot timeline (vertical spine).
Agent tab: AgentBadge cards with status + last action.

RightRail: Agent console (default expanded on this page).

Mobile: show a full-page banner "建议在桌面端使用 Workspace Console"
with a link to Personal-only read-only summary page.
```

### 5.6 Team Workspace `/work/team/[slug]` — 工作层（核心）

```text
Design the Team Workspace. Use ConsoleShell.

WorkspaceTopBar:
- Left: team avatar + team name + type pill (startup / studio / opensource)
- Current project selector
- Mono metrics: 6 成员 · 4 Agents · 12.7/20 GB · 48 快照
- Right: 邀请成员 · 上传 · 创建快照 · 发起交付确认

ComplianceStrip (MANDATORY here):
  数据区域 cn · 跨境 ✗ · 模型备案 已登记 · 审计留存 12 个月
  Font: Geist Mono 11; vertical dividers between fields.

ViewTabs: 活动流 · 文件 · 快照 · 任务 · 成员 · Agent · 设置
DEFAULT = 活动流 (NOT "团队会话").

Main content for 活动流:
- List of ActivityEvent rows, reverse-chronological, sticky date dividers
  ("今天" / "昨天" / "本周" / "2026-04-17" mono).
- Each event ONLY if it carries an audit envelope. Allowed kinds:
    讨论 (with audit target=decision-id)
    决策
    @Agent 指派
    Agent 执行
    Agent 输出
    人工确认 / 驳回
    快照创建
    快照发布为公开
    交付确认
    成员变更
- Row layout: actor avatar 28 + verb + mono target chip + status pill + mono time
- Hover shows a "打开" action → opens DrawerSheet with details
- Composer bar (bottom, sticky, 56 tall):
    Options (left to right): 写讨论 · 创建决策 · @Agent 指派 · 创建快照 · 上传
    NOT a chat input. Each option opens a typed composer modal.
    Pressing ⌘K opens the command palette instead.

Files tab: WorkspaceArtifact table (DataTable):
  name / type / size / uploader(user or agent) / updated / actions
  Presigned upload via drop zone at top (accepts drag-drop).

Snapshots tab: vertical SnapshotTimeline with spine + SnapshotCard per node;
diff indicator shows previousSnapshotId link; Deliverable status pill on right.

Tasks tab: Kanban-ish by status; TaskCard + "指派给 Agent" action.

Members tab: members + AgentMemberships merged table (role, permissions,
last active, restriction status).

Agent tab: AgentBadge grid with audit counters and
"revoke / downgrade role / confirm-queue" actions.

Settings tab: team settings form.

RightRail = Agent Console, expanded by default.

FORBIDDEN here:
- NO chat tab
- NO DMs
- NO pure text messages without audit envelopes
- NO emoji reactions on activity events
```

### 5.7 Project Library `/work/library`

```text
Design the Project Library as a management table, inspired by Linear's
Projects page and Supabase Studio's table views.

Top toolbar (sticky):
- Title "项目库" h2
- Right: [新建项目] apple-accent + [导入项目] ghost + search input + filter
- Status tabs: 草稿 · 已公开 · 私有 · 开源 · 已归档 (query: ?status=)

DataTable columns (sortable, mono column headers uppercase 11):
  名称 | 状态 | 可见性 | 许可证 | 绑定 Workspace | 最近更新 | 协作意向数 | 操作

Row:
  - 名称 cell: small cover thumbnail 32×32 + project name + mono slug
  - 状态: StatusPill
  - 可见性: icon (eye/lock/globe) + label
  - 许可证: mono tag
  - 绑定 Workspace: avatar + workspace name + type pill; if multiple would
    appear, show "—" (Projects have ONE workspaceId in v10)
  - 最近更新: mono relative time
  - 协作意向数: mono number; click → /work/intents?tab=received&project=slug
  - 操作: kebab menu (编辑 / 预览 / 发布 / 下线 / 进入 Workspace)

Bulk selection: checkbox column; bulk actions = 归档 / 下线 / 批量标签.

Empty state per status:
  草稿: "还没有草稿。新建一个项目开始。" + [新建项目]
  已公开: "你还没有公开任何项目。" + [发布首个项目]
  etc.

Mobile: DataTable degrades to stacked cards; each card shows name + status
+ last updated + kebab. Other columns fold into expandable details.
```

### 5.8 Collaboration Requests `/work/intents`

```text
Design the global Collaboration Intent inbox.

Top:
- Tabs: 收到的 · 发出的 · 已接受 · 已拒绝 · 已过期 (mono counts)
- Filter: 项目 dropdown, 时间范围 dropdown, 关键词搜索

List: 1-column stream of IntentCard (desktop 840 max, single column).

IntentCard (300–360 tall):
  Header row:
    申请人 avatar + name + mono "→ @project-name"
    StatusPill (open / accepted / declined / ignored / expired / blocked)
    mono timestamp
  Body: 3 paragraphs stacked, each with a mono label prefix
    我是谁·我能做什么 / 我为什么联系你 / 我希望怎样合作
    Each paragraph truncated to 4 lines with "展开"
  Footer actions (only on 收到的 tab & status=open):
    [接受] apple-accent
    [婉拒] ghost
    [忽略] ghost
    [拉黑并举报] error-tinted ghost
  Footer meta: "过期时间: 2026-05-17 (剩 12 天)" mono caption

Empty states:
  收到的: "暂无收到的协作意向。" + small illustration of a paper plane
  已过期: "30 天内未处理将自动过期。" + link 设置通知偏好

Detail drawer (right-side, opens on click):
  same three paragraphs full-length
  conversation log (ONLY 接受后才有，合并进 Team Workspace)
  action history audit

Block-and-report submits to admin-moderation; confirms with a ConfirmDialog
that requires typing "拉黑并举报" to proceed.
```

### 5.9 Agent Task Center `/work/agent-tasks`

```text
Design the cross-workspace Agent Task Center.

Top filter bar:
- Status tabs: 全部 · 进行中 · 待确认 · 已完成 · 失败
- Scope toggle: 全部 / 个人 / 团队
- Agent filter (AgentBadge chips multi-select)
- Space filter (workspace multi-select)

Layout: split view
- Left: list of TaskCard (xs variant, 80 tall, virtualized)
- Right: detail panel (fluid; if no selection, show EmptyState
  "选择一个任务查看详情")

TaskCard (list item):
  发起人 avatar 20 + mono "@space-name"
  action verb truncate
  被指派 AgentBadge
  StatusPill (running / pending-confirm / done / failed)
  mono relative time + confirmation-required dot if needed

Detail panel tabs:
  1) 输入上下文    — rendered markdown + attachments
  2) 执行过程      — AgentActionAudit timeline (each step: actor, tool, output clip)
  3) 输出结果      — latest output, with diff if applicable
  4) 审计记录      — full AgentActionAudit with tool calls and MCP invocations
  5) 确认          — AgentConfirmationRequest status + approve/reject/comment

Approve/reject requires a confirmation dialog when the task touches a
protected resource (snapshot publish, deliverable approval, cross-team push).

Empty list state: icon Bot + "暂无 Agent 任务" + link "发起 Agent 任务"
```

### 5.10 Notifications `/work/notifications`

```text
Design the categorized notification center.

Left rail (secondary, 200 wide, inside Main area, not replacing LeftRail):
  类别导航：
    协作意向 [3]
    留言与纠错 [1]
    团队邀请 [0]
    Agent 完成任务 [5]
    快照确认 [2]
    Deliverable 状态 [0]
    订阅与系统 [1]
  "全部已读" ghost button at bottom.

Main list:
  Each NotificationRow (72 tall):
    category icon + colored left 2px bar
    one-sentence subject (body-sm)
    meta row: actor + mono timestamp + target link
    right: "前往" ghost button → category-specific deep link
  Read vs unread: unread = color/bg/subtle highlight + bold subject

Per-category empty state explains what triggers this category.

Mobile: category nav becomes horizontal scrollable chip row.

Notifications should NEVER carry content payload themselves — they are
pointers. Do not render full intent paragraphs here; link to /work/intents.
```

### 5.11 Settings `/settings`

```text
Design Settings with left nav + right form area, similar to
Vercel/Supabase settings pages but darker and denser.

Left nav (240 wide):
  个人资料        /settings/profile
  账户安全        /settings/account
  订阅与账单      /settings/subscription
  ──────────────
  Agent 接入      /settings/agents       (AgentBinding)
  API Key        /settings/api-keys
  API / MCP      /settings/developers   (migrated from /developers)
  ──────────────
  通知设置        /settings/notifications
  隐私与权限      /settings/privacy
  数据导出        /settings/data-export

Each page = SectionCard with clear h3 + body-sm + form fields.
Form controls: use primitives from §2.
Destructive sections (delete account, revoke all keys) use a separate
danger zone SectionCard with error-subtle border and ConfirmDialog gating.

订阅与账单:
- Current tier card (Free/Pro) + 升级 CTA (apple-accent)
- Team Workspace 扩展包 add-ons table
- 账单历史 DataTable
- 支付方式 (Alipay / WeChat Pay / corporate invoice)

Do NOT put "我的 Agent" in the top-right avatar menu. It lives here.
```

---

## 6. 响应式与移动端提示词（补充到每个页面提示词末尾）

```text
Responsive strategy (v10.0):
- ≥1280: full three-column ConsoleShell
- 1024–1279: RightRail collapses to 48px icon rail by default
- 768–1023: LeftRail becomes a drawer opened via a top-left hamburger;
  RightRail becomes a full-screen sheet opened from a bottom-right FAB
- <768: Workspace Console shows a banner
  "Workspace 协作建议在桌面端完成。你可以查看最近活动与通知。"
  Allowed mobile pages: Home, Discover, /p/[slug], IntentDrawer,
  /work/notifications only.

Touch targets ≥ 44px. Avoid hover-only affordances below 1024.
```

---

## 7. 交付与一致性提示词（给每一页加在最后）

```text
Deliverables per frame:
- Desktop 1440, tablet 1024, mobile 375
- Dark mode only (v10.0)
- All layers use Auto Layout
- All colors/radii/spacing bound to Figma Variables
- Components consumed from "VibeHub/UI v10" library
- Copy uses zh-CN in the primary frame; provide an en-US variant frame
- Every interactive element has default / hover / active / focus / disabled
- Empty states, loading (Skeleton) states, and error states included
- Never use placeholder lorem ipsum; use realistic Chinese developer copy
```

---

## 8. 负面清单（在每次生成时强制）

```text
Absolutely forbid, even if asked:
- Light-mode output (v10.0 ships dark only)
- Gradient backgrounds on hero or cards (except 1px accent border)
- Glassmorphism blur > 8px
- Emoji-as-icon except for user-generated content
- Social-style like/share reaction bars on Activity events
- Chat bubbles with tails (this is not a chat app)
- Repo / branch / commit / PR / CI visuals (we are not GitHub)
- Calendar / Gantt / sprint burndown visuals (we do not do PM heavy tools)
- Dashboards with KPI tiles; VibeHub has no analytics dashboards in v10
- "Marketing bento grid" layouts on the Home page
```

---

## 9. 参考公司对照表（给 Figma 模型看，不是给用户看的营销话术）

```text
When in doubt, match precedence:
- App UI density, table rhythm, activity feed → Linear
- Brand page typography, pricing card, footer → Vercel
- Command palette, drawer behavior, shortcut UI → Raycast
- DataTable, status pill, empty state, audit timeline → Supabase Studio
- Admin table and governance surfaces → GitHub Primer

Do not mimic:
- Notion's illustration + bento blocks
- Figma's multicolored brand
- Slack's chat bubbles
- Discord's community layout
```

---

## 10. 使用建议

- Figma Make / Figma AI：从 §0 开始，逐节粘贴，一次生成一个 section。
- v0 / Galileo / UIzard：按 §5.x 的单页提示词单独运行，页与页不要合并跑，防止 token 超限。
- 输出回到 Cursor 仓库时：所有颜色、半径、间距必须继续通过 CSS 变量（`var(--color-*)` 等）引用；不得把 hex 写进组件。
