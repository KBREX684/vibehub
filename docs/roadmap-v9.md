# VibeHub 技术产品升级路线图 V9.0

> 更新日期：2026-04-18  
> 作者：PM + 产品技术升级负责人 + 全栈实施规划师（Cursor Agent）  
> 基础：白皮书《VibeHub 中国市场战略与产品升级白皮书》＋ 当前 `main` 分支真实实现  
> 前端专项请配合阅读：`docs/frontend-audit-v9.md`

---

## 0. 本路线图是什么

本路线图 **不讨论** 市场、融资、品牌包装与竞品分析。它只做一件事：把白皮书提出的产品升级方向，转化为 **能在当前仓库直接落地、前后端同步推进、考虑完整性** 的工程计划。

硬约束（不可偏离）：

1. 不做 IDE，不做重型代码托管，代码主要由用户在本地完成。
2. Team Workspace 是核心主线，不是附属功能；云端以"共享数据储存室 / 协作空间 / 项目快照"思路推进，**不做 GitHub repo 替代**。
3. Agent 必须受控接入：可授权、可审计、可撤回、高风险动作需确认。
4. 社交能力只保留"合作申请通道"，不做自由私信。
5. 合规治理、内容审核、用户/团队/Agent 限制能力必须纳入后台建设。
6. **任何升级都必须前后端同步**；任一新能力进版本号前必须满足 "schema → migration → API → OpenAPI → 权限 → 审计/状态机 → UI 五态 → 管理台可追溯 → `npm run check` 绿" 全部勾选。

---

## 1. 总体判断

**成熟度**：**「功能堆栈已丰富、但产品主线未收敛」** 的中后期工程态。  
47 个 Prisma migration、150+ API 路由、58 个 Next.js 页面、完整 design token、19 个 MCP v2 工具、已具 `AgentActionAudit` + `AgentConfirmationRequest` 骨架、三家支付、OAuth App、Webhook、Automation、实时团队聊天。

**最大优势**

1. **Agent 治理数据面已大体齐备**：`AgentBinding` + `TeamAgentMembership`（reader/commenter/executor/reviewer/coordinator 五档） + `AgentActionAudit` + `AgentConfirmationRequest` + `McpInvokeAudit` + `McpInvokeIdempotency` + `MCP_V2_WRITE_TOOLS` 白名单。
2. **设计系统与 i18n 框架就位**：`PageHeader / SectionCard / DataTable / FormField / ConfirmDialog / ErrorState / EmptyState / StatCard` 等；`zh.json` ~1631 行、`en.json` ~1560 行。
3. **合规页面骨架存在**：`/aigc`、`/terms`、`/privacy`、`/rules`、`admin/audit-logs`、`admin/mcp-audits`。
4. **订阅/配额体系可挂钩 Workspace**：`TIER_LIMITS` 已有 `maxTeams / maxTeamMembers / apiRatePerMinute / maxApiKeys` 等。
5. **已自研 reactbits 风格组件** 15+：`Aurora / ShinyText / SplitText / GradientText / SpotlightCard / TiltedCard / Magnet / ClickSpark / Particles / BlurText / AnimatedSection / CountUp / Float / StaggerList`，以及自研 `HeroThreadsBackdrop / ProjectGalleryOrbitShell`。**不需要引入新依赖**。

**最大缺口**

1. **没有任何 `WorkspaceArtifact` / `SnapshotCapsule` / `Restriction` 模型**（schema grep 零命中）。白皮书主线 Team Workspace + 快照胶囊 在数据层完全缺席。
2. **`uploads/presign` 仅用于个人头像/截图**（5MB、仅图片、路径 `uploads/{userId}/...`），**无团队维度 ACL、无可挂载到 artifact 的元数据表**。
3. **合作申请与白皮书直接冲突**：`CollaborationIntent` 只有 `message (10-1000)` + `contact`；客户端 `maxLength=500` 与 API 不一致；`contact` 字段鼓励"直联"，违反"禁私信、合作撮合"约束。
4. **`TeamChatMessage` 实时聊天（WS + 30 天留存）** 与白皮书"只保留三句式合作申请通道"存在张力，尚未计入审核链路。
5. **管理台缺 `Restriction/Ban/Suspend` 原语**：当前仅 `ModerationCase` + `ReportTicket` + `AgentConfirmationRequest`，无法表达"用户/团队/Agent 被停用、限流、禁发帖"。
6. **管理台大量英文硬编码**（`admin/collaboration`、`admin/moderation`、`admin/reports` 整页非 i18n）。
7. **`/workspace/enterprise` 已废弃并 301 到企业认证**，命名占位会与未来 Team Workspace 主路线冲突。

