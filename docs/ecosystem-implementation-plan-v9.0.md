> ⛔ **已归档**（2026-04-19）：本文件代表 v11.0 之前的产品方向，**不再作为当前主线**。
> 当前主线见 `docs/v11.0-final-chapter-rfc.md`，主线索引 `docs/roadmap-current.md`。
> 本文件保留作为历史档案，新工作请勿基于本文件展开。

# VibeHub V9.0 实施计划书

> 更新日期：2026-04-18
> 对应主文档：`docs/ecosystem-roadmap-v9.0.md`
> 实施原则：按阶段推进，不按月份推进

---

## 1. 实施原则

### 1.1 单一主线

所有阶段必须服务同一目标：

**让 Team Workspace 成为 VibeHub 的主产品入口、主协作容器和主付费锚点。**

### 1.2 Definition of Done

任一阶段中的新能力只有在以下条件全部满足后才允许进入主干：

1. schema
2. migration
3. repository / service
4. REST API
5. OpenAPI
6. generated types
7. 权限 / 审计 / 状态机
8. UI 五态
9. admin 可追溯
10. `npm run check` / build / e2e 通过

### 1.3 PR 纪律

- 禁止只做单侧 PR。
- 禁止 UI 壳子先合并。
- 禁止新增脱离主线的“顺手功能”。
- 禁止在业务页和后台页滥用重动效。

---

## 2. 阶段总览

| 阶段 | 主题 | 主结果 |
|---|---|---|
| `P0-1` | 边界校正与现状止血 | 文案、入口、i18n、合作申请现状修平 |
| `P0-2` | 设计系统收口与页面骨架统一 | 团队页、后台页、设计系统骨架稳定 |
| `P1-1` | Workspace 数据层与存储入口 | `WorkspaceArtifact` 与团队上传入口落地 |
| `P1-2` | Workspace 页面与订阅承接 | 团队工作区 UI 与配额展示上线 |
| `P2-1` | 三句式合作申请迁移 | 合作申请从原型表单升级为合规撮合通道 |
| `P2-2` | Snapshot Capsule MVP | 快照交接与回滚能力落地 |
| `P3-1` | Agent × Workspace 读写矩阵 | Agent 对 Workspace/Snapshot 的可控访问落地 |
| `P3-2` | 统一活动流与确认流 | 人、Agent、Workspace 事件进入统一活动总线 |
| `P4-1` | Restriction 三原语与治理拦截 | 用户/团队/Agent 限制能力落地 |
| `P4-2` | 合规可见化与中国化收口 | 数据区域、跨境边界、合规面板与后台收口 |

---

## 3. 详细实施阶段

### P0-1：边界校正与现状止血

**阶段目标**

- 先修正当前最显著的叙事错误、文案硬伤和前后端不一致，避免继续在错误入口上叠功能。

**后端工作**

- 修正合作申请相关 OpenAPI 描述。
- 将 `/workspace/enterprise` 明确标记为 deprecated，并为 `/workspace/*` 主线腾出语义空间。
- 梳理 Phase 1 所需 schema RFC，不立即迁移。

**前端工作**

- 修正 `collaboration-intent-form` 的长度限制与 API 一致。
- 合作申请与项目所有者面板做全量 i18n。
- 管理台关键页做全量 i18n：
  - `moderation`
  - `collaboration`
  - `reports`
  - `audit-logs`
- 首页 Hero 和导航切到 Team Workspace 叙事。
- 团队页改为 Tab 骨架：
  - 概览
  - 工作区
  - 任务
  - 里程碑
  - 讨论
  - 活动

**测试与验收**

- 中英切换无残留英文。
- 合作申请不会再出现前后端长度冲突。
- 团队页可稳定切换 Tab，旧有 panel 不丢失。
- 关键 e2e 选择器同步更新。

**冻结项**

- 不新增任何新模型。
- Workspace Tab 只允许 feature flag 占位，不允许假数据壳子。

### P0-2：设计系统收口与页面骨架统一

**阶段目标**

- 为后续 Workspace、Snapshot 和治理台建立稳定的页面骨架和组件规则。

**后端工作**

- 无新增业务模型。
- 保持现有接口稳定，配合前端抽象不破坏现有页面。

**前端工作**

- 统一后台组件结构：`PageHeader + DataTable + SectionCard + TagPill + ConfirmDialog`
- 抽出：
  - `AdminFilterBar`
  - `StatusPill`
  - `RiskBar`
