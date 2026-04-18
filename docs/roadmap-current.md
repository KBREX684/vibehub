# VibeHub Roadmap (Current)

更新日期：2026-04-18

## 当前主线

VibeHub 当前正式主线已切换到 **V9.0 Team Workspace 协作中枢**。

核心定义：

- 不做 IDE
- 不做 repo 主路径
- 本地开发不变，云端协作升级
- Team Workspace 是核心主产品
- Agent 必须合法、受控、可审计地进入团队
- 中国化合规与治理不是附录，而是产品能力

## 当前战略结构

V9.0 聚焦四层闭环：

1. 公开发现：讨论区 / 项目画廊 / 创作者主页
2. 协作入口：三句式合作申请通道
3. 协作中枢：Team Workspace + Snapshot Capsule
4. 受控执行：Agent Governance + Restriction + Compliance Visibility

产品定位统一为：

- 中国中文开发者优先
- 2–10 人小团队 / 工作室优先
- Free + Pro 为现有公开订阅
- Team Workspace 为下一阶段核心付费锚点
- 企业能力继续降级为认证与治理辅助，不作为主飞轮

## 当前基线

V8 已完成并继续沿用的能力：

- 广场讨论、项目画廊、团队协作、开发者中心
- AgentBinding、TeamAgentMembership、AgentActionAudit、AgentConfirmationRequest
- API Keys、OpenAPI、MCP v2
- Free / Pro 支付与合规页面
- 统一设计 token、UI 原件与 i18n 基础设施

V9 不推翻这些能力，而是在其上补齐：

- `WorkspaceArtifact`
- `SnapshotCapsule`
- `CollaborationIntent v2`
- `Restriction` 三原语
- 数据区域与合规可见化

## 当前阶段

当前进入 V9.0 文档化与执行准备阶段，实施将按以下子阶段推进：

- `P0-1` 边界校正与现状止血
- `P0-2` 设计系统收口与页面骨架统一
- `P1-1` Workspace 数据层与存储入口
- `P1-2` Workspace 页面与订阅承接
- `P2-1` 三句式合作申请迁移
- `P2-2` Snapshot Capsule MVP
- `P3-1` Agent × Workspace 读写矩阵
- `P3-2` 统一活动流与确认流
- `P4-1` Restriction 三原语与治理拦截
- `P4-2` 合规可见化与中国化收口

## 当前验收主链路

V9.0 的主链路将重构为：

1. 用户在广场和项目页被发现
2. 通过三句式合作申请建立协作连接
3. 团队进入 Team Workspace 共享资产与快照
4. Agent 通过受控权限与确认流参与执行
5. 治理、限制、合规与数据区域能力前台可感知

## 明确冻结项

V9.0 执行期间，以下方向默认冻结，仅允许修复缺陷与保持兼容：

- OAuth Apps 扩张
- Automation 新能力
- Webhook 新能力
- 外部连接器扩张
- 团队聊天的新功能扩张
- IDE / repo / CI 相关任何新主线
- 新的营销型动效组件引入

## 配套文档

- 当前主线索引：`docs/roadmap-current.md`
- **V9.0 总路线图：`docs/ecosystem-roadmap-v9.0.md`**
- **V9.0 实施计划书：`docs/ecosystem-implementation-plan-v9.0.md`**
- v8 战略底本：`docs/product-strategy-v8.md`
- v8 已落地进度：`docs/v8-progress.md`
- v8 全维度路线图：`docs/roadmap-v8.md`
- v7 历史路线图：`docs/roadmap-v7.md`
- 历史演进：`docs/roadmap-history.md`
- 发布与整改记录：`docs/release-notes.md`
- 上线就绪标准：`docs/launch-readiness-standard.md`

## V9.0 当前判断

V9.0 不是“再做一轮功能”，而是：

- 把 `Team` 升格为 `Team Workspace`
- 把合作意向升级为合规协作通道
- 把 Agent 治理从“可调用”升级为“可控协作”
- 把治理与中国化从“后台存在”升级为“用户可感知”

完整细节见 `docs/ecosystem-roadmap-v9.0.md` 与 `docs/ecosystem-implementation-plan-v9.0.md`。