**最关键问题**：**不是"功能不够多"，而是"核心主线资产缺失，但周边能力已超量建设"**；前端只能表现为"社区 + 团队协作 + Agent 玩具"，而非白皮书定义的 **协作中枢**。前后端闭环断裂在 Workspace 这条主动脉。

---

## 2. 模块级差距分析

> 表格按 `当前状态 / 目标状态 / 差距等级 / 是否优先 / 前端缺口 / 后端缺口 / 完整性缺口` 结构组织。

### A. 产品结构与信息架构

| 项 | 内容 |
|---|---|
| 当前状态 | `SiteNav` 五栏：讨论 / 项目 / 团队 / 开发者 / 定价；`/workspace/*` 路径仅残留企业认证重定向；团队页为"多模块纵向列表"（成员→项目→任务→里程碑→讨论→聊天）。 |
| 目标状态 | 顶层叙事：本地开发 + Team Workspace + Snapshot + Agent 受控；`/teams/[slug]/workspace` 升为一级概念。 |
| 差距等级 | **高** |
| 是否优先 | 是（Phase 0） |
| 前端缺口 | 团队页 Tab 化、导航 + 首页叙事收敛、`/workspace/*` URL 语义回收。 |
| 后端缺口 | `/workspace/enterprise` 明确废弃并释放命名空间；为 `/teams/[slug]/workspace` 新增占位路由。 |
| 完整性缺口 | 若仅改文案而无 Workspace 实体，会出现"承诺 Workspace、点进去是老团队页"的伪升级。 |

### B. 首页与核心页面表达

| 项 | 内容 |
|---|---|
| 当前状态 | `page.tsx` 已有 v8 四支柱、Agent 四步流、对比表；未出现"共享资产 / 快照 / Workspace"词汇。 |
| 目标状态 | Hero 让用户 10 秒内明白：本地继续开发 + 云端 Workspace 共享 + Agent 可审计进团队。 |
| 差距等级 | **中** |
| 是否优先 | 是（Phase 0 文案 + Phase 1 数据承接） |
| 前端缺口 | Hero 副标 + 支柱第三条指向未来 Workspace；`/pricing` 预告 Team 级付费位。 |
| 后端缺口 | 无（Phase 1 起真实能力落地后替换占位）。 |
| 完整性缺口 | 若 CTA `/teams/new` 进入的仍是老任务板 → 破口。 |

### C. Team Workspace

| 项 | 内容 |
|---|---|
| 当前状态 | `Team` 有 chat / tasks / milestones / discussions / agents / activity-log；无 artifact、无对象存储接入的团队 ACL、无配额、无版本。`uploads/presign` 仅 5MB 图片、仅用户级路径。 |
| 目标状态 | Workspace = Team 的资产面：Artifact 列表 + 版本/快照指针 + 成员与 Agent 权限 + 审计时间线 + 容量配额。 |
| 差距等级 | **高** |
| 是否优先 | 是（Phase 1 唯一主线） |
| 前端缺口 | 新 Tab「工作区」：文件/包列表、上传组件（支持非图片）、删除确认、权限标签、空状态、审核中态、配额条。 |
| 后端缺口 | 新模型 `WorkspaceArtifact`；presign 扩展为按 `teamSlug + role`；删除走 soft-delete + `AuditLog`；类型白名单；配额挂 `TIER_LIMITS`。 |
| 完整性缺口 | 权限态、审核中态（待扫描）、回收站、Agent 上传走确认流。 |

### D. 项目快照胶囊（Snapshot Capsule）

| 项 | 内容 |
|---|---|
| 当前状态 | 完全缺失（`Snapshot` 命名仅用于 `WeeklyLeaderboardSnapshot` 与 `SystemHealthSnapshot`，语义无关）。 |
| 目标状态 | 快照 = 不可变 manifest（artifact 集 + 摘要 + 目标 + 角色 + 确认结果 + 上一快照 id）。不做 diff / merge / branch。 |
| 差距等级 | **高** |
| 是否优先 | Phase 2 |
| 前端缺口 | 时间线列表 + 详情 + 创建向导 + 回滚确认 + 只读公开摘要。 |
| 后端缺口 | `SnapshotCapsule` 表；manifest 引用 artifact 版本；`AuditLog` 事件；公开只读 API（可嵌入 oembed）。 |
| 完整性缺口 | 回滚必须"只创建新快照"而非删除旧快照；Agent 创建快照必须 `AgentConfirmationRequest`。 |

### E. 合作申请通道（三句式）