- 统一导航宽度、页面 `space-y`、`font-mono` 使用边界。
- 登录页 Aurora 降级。
- 首页动效节流，只保留必要品牌位。

**测试与验收**

- 设计系统抽象不改变业务逻辑。
- `audit:ui-strict` 通过。
- 桌面与移动端视觉回归通过。

**冻结项**

- 不做大规模页面视觉重做。
- 不引入任何新 UI 依赖。

### P1-1：Workspace 数据层与存储入口

**阶段目标**

- 先建立 Team Workspace 的真实数据面、存储入口和权限边界。

**后端工作**

- 新增 `WorkspaceArtifact` migration。
- 扩展 presign 到团队级路径。
- 建立 artifact repository / service：
  - list
  - create
  - delete
  - download-url
- 扩展 `TIER_LIMITS.workspaceStorageMb`。
- 审计：
  - `workspace.artifact.presign`
  - `workspace.artifact.uploaded`
  - `workspace.artifact.deleted`
  - `workspace.artifact.downloaded`

**前端工作**

- 暂不做完整工作区页面。
- 只预备真实 API 接入的消费层和基础状态模型。

**权限与状态**

- 团队成员可读。
- owner/admin 可删。
- agent 不得直接落盘，只能请求上传。
- `validationState = pending | ready | rejected`

**测试与验收**

- 非成员读取 403。
- 超配额上传被拒。
- 未配置对象存储时返回明确错误。
- repository 与 security 测试通过。

**冻结项**

- 不做快照。
- 不做复杂可见性层级。

### P1-2：Workspace 页面与订阅承接

**阶段目标**

- 把 Workspace 数据面转成可用的团队工作区页面和付费承接入口。

**后端工作**

- 稳定 artifact API。
- 补配额读取接口或复用现有订阅能力。

**前端工作**

- 团队页 `工作区` Tab 正式上线。
- 交付五态：
  - 空态
  - 加载态
  - 403
  - 配额满
  - 处理中
- 支持上传、列表、下载、删除、配额显示。
- `/settings/subscription` 展示 Workspace 配额。
- `/pricing` 预留 Team Workspace 付费位。

**测试与验收**

- 所有 UI 都使用真实接口。
- 删除后活动流能看到事件。
- 配额显示与真实 tier 对齐。

**冻结项**

- 不把快照、合作申请重构和 Restriction 混入本阶段。

### P2-1：三句式合作申请迁移

**阶段目标**

- 把合作申请从原型级单消息表单升级为白皮书定义的三句式合规通道。

**后端工作**

- `CollaborationIntent` 新增：
  - `pitch`
  - `whyYou`
  - `howCollab`
- 旧 `message` 只读兼容。
- 新提交停写 `contact`，读取时脱敏。
- 限流和冷却期策略落地。
- 正则拦截联系方式与外链。
- 增加：
  - ignore
  - block-and-report

**前端工作**

- 合作申请改为抽屉式三段输入。
- 每字段 250 字计数。
- 项目所有者面板改为四动作：
  - 接受
  - 婉拒
  - 忽略
  - 拉黑并举报
- 管理台协作页支持三字段展开查看。

**测试与验收**

- 新旧数据兼容读取正常。
- 字数限制前后端一致。
- `block-and-report` 能真实联动 `ReportTicket`。

**冻结项**

- 不在本阶段同时引入 Snapshot。

### P2-2：Snapshot Capsule MVP

**阶段目标**

- 在 Workspace 已成立的前提下，建立交接、沉淀与回滚能力。

**后端工作**

- 新增 `SnapshotCapsule` migration。
- 支持：
  - create
  - list
  - detail
  - rollback
- 回滚策略固定为“创建新快照”，不覆盖旧数据。

**前端工作**

- 团队页增加快照区或快照 Tab。
- 快照时间线、详情页、创建向导、回滚确认页上线。
- 提供公开只读快照页。

**权限与状态**

- `member+` 可创建。
- `owner/admin` 可回滚。
- Agent 创建或回滚必须走确认流。

**测试与验收**

- 快照可引用 artifact 集合。
- 回滚生成新快照而不是破坏历史。
- 公开只读页权限正确。

**冻结项**

- 不做 diff / branch / merge 任何表达。

### P3-1：Agent × Workspace 读写矩阵

**阶段目标**

- 把现有 Agent 治理系统接到 Workspace 和 Snapshot 上。

**后端工作**

- 新增 MCP 工具与 scopes：
  - `workspace_list_artifacts`
  - `workspace_request_upload`
  - `snapshot_create`
  - `snapshot_rollback`
