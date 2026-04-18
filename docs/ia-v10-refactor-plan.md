# VibeHub v10.0 内容理念与页面地图重构方案

> 版本：v10.0（规划）
> 更新日期：2026-04-18
> 定位：把 VibeHub 从"社区 / 项目 / 团队 / 开发者 / 定价"并列模块结构，重构为围绕
> **项目发现 → 协作意向 → Workspace 协作 → Agent 执行 → 快照与交付**
> 运行的单主线产品。
> 本文件是 IA/页面/数据的唯一事实来源；与 `docs/roadmap-current.md`、`docs/ecosystem-roadmap-v9.0.md` 配合使用。
> 与 `docs/product-strategy-v8.md` 的冻结项（Agent 合法参与人类团队 / 不做代码托管 / 不做 IDE）完全兼容。

---

## 〇、对 v10.0 初版说明的客观审视（必须先落定的 11 条判断）

v10.0 初版说明内部存在若干矛盾与工程现实不匹配的点。在进入 IA 重构之前，本节必须先落定。任何页面/数据/路由设计都以下列 11 条为准。

1. **"搜索" 不做一级导航**。已有 `⌘K` 命令面板 + `/search` 结果页 + Discover 自带搜索条。一级导航避免重复入口。搜索降为顶栏固定搜索条 + 结果页落地。
2. **"创造"更名为"工作台"**。"创造"在中文语境里近似"发帖/发作品"，会与"不做泛发帖社区"的冻结项发生语义冲突。一级入口名用"工作台"（`Workspace`）。"创造"仅在首页 Hero 作为品牌语出现。
3. **已登录访问 `/` 软跳 `/work`**。首页是对未登录用户讲故事的，不是日常协作入口。登录态访问 `/` 一律 302 到 `/work`，Logo 承接"回品牌首页"的低频动作。
4. **Personal Workspace 主区不是"协作会话流"**。Personal Workspace 没有第二个人，消息流=人 vs Agent 对话，与"不做 AI 聊天壳子"冲突。主区改为"**项目驾驶舱**"：任务 + Agent 执行卡片流。任务内部才有活动时间线。
5. **Team Workspace 主区是"活动流"而不是"团队会话流"**。原说明同时把"团队会话流"放在主区与次级 Tab，语义重复且易退化为飞书群。主区改为 `ActivityStream`，只渲染带审计信封的事件；次级 Tab 中不再保留"团队会话"。
6. **Agent → Agent 委派推迟到 v10.1+**。v10.0 只承诺"单 Agent 执行 + 人工确认流"。当前 `AgentActionAudit` / `AgentConfirmationRequest` 不支持多 Agent 双签链路。
7. **项目详情页的"留言 / 纠错"走状态机但不成为 issue tracker**。同一张表、`type ∈ {comment, correction}`、状态 `open / accepted / dismissed`、不支持楼层嵌套、不支持衍生任务（任务必须由项目 owner 在 Workspace 里手建）。
8. **Project 必须有唯一归属 `workspaceId`**。当前 schema 只有 N:N `project-team-link`，无 Workspace 实体。v10.0 P0 必须引入 `Workspace` 与 `Project.workspaceId`，否则"项目库 / 绑定 Workspace / 公开快照"都是伪闭环。
9. **协作意向必须落 `expiresAt` 字段与 `expired` 状态**。否则"已过期" Tab 永远为空。默认 30 天过期，过期由 lazy check + cron 协同。
10. **"Agent"在 v10.0 必须固化为三个独立概念**，UI 文案禁止混用：
    - Agent 绑定（`AgentBinding`，用户级，Settings）
    - Agent 成员（`TeamAgentMembership` / Personal Workspace 内的 agent 身份）
    - Agent 任务（跨空间的 `AgentActionAudit + AgentConfirmationRequest` 执行实例）
11. **移动端 v10.0 只交付阅读 + 意向转化**。Workspace Console 的三栏移动化在 v10.1。v10.0 在手机上对 `/work/**` 直接提示"建议在桌面端使用"。

---

## 一、当前 IA vs 新 IA 差距分析

### 1.1 当前实际 IA

仓库当前顶栏（`web/src/components/site-nav.tsx`）是 v8 五段式：`广场讨论 / 项目 / 团队 / 开发者 / 定价`。实际落地路由分布：

