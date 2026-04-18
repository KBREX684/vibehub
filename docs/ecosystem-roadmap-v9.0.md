# VibeHub 生态升级路线图 V9.0

> 更新日期：2026-04-18
> 文档定位：V9.0 正式主路线图
> 合并来源：`docs/roadmap-v8.md`、`docs/v8-progress.md`、`docs/roadmap-current.md`、分支 `cursor/roadmap-v9-and-frontend-audit-d6b5` 上的 `docs/roadmap-v9.md` 与 `docs/frontend-audit-v9.md`
> 策略约束：白皮书《VibeHub 中国市场战略与产品升级白皮书》

---

## 1. 文档目的

本路线图只解决一件事：

**把 VibeHub 从“社区 + 团队 + Agent + 开发者中心”的并列功能集合，收敛成“本地开发之外的人与 Agent 协作中枢”。**

V9.0 不讨论融资、品牌包装和市场投放，不给 IDE、代码托管或重型 DevOps 开新主线。它只定义：

1. 下一阶段产品到底围绕什么建设；
2. 当前仓库哪些能力继续沿用，哪些必须冻结；
3. 哪些数据对象、接口、权限、审计、前端页面要成为新的主干；
4. 如何按阶段把白皮书里的战略约束落到真实工程。

---

## 2. 当前基线与问题判断

### 2.1 已有能力

VibeHub 在 v8 基线下已经具备一批高价值资产：

- 社区与项目发现闭环：讨论、项目、收藏、关注、项目协作意向、排行榜。
- 团队协作闭环：团队创建、入队审批、任务、里程碑、讨论、团队聊天、活动时间线。
- Agent 治理骨架：`AgentBinding`、`TeamAgentMembership`、`AgentActionAudit`、`AgentConfirmationRequest`、`McpInvokeAudit`、MCP v2 写工具白名单。
- 开发者生态骨架：OpenAPI、API Keys、MCP manifest / invoke、开发者中心、API 文档。
- 商业与合规骨架：Free / Pro、支付 provider、`/aigc`、`/privacy`、`/terms`、`/rules`、admin 治理页面。
- 前端基础设施：完整的 dark 设计 token、统一 UI 原件、全站 i18n、首页与开发者页已接近成熟状态。

### 2.2 核心缺口

当前最大问题不是功能少，而是**主线资产缺失**：

- 没有 `WorkspaceArtifact`，团队没有真正的共享资产层。
- 没有 `SnapshotCapsule`，团队协作没有“交接单位”和“回滚单位”。
- `CollaborationIntent` 仍是原型级消息表单，与白皮书的“三句式合作申请”直接冲突。
- 治理层缺少 `Restriction` 原语，无法表达用户、团队、Agent 的停用、限流和禁发。
- 团队页仍像“纵向堆叠的功能列表”，不像协作中枢。
- 管理台与关键转化组件仍有英文硬编码、交互不统一和前后端规则不一致问题。

### 2.3 V9.0 的升级结论

**V9.0 唯一主线：把 `Team` 升格为 `Team Workspace`。**

所有新增建设都必须服务这条主线：

- `WorkspaceArtifact` 是资产面；
- `SnapshotCapsule` 是交接面；
- 三句式合作申请是协作入口；
- Agent Governance 是执行约束层；
- Restriction 与 Compliance Visibility 是治理与中国化收口层。

---

## 3. V9.0 战略边界

### 3.1 一句话定义

**VibeHub 不是代码托管平台，也不是 AI IDE；它是本地开发之外的人与 Agent 协作中枢。**

### 3.2 核心原则

- **Local-first**：代码主要在本地完成，云端不承载 IDE 主路径。
- **Workspace-centric**：云端核心单位不是 repo，而是 Team Workspace。
- **Human-confirmed Agent**：Agent 可以读、分析、生成候选结果，但高风险动作必须进入人工确认流。
- **Collaboration over chatting**：社交只服务于合作撮合与团队协作，不向私聊平台扩张。
- **China-ready by default**：账号治理、内容风控、AIGC 公示、数据区域与跨境边界都必须前置设计。