- `ApiKey.scopes` 扩展：
  - `read:team:workspace`
  - `write:team:workspace`
- 工具白名单、OpenAPI、types 同步。

**前端工作**

- `settings/agents` 增加 Workspace 对象过滤和状态展示。
- Agent 角色牌 tooltip 展示可操作矩阵。

**权限与状态**

- reader 仅读。
- commenter 读 + 评论。
- executor 可请求写。
- reviewer 可提交审查。
- coordinator 可协调。
- 所有高风险写入仍一律走确认流。

**测试与验收**

- 所有 Agent 发起的 Workspace 写都生成 `AgentConfirmationRequest`。
- 拒绝、撤销、过期都有 UI 与通知反馈。

**冻结项**

- 不开放“agent 直接写入成功”路径。

### P3-2：统一活动流与确认流

**阶段目标**

- 把人、Agent、Workspace、Snapshot 的协作事件统一收敛到团队活动总线。

**后端工作**

- 扩展活动聚合查询。
- `admin/mcp-audits` 增工具类型 facet。

**前端工作**

- 团队 `活动` Tab 展示：
  - artifact 上传/删除
  - snapshot 创建/回滚
  - agent 动作
  - confirmation 决策
- `settings/agents` 的确认队列按对象类型分组。

**测试与验收**

- Agent 触发 Workspace 写请求后，团队活动流与个人确认队列都能看到完整链路。

**冻结项**

- 不把无关低价值事件塞进活动流。

### P4-1：Restriction 三原语与治理拦截

**阶段目标**

- 建立用户、团队、Agent 的统一限制模型和拦截能力。

**后端工作**

- 新增：
  - `UserRestriction`
  - `TeamRestriction`
  - `AgentRestriction`
- 在 auth / repository 层统一拦截写操作。
- `pg-boss` 自动解除到期限制。

**前端工作**

- `/admin/restrictions` 三 Tab。
- 用户、团队、Agent 页面顶部状态条。

**测试与验收**

- 被限制对象无法继续发帖、上传、提交申请、发起关键写操作。
- 到期自动解除。
- 审计完整。

**冻结项**

- 不把 Restriction 逻辑散落到各个 route handler。

### P4-2：合规可见化与中国化收口

**阶段目标**

- 把中国化约束和合规能力正式产品化。

**后端工作**

- `Team.dataRegion`
- `Team.crossBorderEnabled`
- presign / bucket 按区域路由
- 公开合规数据接口

**前端工作**

- 工作区设置中的合规面板：
  - 数据区域
  - 跨境状态
  - 模型公示
  - Agent 审计摘要
  - 留存说明
- `/help/compliance` 上线。
- 管理台剩余页面 i18n 收尾。

**测试与验收**

- 关闭跨境时上传只走 CN 配置。
- 合规面板数据来自真实配置源。

**冻结项**

- 不做静态壳子式合规页。

---

## 4. 跨阶段依赖矩阵

| 能力 | 依赖前置阶段 |
|---|---|
| 团队工作区页面 | `P1-1` |
| Team Workspace 付费承接 | `P1-1` |
| 三句式合作申请 | `P0-1` |
| Snapshot Capsule | `P1-1`、`P1-2` |
| Agent 对 Workspace 写入 | `P1-1`、`P2-2` |
| 活动总线聚合 | `P1-2`、`P2-2`、`P3-1` |
| Restriction 拦截 | 所有关键写入路径完成后 |
| 合规可见化 | `P4-1` 与数据区域字段完成后 |

---

## 5. 测试与发布门禁

每个阶段结束前必须跑完：

- `npm run lint`
- `npm run test`
- `npm run validate:openapi`
- `npm run generate:types`
- `npm run build`

关键 e2e：

- 社区 / 项目 / 合作申请
- 团队 / Workspace / 上传
- 快照创建 / 回滚
- Agent 确认流
- admin 治理 / restrictions

UI 回归：

- 中英双语言
- 桌面 / 移动端
- 空态 / 错误态 / 403 / 审核中 / 配额满 / 受限态
- `prefers-reduced-motion`

---

## 6. 文档同步要求

在 V9.0 执行期间，以下文档必须同步维护：

- `docs/roadmap-current.md`
- `docs/ecosystem-roadmap-v9.0.md`
- `docs/ecosystem-implementation-plan-v9.0.md`
- 必要时同步 `docs/release-notes.md`

任一阶段完成后，至少更新：

- 当前阶段状态
- 已完成能力
- 冻结项是否变更
- 已知风险和后续入口条件