- 公开发帖：`/discussions`、`/discussions/new`、`/discussions/[slug]`
- 项目：`/discover`、`/projects`、`/projects/new`、`/projects/[slug]`、`/projects/[slug]/edit`
- 团队：`/teams`、`/teams/new`、`/teams/[slug]`、`/teams/[slug]/tasks/[taskId]`、`/teams/[slug]/agents`、`/teams/[slug]/settings`
- 开发者：`/developers`、`/developers/api-docs`
- 商业：`/pricing`、`/checkout/sandbox`
- 合规：`/aigc`、`/rules`、`/privacy`、`/terms`
- 辅助：`/leaderboards`、`/collections`、`/creators/[slug]`、`/workspace/enterprise`、`/enterprise/verify`
- 个人：`/settings/*`、`/notifications`、`/search`
- 后台：`/admin/*`

数据侧当前已有 `AgentBinding`、`TeamAgentMembership`、`AgentActionAudit`、`AgentConfirmationRequest`、`Project`、`Team`、`CollaborationIntent`（单 `message` 字段）。
**尚未落地**：`Workspace`、`WorkspaceArtifact`、`SnapshotCapsule`、`Deliverable`、三种 `*Restriction`。

### 1.2 差距表

| 维度 | 当前 | v10.0 目标 | 差距类型 |
| --- | --- | --- | --- |
| 主链路 | 五段并列，无主线 | Discover → Project Detail → Collaboration Intent → Workspace → Agent Task → Snapshot/Deliverable | 重建 |
| Home | 四支柱 + Feed + 对比表 | 产品解释 + 主链路展示 + Workspace 价值 + 合规 + 定价 | 重写 |
| Discover | 项目 Feed + Hero 偏社区 | 纯项目发现中心 | 局部重构 |
| Project Detail | 展示 + 意向 + 评论 | + 留言/纠错状态机 + 公开快照 + 进入 Workspace | 补齐 |
| 工作台根入口 | 无 | `/work` Workspace Console | 新增 |
| Personal Workspace | 无 | 项目驾驶舱 + Agent 任务流 | 新增 |
| Team Workspace | `/teams/[slug]` 单页堆叠 | 活动流 + 六类 Tab + Agent 控制台侧栏 | 重构 |
| 项目库 | `/projects` 无状态分区 | 草稿/已公开/私有/开源/已归档 + 绑定 workspace + 意向数 | 升级 |
| 协作意向 | 项目内表单 + admin 审核 | 全局收件箱 + 三句式 + 过期 | 重构 |
| Agent 任务中心 | 散在 `/teams/[slug]/agents` + `/settings/agents` | 跨空间聚合 `/work/agent-tasks` | 新增 |
| 通知 | `/notifications` 单列 | `/work/notifications` 分类聚合 | 升级 |
| 发帖广场 | `/discussions*` 主路径 | 删除 / 降级 | 删除 |
| 开发者中心 | `/developers` 一级 | 迁 `/settings/developers` + Footer | 降级 |
| 数据层 | 无 Workspace / Snapshot / Deliverable / Restriction | 均落库 | 新增 |

---

## 二、新的完整页面地图

### 2.1 公开层（Public）

```
/                         Home（产品解释页，登录态软跳 /work）
/discover                 项目发现中心
/p/[slug]                 项目详情页（从 /projects/[slug] 迁移）
/p/[slug]/snapshots/[id]  公开快照查看（只读）
/u/[slug]                 创作者公开主页（从 /creators/[slug] 迁移）
/pricing                  定价
/search                   全局搜索结果页（⌘K 回车落地）
/login /signup /reset-password
/terms /privacy /rules /aigc   合规与政策
```

### 2.2 工作层（Workspace Console，前缀 `/work`）

```
/work                                     Console 根（落地 Personal 或最后一次 Team）
/work/personal                            Personal Workspace 驾驶舱
/work/personal/projects/[slug]            Personal Workspace 下某项目上下文
  ?view=overview|activity|files|snapshots|agents|tasks
/work/team/[slug]                         Team Workspace 根
  ?view=activity|files|snapshots|members|agents|tasks|settings
/work/library                             我的项目库（跨所有 workspace）
  ?status=draft|public|private|open-source|archived
/work/intents                             协作意向收件箱
  ?tab=received|sent|accepted|rejected|expired
/work/agent-tasks                         Agent 任务中心
  ?status=running|pending-confirm|done|failed
  ?scope=personal|team
/work/notifications                       工作层通知聚合（替代 /notifications）
```