| 项 | 内容 |
|---|---|
| 当前状态 | `CollaborationIntent`: `intentType (join/recruit)` + `message (10-1000)` + `contact?`。前端表单 `maxLength=500`（**与 API 不一致**）；默认鼓励填 contact（违反白皮书）；标签英文；所有者面板硬编码英文。管理台 `/admin/collaboration` 展示 contact。 |
| 目标状态 | 三字段 `pitch` + `whyYou` + `howCollab`，每句 ≤250 字；禁附件、禁外链、禁联系方式直发；接收方四动作：接受 / 婉拒 / 忽略 / 拉黑举报；重复、频控、风控必经。 |
| 差距等级 | **高**（产品定义 + 合规） |
| 是否优先 | 是（Phase 2，与 Workspace 并行后半） |
| 前端缺口 | 三字段表单 + 字数计数 + 审核中态 + 四动作按钮；拉黑 & 举报与 `ReportTicket` 联通；全量 i18n。 |
| 后端缺口 | Schema 迁移新增三列（保留旧 `message` 作只读回填）；正则/URL/联系方式拦截器（扩展 `content-safety.ts`）；限流；MCP `submit_collaboration_intent` 输入 schema 同步；OpenAPI 重新生成。 |
| 完整性缺口 | 举报接入 `ReportTicket`；"忽略"应为软状态不入队列；"婉拒"需不可再次申请窗口期。 |

### F. Agent 受控协作

| 项 | 内容 |
|---|---|
| 当前状态 | 最成熟模块：`AgentBinding` + `ApiKey` + 五档 `TeamAgentRole` + `AgentActionAudit` + `AgentConfirmationRequest` + `McpInvokeAudit` + `McpInvokeIdempotency`；19 个 MCP 工具；`/settings/agents` 有审批队列 UI。 |
| 目标状态 | 对 Workspace / Snapshot 的写入也走确认流；团队活动流统一展示 Agent 动作。 |
| 差距等级 | **低–中** |
| 是否优先 | Phase 3（依赖 Workspace 已落地） |
| 前端缺口 | 团队页「活动/审计」Tab 扩展接入 artifact/snapshot 事件；`/settings/agents` 侧增 Workspace 动作分类。 |
| 后端缺口 | 新 MCP 工具：`workspace_list_artifacts` / `workspace_upload_artifact`（必确认） / `snapshot_create`（必确认） / `snapshot_rollback`（必确认，高风险）；`AgentActionAudit.action` 扩展；`McpInvokeIdempotency` 复用。 |
| 完整性缺口 | 所有 Agent 触发的 Workspace 写必走 `AgentConfirmationRequest`；过期/撤销/拒绝路径全覆盖。 |

### G. 权限体系与审计体系

| 项 | 内容 |
|---|---|
| 当前状态 | `Role`(user/admin)、`TeamRole`(owner/admin/member/reviewer)、`TeamAgentRole`(5 档)、`AuditLog`、`AgentActionAudit`、`McpInvokeAudit`、`WebhookDelivery` 审计较全。 |
| 目标状态 | 对象级 ACL：artifact 可见性（team_only / link / public）、snapshot 可见性；统一 `AuditLog.action` 命名空间（`workspace.artifact.*`、`workspace.snapshot.*`、`collab.intent.*`）。 |
| 差距等级 | **中** |
| 是否优先 | Phase 1-2 同步 |
| 前端缺口 | 权限可视化（Workspace 侧边栏）。 |
| 后端缺口 | 枚举扩展；查询默认按可见性过滤；`repository.ts` 新 helper。 |
| 完整性缺口 | 审计必须覆盖"预签名发放 / 成功上传 / 下载 / 删除 / 确认通过或拒绝"五类事件。 |

### H. 后台治理与风控

| 项 | 内容 |
|---|---|
| 当前状态 | admin 子页齐全（`users/moderation/collaboration/reports/audit-logs/mcp-audits/ai-suggestions/health/enterprise/dashboard`）；`ModerationCase`/`ReportTicket`/`AdminAiSuggestion`/`SystemAlert` 成体系；**但无 `Restriction` 模型**；许多页面英文硬编码。 |
| 目标状态 | 三对象（User/Team/Agent）× 四处置（警告/限流/停用/永久封禁），带理由、时效、操作者、可撤销；i18n 完整。 |
| 差距等级 | **中** |
| 是否优先 | Phase 4（合规红线） |
| 前端缺口 | 三个 Restriction 管理台 + 用户/团队/Agent 详情页上的状态条；全部 i18n。 |
| 后端缺口 | `UserRestriction`/`TeamRestriction`/`AgentRestriction` 模型；`middleware.ts` 或 `auth.ts` 在写入前拦截；`AuditLog.action` 扩展。 |
| 完整性缺口 | 申诉入口、自动解除、超期自动恢复任务（可用已依赖的 `pg-boss`）。 |

