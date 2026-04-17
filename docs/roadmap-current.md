# VibeHub Roadmap (Current)

更新日期：2026-04-16

## 当前战略

VibeHub 聚焦三条主线，面向中国国内落地：

1. 社区 → 项目 → 协作意向
2. 项目 → 团队 → 任务 / 里程碑
3. 开发者 API / MCP / Agent 接入

产品定位统一为：

- 开发者优先
- 小团队优先
- Free + Pro（支付适配中国路径）
- 企业能力降级为认证标识，不是主飞轮
- 中国国内落地优先，合规前置

## 主飞轮

开发者在广场讨论中产生灵感 → 在项目画廊中展示作品 → 在团队平台中组队协作 → 通过 API/MCP 让 agent 参与执行 → 协作成果反哺社区内容供给。

## 当前阶段：P0 生产落地

当前处于 v7.0 路线图 P0 阶段，目标是从"可演示"推进到"可放量"。

P0 核心任务：

1. 登录体系重构（邮箱登录 + GitHub 关联）
2. 企业能力降级为认证标识
3. Mock 退出生产路径
4. 中国基础合规框架（隐私政策、用户协议、举报通道、账号注销）
5. API / 鉴权 / 审计生产基线
6. 项目画廊 / 广场讨论 / 团队协作主链路收口
7. 支付抽象层设计（预留支付宝/微信）
8. 管理员后台治理能力重构 + AI 审核助手 MVP
9. 部署 / 监控 / 日志 / 回滚最低生产要求

详见 `docs/roadmap-v7.md` 完整路线图。

## 当前主线能力

### 1. 社区与项目发现

- 讨论区、评论、点赞、收藏、关注
- 项目展示、搜索、筛选、排行榜
- 协作意向提交与审核

### 2. 小团队协作

- 团队创建
- 入队申请与审批
- 任务板、里程碑、团队聊天
- 基于成员 / 创建者 / owner 的协作权限

### 3. 开发者工具

- API Keys + scopes
- OpenAPI 导出与校验
- MCP v2 manifest / invoke
- 公开 API 与 embed / oEmbed

## 当前订阅模型

- `free`
- `pro`

不再存在 `team_pro` 或多档团队订阅。

## 企业能力定位（v7.0 降级）

企业能力降级为"认证标识 + 资料展示字段"：

- `EnterpriseProfile` 仅产出认证徽章
- 企业工作台入口从主导航移除
- 后台保留企业认证审核能力
- `EnterpriseMemberInvite` 模型冻结

平台管理员与 enterprise access 是两条独立权限线：

- `admin`: 平台治理、审核、运维
- `enterpriseStatus=approved`: 认证标识展示

## 当前验收主链路

1. 登录（邮箱 + GitHub 关联） → 创建 creator profile → 发布项目
2. 浏览项目 → 提交协作意向 → 审核
3. 创建团队 → 入队审批 → 任务推进
4. 创建 API Key → 调用公开 API / MCP
5. 升级 Pro → 权限与额度生效

## 明确不做

- 挑战赛（P3 之前不启动）
- 企业工作台重建
- 多 agent 自治编排（P2 之后）
- Light/Dark 主题切换
- PWA / Service Worker

## 配套文档

- 当前主线：`docs/roadmap-current.md`
- **v8.0 战略底本：`docs/product-strategy-v8.md`**（市场定位 · 差异化 · 商业 · 成本 · 边界）
- **v8.0 全维度路线图：`docs/roadmap-v8.md`**（八条工作线 · Alpha/Beta/GA）
- v7.0 生产化升级总计划：`docs/roadmap-v7.md`（历史主线）
- v5.0 路线图（历史存档）：`docs/roadmap-v5.md`
- 历史演进：`docs/roadmap-history.md`
- 发布与整改记录：`docs/release-notes.md`
- 仓库整理报告：`docs/repository-cleanup-report.md`
- 上线就绪标准：`docs/launch-readiness-standard.md`

## v8.0 定位要点（2026-04-17 重新立项）

v8.0 不是"再做一轮功能"，而是**把 VibeHub 重立项为"中国中文开发者的 AI+Human 协作网络"**：

- **市场定位**：中国大陆 · 中文开发者 · VibeCoder + 小团队 + Agent Builder
- **四条支柱**：广场讨论 · 项目画廊 · 团队协作 · **Agent 协作总线**
- **唯一壁垒**：AI Agent 在人类团队里是可审计 / 可追溯 / 可被人工驳回的"正式队员"
  - 人 ↔ 人、人 ↔ Agent、同用户 Agent ↔ Agent、跨用户 Agent ↔ Agent（受控开通）四种协作模式
  - Agent 永远不自治；所有高风险写入必须走 `AgentConfirmationRequest`
- **成本守恒**：平台不自营 LLM、不代烧用户 token；国产模型优先；月固定成本 < ¥3100
- **商业模型**：Free / Pro（¥29/月）/ Team（¥99/月起）+ MCP Developer Access 按量（P1）
- **不做项**：挑战赛 · 企业工作台 · Agent 自治 · 自营 LLM · 代码托管 · CI/CD · 海外优先 · 补贴增长

v8.0 GA 十个门槛（摘录）：中国合规完成 · 支付宝/微信任一渠道真实商户跑通 · Redis 上线 · Agent 协作总线（角色牌+协作日志+Confirmation）端到端 · 首屏叙事讲透定位 · 设计系统组件层统一 · 运营仪表盘三北极星（WAHC / AO% / Agent 拒绝率） · AI 审核助手真实闭环 · 成本守恒 · 质量基线。

完整细节见 `docs/product-strategy-v8.md` 与 `docs/roadmap-v8.md`。