**为什么用 `?view=` 而不是深路由段**：Workspace Console 维持左栏 + 主区 + 右栏三栏布局；`?view=` 不卸载整个 layout，切换 Tab 不闪烁，同时保留浏览器前进后退。

### 2.3 系统层（Settings / Admin）

```
/settings                        设置主页
/settings/profile                个人资料
/settings/account                账户安全
/settings/subscription           订阅与账单（承接"升级"按钮）
/settings/agents                 Agent 绑定（AgentBinding）
/settings/api-keys               API Key
/settings/developers             API / MCP（从 /developers 迁过来）
/settings/notifications          通知设置
/settings/privacy                隐私与权限
/settings/data-export            数据导出
/admin/**                        保留，仅对 admin 可见
```

### 2.4 必须删除 / 合并 / 降级 / 迁移

| 现路由 | 处置 | 原因 |
| --- | --- | --- |
| `/discussions`, `/discussions/new`, `/discussions/[slug]` | 删除前端 + 保留后端只读导出 | v10 冻结泛发帖 |
| `/projects` | 迁移到 `/work/library` | 项目管理属于工作层 |
| `/projects/new` | 迁移到全局创建菜单 + `/work/library/new` | 公开层不承载发布 |
| `/projects/[slug]` | 迁移到 `/p/[slug]` | 公开层 URL 简化 |
| `/projects/[slug]/edit` | 迁移到 `/work/library/[slug]/edit` | 管理在工作层 |
| `/teams*` | 迁移到 `/work/team/[slug]` + `?view=` | 团队即 Team Workspace |
| `/teams/new` | 迁移到 `/work/team/new` | |
| `/developers*` | 降级为 Footer 链接 + 迁 `/settings/developers` | 开发者不是主线 |
| `/leaderboards`, `/collections*` | 从顶栏/首页撤下，保留为 Discover 次级 Tab 或 Footer | 非主链路 |
| `/workspace/enterprise` | 合并到 `/admin/enterprise` 或 `/settings/enterprise` | 空壳 |
| `/notifications` | 301 到 `/work/notifications` | 工作层承接 |
| `/creators/[slug]` | 301 到 `/u/[slug]` | URL 简化 |
| `/search` | 保留但移出顶栏 | ⌘K 结果落地 |
| `/aigc`, `/rules`, `/privacy`, `/terms` | 保留 | 合规 |
| `/admin/**` | 保留 | 后台 |

---

## 三、顶层导航与登录后导航重构

### 3.1 未登录顶栏

```
[Logo]  首页  发现  定价  [搜索 ⌘K]                          [登录] [免费注册]
```

没有"搜索"一级 tab；搜索是右侧固定搜索条 + `⌘K`。

### 3.2 已登录顶栏

```
[Logo]  发现  工作台  项目库      [搜索 ⌘K]   [+ 创建 v]   [升级]   [🔔]   [头像 v]
```

**变化点**：
- 去掉"首页"一级（访问 `/` 自动跳 `/work`）
- 去掉"搜索"一级（改搜索条）
- "工作台"= `/work`
- 新增"项目库"= `/work/library`（高频入口）
- 右上角顺序：创建 → 升级（仅 Free）→ 通知 → 头像

### 3.3 全局创建菜单 `[+ 创建]`

```
▸ 新建项目                → /work/library/new
▸ 新建 Team Workspace     → /work/team/new
▸ 导入项目                → /work/library/import
──────────────────────────
▸ 发起 Agent 任务         → /work/agent-tasks/new
```

Personal Workspace 不在菜单里（每人 1 个，系统自动创建）。

### 3.4 已登录右上角规则

| 元素 | 条件 | 行为 |
| --- | --- | --- |
| `[+ 创建]` | 恒显 | 创建菜单 |
| `[升级]` | `subscription.tier === 'free'` | → `/settings/subscription` |
| `[🔔]` | 恒显 | 已登录未读徽标 |
| `[头像]` | 恒显 | 个人主页 / 项目库 / 设置 / Admin / 退出 |

