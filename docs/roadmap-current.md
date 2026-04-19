# VibeHub Roadmap (Current)

更新日期：2026-04-19

## 当前主线

VibeHub 当前正式主线已切换到 **v10.0 工作台单主面**。

核心定义：

- 不做 IDE
- 不做 repo 主路径
- 本地开发不变，云端协作升级
- `/work` 是认证后的唯一主面
- `/p/[slug]` 与 `/u/[slug]` 是公开主面
- Team Workspace 已工作台化
- Agent 必须合法、受控、可审计地进入团队
- 产品当前只服务中国市场：中文单语言、支付宝单支付

## 当前产品结构

v10.0 聚焦四层闭环：

1. 公开发现：`/discover`、`/p/[slug]`、`/u/[slug]`
2. 协作入口：三段式合作申请与 `/work/intents`
3. 协作中枢：Personal Workspace / Team Workspace / 文件 / 快照 / 交付包
4. 受控执行：Agent Tasks / Confirmation / Notifications / 审计活动流

产品定位统一为：

- 中国中文开发者优先
- 2–10 人小团队 / 工作室优先
- 个人工作台 + 团队工作区双层结构
- Team Workspace 是核心协作与付费锚点
- 开发者能力内收到 `/settings/developers`
- 旧 `projects / creators / teams / discussions / collections / leaderboards / developers` 路径进入兼容或退场模式

## 当前已完成主干

v10 已经落地的核心能力：

- `Workspace`、`WorkspaceArtifact`、`SnapshotCapsule`、`WorkspaceDeliverable`、`AgentTask`
- `/work/personal`、`/work/library`、`/work/intents`、`/work/agent-tasks`、`/work/notifications`
- `/work/team/[slug]` 团队工作区主面
- `/p/[slug]`、`/u/[slug]` 新公开入口
- 三段式合作申请与 owner 四动作
- 文件上传/下载/删除、快照创建/回滚、交付包提交/审核
- Agent 高风险动作确认流与统一活动流
- 中文单语言、支付宝单支付

## 当前阶段

当前进入 **v10 收口阶段**，重点不是再加新对象，而是把主面与旧路径彻底切正：

- 固化 `/work` 为唯一认证后入口
- 固化 `/p/[slug]` 与 `/u/[slug]` 为唯一公开主面
- 清理首页、页脚、搜索、命令面板、通知与卡片中的旧路径输出
- 将旧 `teams / projects / creators / discussions / collections / leaderboards / developers` 降级为兼容跳转或退场入口
- 用浏览器走查验证无抖动、无闪屏、无重定向循环

## 当前验收主链路

v10.0 当前验收链路固定为：

1. 用户在 `/discover` 发现项目
2. 进入 `/p/[slug]` 查看项目并发起合作申请
3. 在 `/work/intents` 收到、处理或追踪协作状态
4. 在 `/work/team/[slug]` 或 `/work/personal` 内完成文件、快照与交付流
5. Agent 任务、确认流、通知与活动流统一在 `/work` 体系内闭环

## 明确冻结项

v10.0 收口期间，以下方向默认冻结，仅允许修复缺陷与保持兼容：

- OAuth Apps 扩张
- Automation 新能力
- Webhook 新能力
- 外部连接器扩张
- 团队聊天的新功能扩张
- IDE / repo / CI 相关任何新主线
- 额外视觉重做与品牌动效扩张
- 国际化恢复与海外支付恢复

## 配套文档

- 当前主线索引：`docs/roadmap-current.md`
- v10 功能与 IA 重构以当前代码为准，旧 v9 文档转为历史背景：
  - `docs/ecosystem-roadmap-v9.0.md`
  - `docs/ecosystem-implementation-plan-v9.0.md`
- 历史路线图与进度：
  - `docs/product-strategy-v8.md`
  - `docs/v8-progress.md`
  - `docs/roadmap-v8.md`
  - `docs/roadmap-v7.md`
  - `docs/roadmap-history.md`
- 发布与验收：
  - `docs/release-notes.md`
  - `docs/launch-readiness-standard.md`

## 当前判断

v10.0 当前不是“继续扩功能”，而是：

- 把工作台主面和公开主面彻底切正
- 把旧路径从主产品语义中退场
- 把中国化运行时口径收稳
- 把浏览器稳定性和路径一致性做到可发布