### I. 中国落地产品技术准备

| 项 | 内容 |
|---|---|
| 当前状态 | 支付三家已接（Stripe/Alipay/WeChat）；`/aigc`、`/privacy`、`/terms`、`/rules` 页在；`PaymentProvider` 枚举完整。**但无数据区域/跨境字段、无"合规可见化面板"、管理后台未本地化**。 |
| 目标状态 | 默认境内存储；跨境显式开关；生成式 AI 内容标识；日志留存策略可配置；合规可见化面板前台可见。 |
| 差距等级 | **中** |
| 是否优先 | Phase 4（可部分 Phase 1 预留字段） |
| 前端缺口 | 工作区设置：数据区域标签；帮助页公示模型与备案链接；后台全量 i18n。 |
| 后端缺口 | `Team.dataRegion` / `Team.crossBorderEnabled`；`ComplianceDisclosure` 配置表（或静态 JSON）。 |
| 完整性缺口 | 跨境开关须联动 presign 的 bucket；否则 UI 是壳。 |

### J. UI/UX 完整性

| 项 | 内容 |
|---|---|
| 当前状态 | Monochrome Geek token 系统完整；大量"reactbits 风"组件已自研；**但核心转化组件（合作申请表单 / admin 表格 / 项目所有者面板）仍是英文原型级**。团队页单列长滚未 tab 化。 |
| 目标状态 | 全局 Tab/Drawer 规范；表单三态齐备；空/错/权限/审核中/限制态统一。 |
| 差距等级 | **中** |
| 是否优先 | Phase 0 起持续 |
| 说明 | 详见 `docs/frontend-audit-v9.md`。 |

### K. 前后端同步程度

| 项 | 内容 |
|---|---|
| 当前状态 | Agent / 订阅 / 讨论 / 团队任务 同步良好；Workspace / Snapshot / 三句合作 / Restriction 全无后端 → 任何前端动作都是壳子。`CollaborationIntentForm` 的 `maxLength` 与 API 不一致是典型前后端脱节。 |
| 目标状态 | 每个新能力先定 schema → OpenAPI → 前端 `openapi-fetch`（已在用）拉起；禁止只合并单侧 PR。 |
| 差距等级 | **高**（主线） |
| 是否优先 | 是 |

---

## 3. 升级主线结论

**唯一主线**：把 `Team` 升格为带「资产室 + 快照 + 配额 + 审计 + 合规」的 **Team Workspace**；并以它为地基，**重写合作申请为三句式合规流**、**把 Agent 写动作全面接入确认流**、**为治理补上 Restriction 三原语**。

**必须围绕主线的模块**

- `WorkspaceArtifact` + presign 扩展 + 团队页 Tab；
- `SnapshotCapsule` + 创建/回滚向导；
- `CollaborationIntent v2`（三句）+ `ReportTicket` 联通 + 举报拉黑；
- Agent MCP 工具对 artifact/snapshot 的读/写（必确认）；
- `UserRestriction` / `TeamRestriction` / `AgentRestriction` 与管理台联通；
- 管理台 i18n 清零。

**现在不应优先做**

- 新增外部连接器（GitHub 现状保持，其它暂不做）；
- OAuth App / Automation / Webhook 功能扩张（冻结维护即可）；
- 更多 AI Suggestion heuristic；
- 全局聊天/私信任何新能力。

**必须避免的"伪完成"**

- 团队页加"工作区" Tab 但无 Artifact API；
- 合作申请换三输入框但 DB 仍存单 `message`；
- Workspace 配额 UI 条但 `TIER_LIMITS` 未扩；
- 管理台增加限制按钮但无 `Restriction` 模型；
- 首页吹 Workspace 但 `/teams/new` 后仍看不到资产面。

**关键产品决策（必须在 v1.2 前书面确认）**

`TeamChatMessage`（WS 实时聊天）与"不做自由私信"的张力。建议：**降级为"团队工作区简讯"**（只对团队成员可见、强制 30 天留存保留、纳入审计、禁止外链/联系方式自动识别），而非彻底下线（有真实数据与用户）。或至少 **冻结新能力** 直到合规可见化完成。

---

## 4. 分阶段升级线路图

### Phase 0：产品边界收口与信息架构校正

- **阶段目标**：让"叙事 / 路由 / 关键表单"与 Workspace 主线对齐；补齐紧迫技术债。
- **前端任务**
  - 首页 Hero 副标 + 支柱加入"Team Workspace"维度；
  - `SiteNav` 预留"工作区"概念（可先仍链到 `/teams`）；
  - 团队页改为 **Tab 架构**：概览 / 工作区（占位）/ 任务 / 里程碑 / 讨论 / 活动（各 panel 已独立）；
  - `CollaborationIntentForm` **紧急同步** `maxLength` 到与 API 一致；全量 i18n；
  - admin 英文硬编码 i18n 清扫。