### 3.5 Workspace Console 左栏

```
[Logo 小]
──────────
🗂  Personal Workspace
👥  Team Workspace
     ├─ team-alpha
     ├─ team-beta
     └─ + 新建
──────────
📁  项目库
📨  协作意向        [3]
🤖  Agent 任务      [2 待确认]
🔔  通知            [7]
──────────
⚙️  设置
```

左栏是全局，不是某空间的二级导航。徽标必须来自真实 API，禁止伪数据。

---

## 四、逐页重构说明（布局层）

### 4.1 Home `/`

**目标**：产品解释页。对已登录用户软跳 `/work`。

**区块顺序**：
1. **Hero**（60/40）：左 = 1 句主标 + 2 句副标 + 2 CTA；右 = 协作链静态 SVG
   - 未登录 CTA1 "去发现项目" → `/discover`；CTA2 "免费注册" → `/signup`
2. **主链路 4 段横向图**（Discover → Intent → Workspace → Agent Task）
3. **Workspace 价值区**（Personal / Team 两栏）
4. **协作演示区**（讨论 / @Agent / Agent 汇报 / 确认交付，静态 4 张）
5. **可信与合规区**（审计 / 权限 / 交付确认 / 中国化合规，来源 `/api/v1/public/compliance`）
6. **定价入口**（Free / Pro / Team Workspace 扩展包精简对比 → `/pricing`）
7. Footer

**删除**：HomeFeedSection、四支柱、差异化对比表（迁 `/pricing`）。

**禁止**：内容流、发帖入口、社交数字。

### 4.2 Discover `/discover`

**区块**：
1. 页头：标题 + 固定搜索条 + 快速筛选 + 排序 + 类型切换（全部 / 正在招募协作 / 开源 / 仅展示 / 最新公开快照 / 高推荐）
2. Top Gallery Orbit（复用 `ProjectGalleryOrbitShell`，降级动效：hover + 键控，不自动轮播）
3. 项目卡片流：封面 / 名 / 作者 / 类型 / 可见性 / 许可证 / 协作状态 / 推荐信号 / 描述 / 主 CTA "查看详情" / 次 CTA "协作意向"
4. 翻页 + cursor 加载更多

**删除**：Discover 页首 Hero-like 动效段落。

### 4.3 Project Detail `/p/[slug]`

**布局**：单列 + 右侧 sticky 栏。

1. 顶部项目信息区（名 / 作者 / 状态 / 可见性 / 许可证 / 权利主体 / 是否接受协作）
2. 项目展示区（介绍 / 截图 / 关键特点 / 最近更新）
3. 项目评价区（推荐信号；三维度：完整度 / 可理解度 / 协作意愿度）
4. 留言 + 纠错区（同表不同 type；状态 `open / accepted / dismissed`；无楼层；按 §〇.7）
5. 协作意向区（三句式主 CTA；当前角色需求；开放/关闭状态）
6. 有权限用户：`[查看公开快照]` → `/p/[slug]/snapshots/[id]`；`[进入工作空间]` → `/work/team/[teamSlug]` 或 Personal

### 4.4 Workspace Console `/work`

**落地规则**：
- 未绑定 Team Workspace：默认 `/work/personal`
- 有 Team Workspace：默认"最后一次打开的"，无记忆时优先 Personal

**整体布局**：`窄左栏 (220px) + 主区 (自适应) + 右上下文栏 (320px，可折叠)`。

#### 4.4.1 Personal Workspace `/work/personal`

**顶部信息条**：空间名 / 当前项目 / Agent 数 / 快照数 / 存储用量 / 快捷动作（新建项目 / 上传 / 创建快照）。

**中部主区 = 项目驾驶舱**（§〇.4）：
- Tab：`任务 | 活动流 | 文件 | 快照 | Agent`
- 默认 Tab = 任务
- 任务 Tab：按"进行中 / 待确认 / 已完成 / 失败"分组；每条卡片：被指派 Agent + 输入摘要 + 最新状态 + 确认按钮
- 活动流 Tab：只读，不做聊天输入