### 3.3 明确不做

- 不做在线 IDE。
- 不做 GitHub/Gitee 式 repo 主路径。
- 不做 diff / merge / branch / CI / 制品流水线。
- 不做自由私信和泛聊天扩张。
- 不扩张 OAuth Apps / Automation / Webhook / 外部连接器。
- 不新增新的 UI 动效依赖包。

---

## 4. 产品主结构

### 4.1 Team Workspace

Team Workspace 是 V9.0 的主产品单元。它不是代码仓库，而是团队共享数据储存室与协作容器，承载：

- 文档、代码包、Prompt、设计稿、测试报告、部署说明等资产；
- 快照与交接记录；
- 团队成员与 Agent 的权限关系；
- 审计、配额、治理与合规可见化信息。

Team Workspace 的价值锚点必须清晰地落在：

- 团队共享空间；
- 配额和容量；
- 审计与可追溯；
- Agent 可控接入；
- 快照历史与交接能力。

### 4.2 Snapshot Capsule

Snapshot Capsule 是云端协作的最小交接单位，不承担 repo 语义，只承担：

- 某一时刻的 artifact 集；
- 目标、说明、角色分工；
- 最近一次确认结果；
- 上一快照引用；
- 可继续、可回滚、可解释。

### 4.3 Collaboration Request

V9.0 将现有协作意向升级为**三句式合作申请通道**：

- 我是谁 / 我能做什么；
- 我为什么联系你；
- 我希望怎样合作。

每句上限 250 字，不支持附件、外链和联系方式直发。接收方标准动作固定为：

- 接受；
- 婉拒；
- 忽略；
- 拉黑并举报。

### 4.4 Agent Governance

Agent 是正式队员，但不是自治体。V9.0 在已有 `AgentBinding` 与 `TeamAgentMembership` 基础上，明确：

- 读操作可以直接发生；
- 低风险候选写入可以发起请求；
- 高风险写入、回滚、删除、对外同步一律进入 `AgentConfirmationRequest`。

### 4.5 Compliance Visibility

中国化落地不是单独的合规页，而是用户可见的产品能力。V9.0 需要逐步把以下信息产品化展示：

- 当前工作区的数据区域；
- 是否允许跨境；
- 使用的模型及备案/登记状态；
- Agent 高风险动作是否经过人工确认；
- 审计与留存范围。

---

## 5. 数据、接口与治理主干

### 5.1 新数据对象

- `WorkspaceArtifact`
- `SnapshotCapsule`
- `UserRestriction`
- `TeamRestriction`
- `AgentRestriction`

### 5.2 现有对象升级

- `CollaborationIntent`：新增 `pitch` / `whyYou` / `howCollab`，旧 `message` 仅兼容读取。
- `Team`：新增 `dataRegion`、`crossBorderEnabled`。
- `TIER_LIMITS`：新增 `workspaceStorageMb`，必要时扩 `maxSnapshots`。

### 5.3 新接口与工具

REST 主干：

- `/api/v1/teams/{slug}/artifacts`
- `/api/v1/teams/{slug}/artifacts/{id}/download-url`
- `/api/v1/teams/{slug}/snapshots`
- `/api/v1/teams/{slug}/snapshots/{id}`
- `/api/v1/teams/{slug}/snapshots/{id}/rollback`
- `/api/v1/projects/{slug}/intents/{id}/ignore`
- `/api/v1/projects/{slug}/intents/{id}/block-and-report`
- `/api/v1/admin/restrictions/*`
- `/api/v1/public/compliance`

MCP 主干：

- `workspace_list_artifacts`
- `workspace_request_upload`
- `snapshot_create`
- `snapshot_rollback`

### 5.4 审计命名空间

统一新增以下命名空间：

- `workspace.artifact.*`
- `workspace.snapshot.*`
- `collab.intent.*`
- `restriction.*`