- **后端任务**
  - `/workspace/enterprise` 文档化为 deprecated；为 `/workspace/*` 新路由空间定规划；
  - `CollaborationIntent` OpenAPI 描述修正；
  - Phase 1 `WorkspaceArtifact` 迁移草案（schema RFC）。
- **数据与接口任务**：无新表；`openapi.json` 重跑 `validate:openapi`。
- **权限与状态流**：无变更。
- **后台管理**：i18n；无新功能。
- **验收**
  - 五大 admin 页中文切换后无英文残留；
  - 合作申请表单 `maxLength` 与 API 一致；无报错；
  - 团队页 Tab 骨架存在且 workspace Tab 显示"即将推出"占位（带 feature flag）。
- **风险**：Tab 重排可能影响既有 e2e（`team-flow.spec.ts`）；需同步更新选择器。

### Phase 1：Team Workspace 骨架补齐

- **阶段目标**：Artifact 闭环 — 团队成员可上传、查看、下载、删除非图片文件；Agent 上传走确认；所有动作留审计。
- **前端任务**
  - 团队页「工作区」Tab 正式上线：
    - 空态 / 上传中态 / 扫描中态 / 限流态 / 配额满态；
    - 文件卡片（类型图标、大小、上传者、可见性标签、操作菜单）；
    - 删除走 `ConfirmDialog`；非成员 403 错误态；配额条（复用 `StatCard`）。
  - `/settings/subscription` 显示 Workspace 存储配额。
- **后端任务**
  - 新表 `WorkspaceArtifact`（`teamId`, `kind`, `mime`, `sizeBytes`, `storageKey`, `visibility`, `createdByUserId`, `createdByAgentBindingId?`, `validationState`, `retentionUntil`）；
  - `GET/POST/DELETE /api/v1/teams/[slug]/artifacts`、`/artifacts/[id]/download-url`；
  - `uploads-presign.ts` 扩展：新增 `createPresignedTeamArtifactUrl`（路径 `teams/{teamId}/artifacts/{date}-{cuid}-{safe}`，非图片白名单，单文件上限按 Tier）；
  - `AuditLog.action` 新增：`workspace.artifact.presign` / `.uploaded` / `.deleted` / `.downloaded`；
  - `TIER_LIMITS` 扩展 `workspaceStorageMb`；
  - 配额校验 helper；
  - `repositories/workspace-artifact-repository.ts`。
- **数据与接口任务**：OpenAPI 增补；新 vitest 用例 `workspace-artifact-repository.test.ts`、`workspace-presign-security.test.ts`。
- **权限与状态流**：非成员不可读；`member+` 可读；`admin/owner` 可删除；Agent `executor+` 可请求上传（进入 `AgentConfirmationRequest`）；`validationState` 枚举 `pending → ready | rejected`。
- **后台管理**：管理员可查看任意团队 artifact 列表（只读）+ 强制删除（审计）。
- **验收**
  - 非成员访问 `GET /artifacts` 返回 403 且页面渲染错误态；
  - 超配额上传被拒；
  - 文件删除写入审计并在团队活动流显示；
  - Agent 通过 MCP `workspace_upload_artifact` 触发 `AgentConfirmationRequest`，owner 批准后才落盘。
- **风险**
  - 对象存储未配置时全站报错：需 `UPLOADS_NOT_CONFIGURED` 明确态；
  - 非图片文件病毒扫描缺位：先仅 MIME+扩展名白名单 + 大小限制，`validationState=pending` 保留扩展位。

### Phase 2：项目快照与合作申请闭环

- **阶段目标**：Snapshot Capsule MVP + CollaborationIntent v2（三句式）上线；合作申请与 `ReportTicket` 联通。
- **前端任务**
  - 团队页「工作区」加「快照」子区：列表、详情、创建向导（勾选 artifact + 填摘要 + 目标 + 角色）、回滚确认；
  - 公开只读快照页 `/teams/[slug]/snapshots/[id]`；
  - 合作申请重写（模态/抽屉 + 三 `<textarea>` + 字数计数 + 提交前审核声明 + 禁止联系方式正则提示）；
  - 项目所有者面板重写：接受/婉拒/忽略/拉黑举报四动作；
  - `notifications` 页增加"合作申请状态变更"分组（`InAppNotificationKind.collaboration_intent_status_update` 已有）。