**底部输入区**：仅在选中某任务详情时出现；提供"追加指令 / 附加上下文 / 上传 / 创建子任务"。

**右栏**：绑定 Agent / 当前任务 / 最近文件 / 最近快照。

#### 4.4.2 Team Workspace `/work/team/[slug]`

**顶部信息条**：团队名 / 类型 / 当前项目 / 成员数 / Agent 数 / 存储用量 / 快捷动作（邀请成员 / 上传 / 创建快照 / 发起交付确认）。

**合规徽条**：顶部信息条下方灰色徽条，数据区域 / 跨境 / 模型 / 审计留存范围。
来源：`/api/v1/public/compliance` + `Team.dataRegion / crossBorderEnabled`。

**中部主区 = ActivityStream Tab**（§〇.5）：
- Tab：`活动流 | 文件 | 快照 | 任务 | 成员 | Agent | 设置`
- 活动流只接受带审计信封的事件：actor / action / target / 状态 / 时间
- 底部仅支持：写讨论 / 创建决策 / @Agent 指派 / 创建快照 / 上传
- **禁止**纯聊天

**右栏 = Agent 控制台**：Agent 列表 / 运行中任务 / 待确认任务 / 最近输出 / 快速发起任务。

#### 4.4.3 Project Library `/work/library`

顶部工具条：标题 + `[新建项目]` + `[导入项目]` + 搜索 + 筛选 + 状态切换。
分类 Tab：草稿 / 已公开 / 私有 / 开源 / 已归档（`?status=`）。
列表：名 / 状态 / 可见性 / 许可证 / **绑定 Workspace** / 最近更新 / 协作意向数 / `[编辑][预览][发布/下线][进入 Workspace]`。

#### 4.4.4 Collaboration Requests `/work/intents`

Tab：收到的 / 发出的 / 已接受 / 已拒绝 / 已过期。
卡片：申请人 + 项目 + 三句式内容 + 时间 + `[接受][婉拒][忽略][拉黑并举报]`。
动作：
- `POST /api/v1/projects/:slug/intents/:id/accept`
- `... /decline`
- `... /ignore`
- `... /block-and-report`

#### 4.4.5 Agent Task Center `/work/agent-tasks`

顶部筛选：状态 + 归属（个人/团队）+ Agent + 空间。
列表：发起人 / 所属空间 / 被指派 Agent / 状态 / 输出摘要 / 是否需确认 / 关联文件或快照。
详情侧板：输入上下文 / 执行过程 / 输出结果 / 审计记录（`AgentActionAudit` 时间线）/ 确认操作（`AgentConfirmationRequest.approve/reject`）。
新 API：`GET /api/v1/me/agent-tasks` + `POST /api/v1/agent-tasks/:id/confirm`。

#### 4.4.6 Notifications `/work/notifications`

分类：协作意向 / 留言与纠错 / 团队邀请 / Agent 完成任务 / 快照确认 / Deliverable 状态 / 订阅与系统。
每一类链接回主入口（意向→ `/work/intents`、Agent→ `/work/agent-tasks`）。通知本身不是"内容"。

#### 4.4.7 Settings `/settings`

左栏：个人资料 / 账户安全 / 订阅与账单 / Agent 接入 / API / MCP / 通知设置 / 隐私与权限 / 数据导出。
不再把"我的 Agent"放进右上头像菜单，避免与"Agent 成员 / Agent 任务"语义混淆。

---

## 五、必须新增的入口

| 入口 | 现状 | 新增位置 |
| --- | --- | --- |
| 全局创建按钮（项目 / Team Workspace / 导入 / Agent 任务） | 部分有 | 顶栏右上 `[+]` |
| 未登录一级"定价" | 已在 | 保留 |
| 已登录"升级"按钮 | 无统一位置 | 顶栏右上，仅 Free |
| 项目发布入口 | 仅顶栏 + `/projects/new` | `/work/library` 右上角 |
| 协作意向收件箱（全局） | 仅项目内 + admin | `/work/intents` |
| Agent 任务中心（跨空间） | 分散 | `/work/agent-tasks` |
| Project Library 状态分区 | 无 | `/work/library?status=` |
| 公开快照查看 | 无 | `/p/[slug]/snapshots/[id]` |
| "进入工作空间"按钮 | 项目页缺 | `/p/[slug]` 顶栏右侧 |
| 合规徽条 | 无 | Team Workspace 顶信息条下 |
| 软跳 `/` → `/work` | 无 | `middleware.ts` |

