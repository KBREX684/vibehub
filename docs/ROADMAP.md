# VibeHub 优化路线图

> 从 Demo 状态到可公测产品的完整演进路径。

---

## 第一阶段：上线基础线（Foundation）

**目标：** 从 Demo 账号状态到可以对外公测。

| 编号 | 任务 | 优先级 | 难度 | 状态 |
|------|------|--------|------|------|
| F-1 | GitHub OAuth 登录（真实鉴权） | 🔴 P0 | M | ✅ Done |
| F-2 | 创作者档案自助注册与编辑 | 🔴 P0 | S | ✅ Done |
| F-3 | 项目展示字段补全 | 🔴 P0 | S | ✅ Done |
| F-4 | 移动端导航 | 🔴 P0 | S | ✅ Done |
| F-5 | 安全加固 | 🔴 P0 | M | ✅ Done |

### F-1 · GitHub OAuth 登录（真实鉴权）

当前最大阻塞项。任何人都可以通过 `demo-login?role=admin` 成为管理员。

**交付内容：**
- GitHub OAuth 完整登录流（`GET /api/v1/auth/github` → `/api/v1/auth/github/callback`）
- 从 GitHub 获取：用户名、邮箱、头像 URL、GitHub ID
- `User.githubId`、`User.avatarUrl`、`User.githubUsername` 字段
- 登录后自动用 GitHub username 预填创作者档案的 slug
- 生产环境关闭 demo-login 接口（仅本地开发可用）

**为什么用 GitHub OAuth 而非邮箱注册：**
面向 VibeCoding 开发者的社区，GitHub 账号是身份标准。ProductHunt、DEV Community、IndieHackers 都以 GitHub OAuth 为主登录方式，能大幅降低注册摩擦。

### F-2 · 创作者档案自助注册与编辑

**交付内容：**
- `POST /api/v1/me/profile` — 首次创建档案（用 GitHub 信息预填）
- `PATCH /api/v1/me/profile` — 更新 headline、bio、skills、collaborationPreference
- `GET /api/v1/me/profile` — 获取自己的档案
- 注册流程：GitHub 登录 → 检测无档案 → 引导创建档案 → 进入首页

### F-3 · 项目展示字段补全

**新增字段：**
- `repoUrl` — GitHub / GitLab 仓库链接
- `websiteUrl` — 项目官网（区别于 demoUrl）
- `screenshots` — 截图 URL 数组（最多 5 张）
- `logoUrl` — 项目 Logo
- `openSource` — Boolean
- `license` — 协议类型

**展示效果：** 项目详情页顶部展示 Logo + 截图轮播，右侧边栏显示 GitHub star 数。

### F-4 · 移动端导航

当前手机用户看不到任何导航链接（全部 `hidden md:flex`）。

**交付内容：** 汉堡菜单 + 侧抽屉，包含核心入口（讨论、发现、团队、挑战赛、我的）。

### F-5 · 安全加固

- 写操作 API 添加基于 IP 的速率限制
- 补全 `Content-Security-Policy`、`X-Frame-Options` 等安全头
- 生产环境禁用 demo-login

---

## 第二阶段：广场与画廊增强（Community Core）

**目标：** 让社区具备"发布 → 获得反馈 → 继续创作"的正向激励循环。

| 编号 | 任务 | 优先级 | 难度 | 状态 |
|------|------|--------|------|------|
| C-1 | 社交互动基础（点赞 + 收藏 + 关注） | 🟠 P1 | M | ✅ Done |
| C-2 | 嵌套评论（引用回复） | 🟠 P1 | M | ✅ Done |
| C-3 | 通知系统扩展 | 🟠 P1 | S | ✅ Done |
| C-4 | 个性化推荐 Feed | 🟠 P1 | M | ✅ Done |
| C-5 | 项目画廊"每日展示位" | 🟠 P1 | S | ✅ Done |
| C-6 | GitHub 仓库展示集成（轻量级） | 🟡 P2 | S | ✅ Done |
| C-7 | 全文搜索升级 | 🟡 P2 | M | ✅ Done |

### C-1 · 社交互动基础（点赞 + 收藏 + 关注）

唯一互动是"写评论"，门槛过高，85% 的访客没有任何参与入口。

**Schema：**
- `UserFollow`: 关注关系（followerId → followingId）
- `PostLike`: 帖子点赞（userId → postId）
- `PostBookmark`: 帖子收藏（userId → postId）
- `ProjectBookmark`: 项目收藏（userId → projectId）

**API：**
- `POST/DELETE /api/v1/posts/:slug/like`
- `POST/DELETE /api/v1/posts/:slug/bookmark`
- `POST/DELETE /api/v1/projects/:slug/bookmark`
- `POST/DELETE /api/v1/users/:slug/follow`
- `GET /api/v1/me/bookmarks` — 我的收藏夹
- `GET /api/v1/me/feed` — 关注的人的动态 Feed

### C-2 · 嵌套评论（引用回复）

- `Comment.parentCommentId` 可选 FK，最大嵌套 2 层
- 评论区展示「Reply to @用户名」的引用折叠效果

### C-3 · 通知系统扩展

扩展 `InAppNotificationKind`：`post_commented`、`comment_replied`、`post_liked`、`project_bookmarked`、`user_followed`、`project_intent_received`、`post_featured`

- 导航栏通知红点（未读计数）
- 通知聚合（同类型合并："3 人赞了你的帖子"）

### C-4 · 个性化推荐 Feed