- **后端任务**
  - 新表 `SnapshotCapsule`；
  - `POST /api/v1/teams/[slug]/snapshots`、`GET .../snapshots`、`.../snapshots/[id]`、`.../snapshots/[id]/rollback`；
  - `CollaborationIntent` 迁移：新增 `pitch/whyYou/howCollab`，保留 `message` 用于旧数据（脚本 concat）；API 输入改三字段；zod 每字段 10-250；拦截 URL/邮箱/电话/QQ/微信 正则（扩展 `content-safety.ts`）；新增 `POST .../intents/[id]/ignore`、`.../block-and-report` → 联动 `ReportTicket`；
  - 同一用户对同一项目 24h 申请限流；拒绝后冷却期。
- **数据与接口任务**
  - OpenAPI 重跑；
  - MCP `submit_collaboration_intent` 输入 schema 同步；
  - 旧 `contact` 字段停写（新提交不允许）、读时脱敏；`types.ts` 打 deprecated tag。
- **权限与状态流**
  - 快照创建：team `member+`；回滚：team `owner/admin`；Agent 创建快照必走 `AgentConfirmationRequest`；
  - 合作申请状态机：`pending → approved | rejected | ignored | blocked`；blocked 触发 `ReportTicket`。
- **后台管理**
  - `/admin/collaboration` 支持三字段展示 + 四动作批处理 + 风险标识；
  - 新增 `/admin/snapshots`（只读审计）。
- **验收**
  - 三句式每字段 >250 字前端即时阻断且 API 422；
  - contact 字段在新提交中不存在；
  - 快照回滚不删除旧快照，只创建新 manifest；
  - 数据迁移后所有旧 `message` 可见只读。
- **风险**：`contact` 下线可能破坏旧 e2e；三句式增加摩擦 → 需空状态引导话术。

### Phase 3：Agent 受控协作闭环

- **阶段目标**：Agent 对 Workspace/Snapshot 的读写全部审计 + 高风险必确认；团队活动流统一视图。
- **前端任务**
  - 团队「活动」Tab 聚合：artifact 上传/删除、snapshot 创建/回滚、agent 动作、confirmation 决定；复用 `team-activity-timeline`；
  - `/settings/agents` 确认队列按"对象类型"分组过滤；
  - Agent 角色牌 tooltip 更新（5 档对 artifact/snapshot 的可见动作矩阵）。
- **后端任务**
  - 新 MCP 工具：`workspace_list_artifacts`（`read:team:workspace` scope）、`workspace_request_upload`、`snapshot_create`、`snapshot_rollback`（均写、均走 confirmation）；
  - `ApiKey.scopes` 新增 `read:team:workspace` / `write:team:workspace`；
  - `MCP_V2_TOOL_NAMES / WRITE_TOOLS / SCOPES` 同步。
- **数据与接口任务**：`McpInvokeIdempotency` 复用；`AgentActionAudit.action` 字符串扩展（无需 migration）。
- **权限与状态流**：`TeamAgentRole` 与动作矩阵明文化 — reader 仅读 / commenter 读+评论 / executor 可请求写 / reviewer 可提交审查 / coordinator 可协调；**无论哪档，高风险写入都走 confirmation**。
- **后台管理**：`/admin/mcp-audits` 增按工具类型 facet。
- **验收**
  - 所有 Workspace 写 MCP 调用产生 `AgentConfirmationRequest`；
  - 拒绝/过期/撤销路径全部有 UI 显示与 `InAppNotification`；
  - 超时清理任务（`pg-boss`）按期 expire。
- **风险**：工具爆炸，维护成本 → 以白名单 + 自动生成文档控制。

### Phase 4：后台治理、风控与中国落地准备

- **阶段目标**：Restriction 三原语 + 合规可见化 + 数据区域语义。
- **前端任务**
  - `/admin/restrictions`（用户/团队/Agent 三 Tab）+ 设置期限、理由、可撤销；
  - 用户/团队/Agent 详情页顶部红色状态条；
  - `/help/compliance`（公开）与工作区设置内的"合规可见化面板"：数据区域、模型公示、Agent 行为统计、审计留存期；
  - 管理台全量 i18n 收尾。
- **后端任务**
  - 新表 `UserRestriction` / `TeamRestriction` / `AgentRestriction`（`targetId`, `kind`, `reason`, `startsAt`, `endsAt?`, `createdBy`, `revokedAt?`）；
  - `middleware.ts` / `auth.ts` / 关键 repository 入口在写入前检查；
  - `Team.dataRegion`（enum `cn | global`）、`Team.crossBorderEnabled`（bool，默认 false）；presign 按区域选 bucket（env 双配置）；
  - `pg-boss` 定时任务自动解除 `endsAt` 到期的限制。