---

## 六、旧页面处置决议

| 旧页面 | 处置 | 原因 |
| --- | --- | --- |
| `/discussions*` | 删除前端，DB 保留（admin 导出） | v10 冻结泛发帖 |
| `/projects`, `/projects/new`, `/projects/[slug]`, `/projects/[slug]/edit` | 迁移到 `/work/library` 与 `/p/[slug]` | 公开与管理分层 |
| `/teams*` | 迁移到 `/work/team/[slug]?view=` | Team Workspace 主产品 |
| `/developers*` | 迁移到 `/settings/developers` + Footer | 降级 |
| `/notifications` | 301 到 `/work/notifications` | 工作层承接 |
| `/leaderboards`, `/collections*` | 从顶栏/首页撤下 | 非主链路 |
| `/workspace/enterprise` | 合并到 `/admin/enterprise` 或 `/settings/enterprise` | 空壳 |
| `/enterprise/verify` | 保留在 `/settings/enterprise` 下 | 合规流转 |
| `/creators/[slug]` | 301 到 `/u/[slug]` | URL 简化 |
| `/aigc`, `/rules`, `/privacy`, `/terms` | 保留 | 合规必须 |
| `/search` | 保留，移出顶栏 | 不占一级入口 |
| `/admin/**` | 保留 | 后台 |

---

## 七、必须抽象为设计系统的组件

| 组件 | 用途 | 现状 |
| --- | --- | --- |
| `PageHeader` | Discover / Library / Intents / Agent Tasks 页头 | 散落 |
| `ConsoleShell`（左栏+主+右栏） | 所有 `/work/**` 外壳 | 无 |
| `WorkspaceTopBar` | Workspace 顶部信息条 | 无 |
| `ViewTabs` | `?view=` 驱动的 Tab | 部分散落 |
| `ActivityStream` | 带审计信封的事件渲染 | 无 |
| `TaskCard` + `TaskTimeline` | Agent 任务卡片与时间线 | 仅团队有 |
| `AgentBadge` | Reader / Executor / Reviewer / Coordinator | 分散 |
| `IntentCard` | 三句式协作意向 | 有表单无卡 |
| `ComplianceStrip` | 合规徽条 | 无 |
| `StatusPill` | `draft/public/private/...` 状态 | 分散 |
| `DrawerSheet`（桌面右抽屉 + 移动底抽屉） | 意向与 Agent 任务详情 | 无统一 |
| `ConfirmDialog` | Agent 高风险确认 | `ui/modal.tsx` 接近 |
| `DataTable` | Library / Admin / Agent Tasks | admin 各自写 |
| `EmptyState` | 空态 | 分散 |
| `ProjectCard v2` | 含协作状态 / 许可证 / 推荐信号 | 现 `project-card.tsx` 需扩字段 |

验收：所有 `/work/**` 新页面**只能**由该组件集组装；页面文件里不允许内联骨架。

---

## 八、前后端数据链路与状态流转

### 8.1 新增数据对象

```prisma
model Workspace {
  id                   String   @id @default(cuid())
  type                 WorkspaceType
  ownerUserId          String?
  teamId               String?
  storageUsedBytes     BigInt   @default(0)
  storageQuotaBytes    BigInt   @default(0)
  dataRegion           String   @default("cn")
  crossBorderEnabled   Boolean  @default(false)
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
enum WorkspaceType { personal team }

model WorkspaceArtifact {
  id                     String   @id @default(cuid())
  workspaceId            String
  name                   String
  path                   String
  mimeType               String?
  sizeBytes              BigInt
  createdByUserId        String?
  createdByAgentBindingId String?
  storageObjectKey       String
  createdAt              DateTime @default(now())
}

model SnapshotCapsule {
  id                     String   @id @default(cuid())
  workspaceId            String
  title                  String
  intent                 String
  previousSnapshotId     String?
  artifactIds            String[]
  createdByUserId        String?
  createdByAgentBindingId String?
  lastConfirmationId     String?
  publishedToProjectId   String?
  createdAt              DateTime @default(now())
}

model Deliverable {
  id                 String   @id @default(cuid())
  snapshotId         String
  status             DeliverableStatus
  confirmedByUserId  String?
  confirmedAt        DateTime?
  note               String?
}
enum DeliverableStatus { pending approved rejected rolled_back }

model UserRestriction  { id String @id @default(cuid()) userId String type String reason String expiresAt DateTime? }
model TeamRestriction  { id String @id @default(cuid()) teamId String type String reason String expiresAt DateTime? }
model AgentRestriction { id String @id @default(cuid()) agentBindingId String type String reason String expiresAt DateTime? }
```