三层推荐逻辑：
1. **关注 Feed**：展示关注用户发布的内容
2. **标签偏好**：根据用户 Follow 的标签推荐相关帖子和项目
3. **今日精选**：管理员手动置顶 1-3 条优质内容

### C-5 · 项目画廊"每日展示位"

- `Project.featuredRank Int nullable`（管理员设当日排名）
- 每日精选项目显示在发现页和首页顶部
- 自动在次日 UTC 0 点清除
- `PATCH /api/v1/admin/projects/:slug/feature-today`

### C-6 · GitHub 仓库展示集成（轻量级）

项目页调用 GitHub API 展示：⭐ Star 数、🍴 Fork 数、最后提交时间、主要语言。数据缓存 1 小时。

### C-7 · 全文搜索升级

- `Post` + `Project` 增加 `searchVector tsvector` 字段 + GIN 索引
- `GET /api/v1/search?q=&type=post|project|creator` 统一搜索入口

---

## 第三阶段：Team 协作空间强化（Collaboration）

**目标：** 将 Team 功能升级为"真正的开源协作空间"。

| 编号 | 任务 | 优先级 | 难度 | 状态 |
|------|------|--------|------|------|
| T-1 | 外部聊天绑定（替代自建聊天） | 🟠 P1 | S | ✅ Done |
| T-2 | 里程碑公开展示 | 🟠 P1 | S | ✅ Done |
| T-3 | GitHub 仓库绑定（Team 级别） | 🟡 P2 | M | ✅ Done |
| T-4 | 协作意向流程打通 | 🟡 P2 | M | ✅ Done |

### T-1 · Team 外部聊天绑定

- `Team.discordUrl`、`Team.telegramUrl`、`Team.slackUrl` 字段
- 团队详情页顶部展示对应 Logo + 跳转链接
- 0 维护成本 + 用户体验无缝

### T-2 · 里程碑公开展示

- `TeamMilestone.visibility`：`team_only | public`
- `TeamMilestone.progress Int`（0-100%）
- 项目详情页展示公开里程碑进度条

### T-3 · GitHub 仓库绑定（Team 级别）

- `Team.githubOrgUrl` / `Team.githubRepoUrl` 字段
- 团队页展示：最近 commits、open issues、贡献者列表

### T-4 · 协作意向流程打通

- 审核权限从管理员迁移到项目 owner
- 意向通过后引导邀请加入团队
- `CollaborationIntent.convertedToTeamMembership Boolean`

---

## 第四阶段：MCP Agent 能力增强（AI Layer）

**目标：** 让 VibeHub 成为能被主流 AI 工具"插拔使用"的内容基础设施。

| 编号 | 任务 | 优先级 | 难度 | 状态 |
|------|------|--------|------|------|
| A-1 | MCP stdio 传输层 | 🟠 P1 | L | ✅ Done |
| A-2 | MCP 工具扩展 | 🟡 P2 | S | ✅ Done |
| A-3 | Agent 友好的结构化元数据 | 🟡 P2 | S | ✅ Done |

### A-1 · MCP stdio 传输层

- 独立 Node.js 入口 `mcp-server.ts`（stdio 模式）
- 复用现有 5 个工具的 repository 逻辑
- 提供 Claude Desktop / Cursor MCP 配置示例

### A-2 · MCP 工具扩展

新增工具：`search_posts`、`get_post_detail`、`list_challenges`、`get_talent_radar`

### A-3 · Agent 友好元数据

- `GET /api/v1/projects/:slug/metadata` — 机器友好 JSON
- 帖子页 `summary` 字段
- oEmbed 增加丰富 metadata

---

## 第五阶段：商业化精简版（Monetization Lite）

**目标：** 用"Team 高级空间"作为核心付费点，实现最小可行商业化闭环。

| 编号 | 任务 | 优先级 | 难度 | 状态 |
|------|------|--------|------|------|
| M-1 | Free vs Pro 边界清晰化 | 🟠 P1 | S | ✅ Done |
| M-2 | 支付网关（Stripe 优先） | 🟠 P1 | XL | ✅ Done |
| M-3 | 价值触发型升级引导 | 🟡 P2 | S | ✅ Done |

### M-1 · Free vs Pro 边界清晰化

| 功能 | Free | Pro (¥29/月) | Team Pro (¥99/月) |
|------|------|-------------|-------------------|
| 创建团队数量 | 1 | 5 | 无限 |
| 团队成员上限 | 5 人 | 20 人 | 无限 |
| 项目数量 | 3 | 无限 | 无限 |
| 项目截图数量 | 2 张 | 10 张 | 无限 |
| API 调用 | 120/min | 1000/min | 5000/min |

### M-2 · 支付网关

- 境外：Stripe Checkout
- 境内：支付宝（第二优先）

### M-3 · 价值触发型升级引导

在尝试创建第 2 个团队、截图超限、API 配额达 80% 时展示精美升级提示。

---

## Team 聊天方案建议

| 方案 | 开发成本 | 维护成本 | 用户体验 | 推荐度 |
|------|---------|---------|---------|--------|
| 自建 WebSocket 聊天 | 极高 | 极高 | 高 | ❌ |
| 接入 Stream Chat SDK | 中 | 低 | 高 | ✅ 中期 |
| 团队聊天链接绑定（T-1） | 极低 | 零 | 可接受 | ✅ 立即 |

**建议路径：** 先上 T-1 → 积累反馈 → 有需求再考虑 Stream Chat SDK → 绝不自建。