- **数据与接口任务**：OpenAPI 新增；公开合规 JSON 端点 `GET /api/v1/public/compliance`。
- **权限与状态流**：被限制账号写操作 403 并返回 `RESTRICTED`；申诉走 `ReportTicket` 反向通道。
- **后台管理**：限制台 + 申诉台 + 自动解除日志。
- **验收**
  - 被封用户无法发帖、上传、提交申请；
  - 跨境关闭时 presign bucket 强制为 CN；
  - 合规页展示当前工作区真实模型列表与备案状态。
- **风险**：限制逻辑遗漏写入点 → 必须在 repository 层统一入口而非单点检查。

---

## 5. 版本级实施计划

### v1.1 — 叙事收口 + 技术债清零

- **主题**：Phase 0 全量。
- **必做**：合作申请 `maxLength` 与 API 一致、admin i18n 清扫、首页/导航叙事微调、团队页 Tab 骨架、`/workspace/*` 命名空间规划。
- **前端交付**：上述微调；`CollaborationIntentForm` 文案全中文化但字段暂不改三句。
- **后端交付**：OpenAPI 描述修正；Phase 1 schema RFC 文档。
- **不纳入**：Workspace 新表；三句式；Restriction。
- **为什么**：低风险、先修复既有破口再建新物。

### v1.2 — Workspace MVP

- **主题**：Phase 1 核心。
- **必做**：`WorkspaceArtifact` + presign 扩展 + 团队页工作区 Tab + 配额 + 审计；Agent 上传走 confirmation。
- **前端交付**：工作区 Tab（上传/列表/删除/权限/配额/五态齐备）；订阅页显示存储配额。
- **后端交付**：新表、6 个新 API、新 MCP scope；新 vitest；`TIER_LIMITS` 扩展。
- **不纳入**：快照、三句式、限制台。
- **为什么**：Workspace 是所有后续功能的 **地基**，必须单独一个版本稳定。

### v1.3 — Snapshot + CollaborationIntent v2

- **主题**：Phase 2。
- **必做**：`SnapshotCapsule` 全链路；三句式改造与旧数据迁移；举报拉黑动作；公开只读快照页。
- **前端交付**：快照向导、时间线、回滚、三句表单与所有者面板重写。
- **后端交付**：两类表迁移、`content-safety` 扩展、MCP scope 同步。
- **不纳入**：Agent 对 artifact/snapshot 的写入路径（留给 v2.0）。
- **为什么**：先把两条与用户侧强相关的"完整性"做透。

### v2.0 — Agent × Workspace + 治理 + 合规可见化

- **主题**：Phase 3 + Phase 4，版本号跃升因为数据主体（Workspace）+ 治理主体（Restriction）+ 合规主体同时稳定。
- **必做**：Agent 对 artifact/snapshot 的 confirmation 路径、Restriction 三原语、合规页、数据区域开关、管理台 i18n 收尾。
- **前端交付**：活动流聚合、限制台、合规页。
- **后端交付**：Restriction 模型与中间件、区域 bucket、`pg-boss` 定时任务。
- **不纳入**：企业 SSO、本地同步 CLI、更多外部连接器。
- **为什么**：2.0 对外承诺"受控 Agent + 受控用户 + 受控内容 + 可解释合规"，一次打包更易沟通。

---

## 6. 技术实施建议

- **适合渐进式改造**
  - 团队页 Tab 化（各 panel 已分离，成本低）；
  - 首页/导航文案；
  - i18n 清扫；
  - `TIER_LIMITS` 扩展。
- **应直接重构**
  - `CollaborationIntent`：单 `message` → 三字段 + 拦截器，兼容层读旧写新；
  - `project-collaboration-owner-panel.tsx`（英文硬编码，四动作重写）。
- **必须先定义的数据模型（顺序）**
  1. `WorkspaceArtifact`（v1.2）
  2. `SnapshotCapsule`（v1.3）
  3. `CollaborationIntent v2` 字段（v1.3）
  4. `UserRestriction / TeamRestriction / AgentRestriction`（v2.0）
  5. `Team.dataRegion / crossBorderEnabled`（v2.0）
- **必须先统一的 API**
  - Workspace artifact REST 错误码、presign 响应结构、删除语义（soft/hard）；
  - OpenAPI 同步（`validate:openapi` + `generate:types` 已有脚本，必须纳入 CI 红线）。
- **前端应后做**
  - 高级活动流聚合、合规页可视化 → 等后端事件与数据稳定；
  - 快照 diff 可视化 **不推荐做**（会走向 repo 替代）。
- **只做 UI 会形成技术债**
  - 团队工作区 Tab 无 API；
  - 合作申请三输入框未改 schema；
  - 配额条无真实计算；
  - 限制台按钮无 Restriction 表。