### 8.2 既有对象升级

- `Project`：增 `workspaceId`（FK）、`visibility (draft|public|private)`、`isOpenSource`、`licenseSpdx`；N:N `project-team-link` 标记 `@deprecated`，仅读路径保留。
- `Team`：增 `dataRegion`、`crossBorderEnabled`。
- `CollaborationIntent`：增 `pitch / whyYou / howCollab / expiresAt`，`status` 扩展为 `open|accepted|declined|ignored|expired|blocked`；旧 `message` 仅兼容读取。
- `TIER_LIMITS`：增 `workspaceStorageMb`、`maxSnapshots`、`maxAgentsPerTeam`。

### 8.3 新 REST 接口

```
GET  /api/v1/me/workspaces
GET  /api/v1/me/workspaces/personal
GET  /api/v1/workspaces/:id
GET  /api/v1/workspaces/:id/artifacts
POST /api/v1/workspaces/:id/artifacts/presign
GET  /api/v1/workspaces/:id/snapshots
POST /api/v1/workspaces/:id/snapshots
POST /api/v1/workspaces/:id/snapshots/:sid/publish-public
POST /api/v1/workspaces/:id/snapshots/:sid/rollback

GET  /api/v1/me/intents?tab=
POST /api/v1/projects/:slug/intents                       (新三句式)
POST /api/v1/projects/:slug/intents/:id/accept
POST /api/v1/projects/:slug/intents/:id/decline
POST /api/v1/projects/:slug/intents/:id/ignore
POST /api/v1/projects/:slug/intents/:id/block-and-report

GET  /api/v1/me/agent-tasks?status=&scope=
POST /api/v1/agent-tasks/:id/confirm
POST /api/v1/agent-tasks/:id/reject

GET  /api/v1/public/compliance
GET  /api/v1/public/projects/:slug/snapshots/:id
GET  /api/v1/me/library?status=
```

### 8.4 状态机（前后端必须一致）

- `CollaborationIntent`: `open → accepted | declined | ignored | blocked | expired`
- `SnapshotCapsule`: `draft → published(workspace) → published-public?`
- `Deliverable`: `pending → approved | rejected | rolled_back`
- `AgentConfirmationRequest`: `pending → approved | rejected | expired`
- `Project.visibility`: `draft → public | private`；`isOpenSource` 为正交位
- `*Restriction`: `active | expired | lifted`

### 8.5 审计命名空间

```
workspace.artifact.*
workspace.snapshot.*
collab.intent.*
restriction.*
agent.task.*     (新增)
```

### 8.6 前端数据合同红线

- 计量/状态/徽标禁止 mock
- Workspace Console 左栏三个徽标（意向 / Agent 任务 / 通知）必须来自 `/api/v1/me/*`
- 合规徽条必须来自 `/api/v1/public/compliance` + `Team.dataRegion`
- Project Library "绑定 Workspace" 必须来自 `project.workspaceId`

---

## 九、v10.0 可执行重构路线图（按依赖闭环，非日历）

### P0 · 收口与止血

- 新建 `Workspace / WorkspaceArtifact / SnapshotCapsule / Deliverable / *Restriction` schema + migration
- 为所有 User 建 Personal Workspace，为所有 Team 建 Team Workspace（backfill）
- `Project.workspaceId` + backfill
- `CollaborationIntent` 新三字段 + `expiresAt`
- `middleware.ts`：已登录访问 `/` → `/work`
- 顶栏 `site-nav.tsx` 改为 §3.1 / §3.2 形态
- 风险：backfill 失败 → smoke：`smoke:v10-personal-workspace-backfill`