---

## 6. 前端与体验升级原则

V9.0 的前端不是单独的“美化专项”，而是主线能力的一部分。所有前端升级必须服务以下目标：

### 6.1 整体气质

- 理性；
- 克制；
- 可信；
- 适合长时间阅读与协作；
- 在暗色 Monochrome Geek 基调下保持专业感。

### 6.2 动效边界

只允许在以下位置使用强化动效：

- 首页 Hero；
- 品牌句；
- 付费锚点；
- 数据强调。

以下区域默认静态或极轻动效：

- 团队页；
- 工作区；
- 合作申请；
- 后台管理；
- 审计和治理页。

### 6.3 页面结构规则

- 团队页必须切换为 Tab 架构，避免单列长滚。
- 合作申请必须升级为抽屉式三句结构，不允许继续使用原型级单 textarea。
- 后台页统一到 `PageHeader + DataTable + SectionCard + TagPill + ConfirmDialog`。
- 全站关键管理页和转化组件必须做到中英切换完整可用。

### 6.4 前后端同步红线

禁止以下伪升级：

- 团队页有 Workspace Tab 但没有真实 API；
- 合作申请前端改成三字段但后端仍写单 `message`；
- 配额条显示固定假数据；
- 限制台只有按钮没有 `Restriction` 落库；
- 合规页只有静态文案没有真实配置来源。

---

## 7. 阶段式路线图

V9.0 不按月份拆，而按依赖闭环拆为 10 个执行阶段：

- `P0-1`：边界校正与现状止血
- `P0-2`：设计系统收口与页面骨架统一
- `P1-1`：Workspace 数据层与存储入口
- `P1-2`：Workspace 页面与订阅承接
- `P2-1`：三句式合作申请迁移
- `P2-2`：Snapshot Capsule MVP
- `P3-1`：Agent × Workspace 读写矩阵
- `P3-2`：统一活动流与确认流
- `P4-1`：Restriction 三原语与治理拦截
- `P4-2`：合规可见化与中国化收口

详细拆解见 `docs/ecosystem-implementation-plan-v9.0.md`。

---

## 8. 成功判定

V9.0 完成度必须同时满足四类结果：

### 8.1 产品结果

- 用户能在首页和团队页上明确理解 Team Workspace 是主产品。
- 项目展示、合作申请、团队协作、Workspace、Agent 权限形成单线转化，而不是多头并列。

### 8.2 工程结果

- 新能力均有 schema、migration、repository、API、OpenAPI、types、UI、admin、审计和测试闭环。
- 所有 Agent 写入路径都可确认、可撤回、可追溯。

### 8.3 治理结果

- 用户、团队、Agent 的限制与恢复可产品化处理。
- 合规与数据区域不再停留在协议文本，而变成真实配置和可视化能力。

### 8.4 体验结果

- 团队页从“功能堆叠”升级为“协作中枢”。
- 合作申请成为可信的转化入口，而不是原型表单。
- 后台中英一致、信息密度一致、风格一致。

---

## 9. 当前冻结项

V9.0 执行期间，下列模块默认冻结，仅允许修复缺陷和保持兼容：

- OAuth Apps
- Automation
- Webhooks
- 外部连接器扩展
- 团队聊天的新功能扩张
- 新的营销型动效组件引入

如需解冻，必须证明与 Team Workspace 主线直接相关。

---

## 10. 配套文档

- 当前主线索引：`docs/roadmap-current.md`
- V9.0 总路线图：`docs/ecosystem-roadmap-v9.0.md`
- V9.0 实施计划书：`docs/ecosystem-implementation-plan-v9.0.md`
- V8 战略底本：`docs/product-strategy-v8.md`
- V8 已落地进度：`docs/v8-progress.md`
- V8 执行路线图：`docs/roadmap-v8.md`

V9.0 起，原分支草稿 `roadmap-v9` 与 `frontend-audit-v9` 不再作为正式入口文档引用；其内容已经并入本路线图与实施计划书。