- **适合先 MVP**：Workspace artifact（先仅文件列表 + 基础类型）；Snapshot（先 manifest JSON）。
- **必须一次做完整**：`AgentConfirmationRequest` 路径（已有基础，不能破窗）；Restriction 中间件（遗漏 = 合规风险）。

---

## 7. 最终结论

**只能做 3 件事，应该是**

1. `WorkspaceArtifact` + 团队页工作区 Tab + presign/ACL/审计 全链路（v1.2 主体）。
2. 合作申请重写为三句式并接通 `ReportTicket`（v1.3 前半）。
3. Agent 对 Workspace/Snapshot 的写动作进入 `AgentConfirmationRequest`（v2.0 前半）—— 决定白皮书核心承诺"Agent 合法进入团队"是否真的闭环。

**最不应该做的 3 件事**

1. 扩张 OAuth App / Automation / Webhook / AI Suggestions（已超建设）。
2. 继续加码实时聊天或新增任何"自由沟通"产品面（与白皮书直接冲突）。
3. 把 Workspace 做成 GitHub repo 替代（diff/merge/branch/CI）—— 越界红线。

**如何确保不是功能堆积**

强制执行铁律：**任一新能力进版本号前必须满足** "schema → migration → API → OpenAPI → 权限 → 审计/状态机 → UI 五态 → 管理台可追溯 → `npm run check` 绿" 全部勾选；禁止只合并单侧 PR — PR 描述中必须同时列出前后端 diff 文件，否则不许合。

---

## 8. 给工程 Agent 的执行总纲

1. **v1.1**
   - 读 `schema.prisma` 与 `MCP_V2_TOOL_NAMES`，确认无 Workspace / Snapshot / Restriction。
   - 修复 `collaboration-intent-form.tsx` `maxLength` 与 API 对齐 + 全文 i18n。
   - 清扫 `admin/*` 英文硬编码（至少 `moderation / collaboration / reports / audit-logs` 页）。
   - 首页 Hero 副标 + 支柱加入 Workspace 维度；`SiteNav` 预留。
   - 团队页拆 Tab，workspace Tab 先占位 + feature flag。
   - 更新 e2e 选择器。
2. **v1.2**
   - 新 migration 引入 `WorkspaceArtifact`；扩展 `TIER_LIMITS` 与 `uploads-presign`；6 个新 API；团队页 Tab 上线；Agent `workspace_request_upload` MCP 工具。
   - 新增 vitest：`workspace-artifact-repository.test.ts`、`workspace-presign-security.test.ts`、`w9-team-workspace.test.ts`；e2e：`workspace-upload.spec.ts`。
   - 全程 `npm run check` 绿。
3. **v1.3**
   - `SnapshotCapsule` migration + API + UI；
   - `CollaborationIntent` 迁移（三字段 + 兼容读）+ 前端重写 + 举报/拉黑动作 + MCP 输入 schema 同步；
   - 扩展 `content-safety.ts` 拦截联系方式正则；
   - OpenAPI + types 重生成。
4. **v2.0**
   - `AgentConfirmationRequest` 覆盖 artifact/snapshot；`MCP_V2_WRITE_TOOLS` 扩展；
   - 三 Restriction 表 + 中间件 + 管理台 + 解除任务；
   - `Team.dataRegion` + 区域 bucket；
   - 合规页；
   - 管理台 i18n 收尾。
5. **全程纪律**
   - 禁止只合并单侧 PR；
   - `npm run check` 作为版本门禁；
   - 产品决策先行：实时聊天命运（冻结或降级为工作区简讯）必须在 v1.2 前书面确认；
   - 禁止触碰 IDE / 在线编辑器 / repo-diff 方向任何新代码。

---

## 附：与白皮书章节的映射

| 白皮书章节 | 本路线图对应 |
|---|---|
| §3 战略定义（Local-first / Workspace-centric / Human-confirmed Agent） | Phase 1 + Phase 3 |
| §4.1 Team Workspace | Phase 1（v1.2） |
| §4.2 Snapshot Capsule | Phase 2（v1.3） |
| §4.3 Collaboration Request | Phase 2（v1.3） |
| §4.4 Agent Governance | Phase 3（v2.0） |
| §4.5 Compliance & Safety | Phase 4（v2.0） |
| §4.6 协作信用档案 / 合规可见化 | Phase 4 部分（2.x 继续迭代） |
| §8 中国合规与治理落地 | Phase 4 |
| §9 技术实现建议 | 贯穿各 Phase（特别是数据对象定义） |
| §10 12-18 个月路线图 | 见上述 Phase 0 → Phase 4 |
| §11 主要风险与应对 | 各 Phase "风险" 小节 |