### P1 · 工作层外壳 + Personal Workspace 首屏

- `ConsoleShell` + `WorkspaceTopBar` + `ViewTabs` + `ActivityStream` 基础版
- 新路由 `/work`、`/work/personal`、`/work/personal/projects/[slug]?view=`
- `/notifications` → `/work/notifications`（301）
- 全局 `[+ 创建]`

### P2 · Home / Discover 叙事收口 + Project Library

- Home 按 §4.1 重写
- Discover 按 §4.2 收紧
- `/work/library` 上线（`?status=`、绑定 Workspace 真实）
- `/projects` → `/work/library`；`/projects/[slug]` → `/p/[slug]` 重定向

### P3 · Project Detail + 三句式协作意向闭环

- `/p/[slug]` 重构：留言 / 纠错 / 评价 / 三句式意向 / 公开快照入口
- `CollaborationIntent v2` 前后端对齐
- `/work/intents` 上线（5 tab 真实）

### P4 · Team Workspace 升级 + Snapshot / Deliverable MVP

- `/teams/[slug]` → `/work/team/[slug]?view=`
- 七 Tab：活动流 / 文件 / 快照 / 任务 / 成员 / Agent / 设置
- 删除"团队会话" Tab
- `WorkspaceArtifact` 上传（presign）
- `SnapshotCapsule` 创建 / 查看 / 回滚
- `Deliverable` 状态与确认 UI
- `ComplianceStrip` 上线

### P5 · Agent 任务中心（跨空间）+ 通知分类

- `/work/agent-tasks` 聚合视图
- 新 API `/api/v1/me/agent-tasks`、`/api/v1/agent-tasks/:id/confirm`
- `/work/notifications` 分类聚合

### P6 · 降级与清理

- 删除 `/discussions*` 前端；保留后端仅 admin 导出
- `/developers*` → `/settings/developers`
- `/workspace/enterprise`、`/leaderboards`、`/collections/*` 从顶栏/首页撤下
- `/creators/[slug]` → `/u/[slug]`（301）

### P7 · 治理与合规可见化收尾

- `UserRestriction / TeamRestriction / AgentRestriction` 后台管理
- `/api/v1/public/compliance` 稳定源
- `AgentActionAudit` 时间线在 Agent 任务详情渲染

### P8 · 移动端（v10.1，不是 v10.0 必达）

- Workspace Console 抽屉化
- Agent 右栏 → 底部弹层
- 任务中心单列

---

## 十、成功判定（硬条件）

1. 顶栏未登录五段、已登录四段 + 右上四件套，与 §3 一致；未登录无"搜索"与"创造"一级。
2. 已登录访问 `/` 一定落 `/work`。
3. Home 不再有 feed / 排行 / 动态。
4. Discover 首页无 Hero 大图文。
5. 所有 `/work/**` 页由 `ConsoleShell` 渲染；左栏徽标真实。
6. Discover → `/p/[slug]` → 三句式意向 → `/work/intents` 漏斗端到端可跑；最终状态写入 `CollaborationIntent v2`。
7. Team Workspace 能跑完"@Agent 指派 → Agent 执行（`AgentActionAudit`）→ 人工确认 → `SnapshotCapsule` → `Deliverable=approved`"。
8. `/discussions*` 前端不可达；`/developers` 一级入口不可见。
9. 列表/徽标/计量无 mock；空态为真实空态。
10. 移动端：Home / Discover / `/p/[slug]` / 意向抽屉 / 通知可用；`/work/**` 移动端允许"建议桌面端使用"提示。

---

## 十一、与既有文档关系

- `docs/product-strategy-v8.md`：不变，v10 继承其全部冻结项。
- `docs/ecosystem-roadmap-v9.0.md`：v10 是 v9 工作层收口版本，v9 的 P0-1/P0-2/P1-1 直接继承到本文件的 P0。
- `docs/roadmap-current.md`：更新主线指针指向本文件。
- `docs/ia-v10-refactor-plan.md`：本文件，v10.0 唯一事实来源。

当本文件与其他文档冲突时，以本文件为准，除非 `docs/launch-readiness-standard.md` 另有更严的合规要求。
