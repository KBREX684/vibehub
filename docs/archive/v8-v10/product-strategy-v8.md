> ⚠️ 已归档：本文件仅供历史参考，不得作为当前实现依据。当前主线请看 `docs/roadmap-current.md` 与 v11 系列文档。

# VibeHub 产品计划书 v8.0（中国落地 · AI+Human 协作网络专业版）

> 版本：v8.0
> 日期：2026-04-17
> 替代：`VibeHub_项目计划书_v3.0.md`（标记为"v4.0 专业版"）——本文是自此起的唯一正式计划书
> 定位：中国大陆落地优先 · 面向中文开发者与小团队 · AI+Human 协作网络
> 底线：不以烧钱补贴用户 · 不做 LLM 自营 · 不做代码托管 · 不与 IDE 正面竞争 · 不以企业工作台为中心
> 冻结法则：本文与 `docs/launch-readiness-standard.md` 冲突时，以 launch-readiness-standard 为准

---

## 0. 为什么要在 v8 重立项

v7.0 已经做完"从可演示到可放量"的所有生产化工作：邮箱登录、合规框架、Mock 退出、API/MCP、订阅抽象层、后台治理、RC 演练。继续按旧计划书推进，会让 VibeHub 越来越像"又一个 Product Hunt + 又一个 GitHub Explore + 又一个飞书团队空间"。这三者加在一起，既不是差异化，也不是护城河。

同时仓库里已经**实际落地**了外部看不见但极其关键的基础设施：

- `AgentBinding` / `ApiKey.agentBindingId` / `AgentActionAudit` / `AgentConfirmationRequest`
- `AutomationWorkflow` / `AutomationWorkflowStep` / `AutomationWorkflowRun`
- MCP v2 写工具：`create_post` / `create_project` / `submit_collaboration_intent` / `create_team_task` / `agent_complete_team_task` / `agent_submit_task_review` / `request_team_task_delete` / `request_team_member_role_change`
- 人工确认流（AgentConfirmationRequest.status = pending/approved/rejected/expired）

这些东西是 Product Hunt / GitHub / 飞书都没有、也不会做的能力。v8 的使命就是：**把这条只有 VibeHub 具备的"Agent 合法参与人类团队"的闭环，作为产品北极星**，让 VibeHub 不再是"社区 + 协作工具"，而是"人机混合协作网络"。

v8 同时要求：**重点落地中国、服务中国开发者，不做海外优先**。这不是营销口号，而是影响架构、合规、支付、LLM 选型、内容策略、增长策略的第一性约束。

---

## 1. 市场定位（冻结）

### 1.1 一句话定位

**VibeHub 是面向中国中文开发者的 AI+Human 协作网络：开发者在这里获得灵感、展示作品、召集队友，并让自己的 AI Agent 合法地参与团队协作。**

展开形式：

- 广场讨论 — 灵感与经验沉淀（人类）
- 项目画廊 — 作品曝光与发现（人类 + AI 可检索）
- 团队协作 — 人 + Agent 一起推进任务（人类 + AI）
- 协作总线 — 外部 Agent 通过 MCP / API 合法参与（AI）

### 1.2 服务人群（主）

**中国大陆中文开发者，面向 AI 时代的独立开发者、小团队、副业创作者、工具链研究者。**

三类主用户画像：

1. **VibeCoder（主力）**：熟练使用 Cursor / Claude Code / OpenClaw / Codex 之一，日常用 AI 写代码、有独立作品或 side project，希望被看见 + 被组队 + 被人用。体量：几十万级。
2. **Team Lead（次主力）**：正在带 2~5 人小团队做产品或接外包，想用 AI 放大人力，需要一个"人 + Agent 都能参与"的协作空间。
3. **Agent Builder（差异化）**：做 MCP 工具、做 AI 工作流、做自动化 agent 的开发者。他们既是用户，也是平台的"协议受益者"。

不服务 / 弱服务：

- 大型企业研发团队（飞书 / 钉钉 / Gitee 企业版占据）
- 纯投资者 / 猎头视角（不做 investor radar）
- 欧美英语用户（v8 不做海外市场）

### 1.3 主飞轮（AI+Human 网络）

```
灵感 (广场) → 作品 (项目) → 组队 (团队) → 协作 (人+Agent 共同推进) → 产出 (可被检索/被订阅)
                                                    ↓
                                              外部 AI 工具
                                           (Cursor / Claude / 自建 agent)
                                              通过 MCP / API 读写
                                                    ↓
                                              回流到广场与项目
```

**关键差异**：把 agent 作为"平台一等公民"而不是"调用方"。agent 有绑定身份、有 scope、有审计、有确认流、有活动时间线——和人类队员一模一样的协作触点，但永远隶属于其绑定用户的授权。

### 1.4 北极星指标（North Star Metrics）

v8 只看两个指标：

1. **WAHC（Weekly Active Hybrid Collaborations）**：每周至少发生过一次"人+Agent 同时操作"的团队数。
2. **AO%（Agent Operation Ratio）**：全平台团队任务操作里由 agent 发起、最终人工确认完成的比例。

这两个指标只要同时上涨，VibeHub 的壁垒就在变厚；其他指标（DAU、帖子数、项目数）是辅助。

### 1.5 支撑指标

- 日活创作者（DAC）：连续 7 天发过帖 / 建过项目 / 提过 commit 链接的用户数
- 团队人机混合度（Team Hybridity）：一个团队里至少有一个 agent 参与过任务的比例
- Agent 操作拒绝率（Agent Rejection Rate）：agent 发起但被人工驳回的比例（健康区间 5%~15%；过高说明 agent 越权、过低说明人工空转）
- 合规治理响应时间中位数（Moderation P50）
- 付费留存（Pro retention M3 / M6）

---

## 2. 差异化：与市面产品的硬对比

| 维度 | VibeHub | Product Hunt | GitHub / GitHub Explore | 掘金 / SegmentFault | 飞书 / 钉钉 | 飞书 aily / Dify | Cursor Community |
|------|---------|--------------|------------------------|---------------------|-------------|--------------------|-----------------|
| 主用户 | 中文 VibeCoder + 小团队 | 英文产品猎人 | 全球开发者 | 中文开发者 | 企业 | 企业 AI 落地 | Cursor 用户 |
| 核心产物 | 人+Agent 协作流 | 产品首发榜 | 代码仓库 | 技术文章 | 工作沟通 | AI 工作流 | 编辑器使用 |
| Agent 角色 | 一等公民，平台内绑定+审计+确认 | 无 | 无 | 无 | 无原生 | 有但闭源 + 企业视角 | 无平台侧 |
| 组队 | 面向陌生协作者 | 无 | 无（issue 不是组队） | 无 | 仅企业内部 | 仅企业内部 | 无 |
| 内容消费 | 人读 + AI 读 (MCP) | 仅人读 | 仅人读 | 仅人读 | 仅企业内部 | 仅企业内部 | 仅人读 |
| 中国落地 | ICP / 支付宝 / 微信 / 中文优先 | ❌ | 网络不稳定 | ✅ | ✅ | ✅ | ❌ |
| 商业化 | Free+Pro+Team 月付+MCP 企业调用 | 广告 | 代码仓库订阅 | 广告+专栏 | 企业 seat | 企业 seat | 编辑器订阅 |

VibeHub 的差异化**不靠 UI、不靠内容、不靠 SEO**，而是靠一个别人还没做的协议位点：

> **"AI Agent 在人类团队里是一名可审计、可追溯、可被人工驳回的正式队员"**

这条定义决定了：

- 不需要去抢 Product Hunt 的英文流量
- 不需要去挑战 GitHub 的代码托管
- 不需要去和掘金抢技术文章阅读量
- 不需要去做飞书那种 seat-based 企业 IM
- 不需要去和 Dify 抢"企业 AI 落地顾问"的生意

**能且只能做一件别人不做的事——让 agent 合法进入人类团队。**

---

## 3. 产品原则（v8 冻结）

1. **中国优先不是口号**：默认中文、默认支付宝/微信、默认中国境内部署、默认中文 LLM 优先、默认内容审核前置。
2. **Agent 是人类队员的延伸，不是替代**：所有高风险行为必须走 `AgentConfirmationRequest` 或人工审核。
3. **不做 LLM、不做 IDE、不做代码托管**：严守边界。仓库托管交给 GitHub / Gitee；模型调用让用户自带；IDE 插件通过 MCP 接入。
4. **不用烧钱买增长**：不做满减、不做红包、不做补贴。靠"被 Agent 索引的内容 + 组队摩擦降低"获取真实留存。
5. **成本守恒**：平台自身不为 agent 的 LLM 调用买单。MCP 侧以元数据/搜索/审计/配合为主，真正的推理留在用户侧或用户带的模型。
6. **统一视觉语言 Monochrome Geek v2**：克制、高级、深色为主；禁止廉价感、拼接感、卡通感。
7. **每一个用户动作都必须有状态**：默认 / loading / success / error / empty / 权限不足，六态必须齐全。
8. **一切变更以 `launch-readiness-standard` 为最终仲裁**。
9. **v8 不扩"第四条支柱"**：广场 / 画廊 / 团队 / Agent 总线 是且只是这四条。挑战赛、企业工作台、Investor Radar 均冻结。

---

## 4. 差异化能力：Agent 原生协作（本产品的壁垒）

### 4.1 Agent 原生协作模式矩阵

| 协作模式 | 参与者 | 已有底座 | v8 是否开通 | 说明 |
|---------|-------|----------|------------|------|
| 人 ↔ 人 | 用户 + 用户 | 成熟 | ✅ | 团队任务 / 讨论 / 聊天，已闭环 |
| 人 ↔ Agent | 用户 + 自己绑定的 agent | AgentBinding + MCP 写工具 + Confirmation 已到位 | ✅ 生产级 | 用户在 UI 批准 agent 的写入动作 |
| Agent ↔ Agent 同一用户 | 用户的 Cursor + Claude + 自研 bot | AgentBinding 多绑定已支持 | ✅ 只读串联 | 同一用户的多个 agent 可以互相"看"到彼此产物；写入仍各自走 Confirmation |
| Agent ↔ Agent 跨用户 | 队长 agent → 队员 agent | AgentConfirmationRequest 已支持跨用户审批 | ⚠️ 受控开通 | 必须双方用户都在同一个团队、且目标队员明确授权其 agent 接任务；否则禁止 |
| Agent 自治 | 无人工介入 | 不支持 | ❌ | v8 不做。任何自治必须进入 ConfirmationRequest 队列。中国合规底线决定。 |

**关键结论（对用户原始设想的修正）**：

- "agent 与 agent 之间的合作"**技术可行、合规允许**，但必须满足 **"每一个跨用户写入必须有人类在场"** 的硬约束。否则就是多 agent 自治网络，中国合规会在 24 小时内打回，平台也不敢承担责任。
- 所以 v8 开通"Agent-Agent"能力时，**"自治"**和**"协作"**的边界定义为：
  - 协作 = 读对方产物 + 发建议 + 推送任务到对方队列（但写入必须对方用户人工或对方 agent binding 的 Confirmation 批准）
  - 自治 = 不做。v8 默认禁止；未来任何时候开通都要重新走合规审议。

### 4.2 Agent 权限层次（v8 最终模型）

```
User (自然人，法律责任方)
  └─ AgentBinding (授权代理)
        └─ ApiKey (带 scope)
              └─ MCP invoke / Public API (可读可写)
                    └─ 写入 → 先进 AgentConfirmationRequest 队列（高风险）
                    └─ 读取 → 直接执行，全部留 AuditLog
```

- Agent 能做的事**永远是其绑定用户能做的事的子集**。
- Agent 的 ApiKey scope 只能在用户权限的基础上**收窄**。
- 绑定用户被封禁 → 其所有 agent 立即失效（通过 `sessionVersion` 等价机制）。
- 高风险操作矩阵：见 `roadmap-v7.md` E 章，v8 沿用，不放松。

### 4.3 Agent 在团队里的"角色牌"

每个 agent 加入团队时，必须被人类 owner 赋予一张角色牌：

| 角色牌 | 典型能力 | 是否需要人工确认写入 |
|-------|---------|---------------------|
| `reader` | 只读任务 / 讨论 / 聊天 | ❌ 读取无需 |
| `commenter` | 读 + 在任务/讨论下发评论 | ⚠️ 评论无需，但触发通知 |
| `executor` | 读 + 领取任务 + 标记完成（待审） | ✅ 必须 |
| `reviewer` | 读 + 发审查意见（非最终裁决） | ❌ 但审查意见必须标注 `ai_advisory` |
| `coordinator` | 读 + 新建任务 + 分配任务 | ✅ 必须（v8 中必须由 owner/admin 开启） |

v8 默认任何新 agent 进入团队都是 `reader`，要升级需要 team owner 手动赋权，并且每次升级都写 `AuditLog`。

### 4.4 Agent 操作时间线（用户可见）

每个团队页面补一个"Agent 协作日志" tab：

- 时间线形式展示 agent 在这个团队里做过的所有事（读取/评论/建任务/完成任务/被人工驳回）
- 支持按 agentType（Cursor / Claude / 自定义）筛选
- 支持一键撤销 agent 最近一个已完成动作（只在 24h 内允许且仅限 owner）

这是"让用户真实感到 agent 是队员而不是 API 调用"的关键 UI。

---

## 5. 中国落地策略（硬约束）

### 5.1 合规前置（P0 阻塞）

- ICP 备案完成，主体与上线主体一致
- 隐私政策、用户协议、平台规则经法务审校（v7 已完成内容填充，v8 审批定稿）
- 内容审核前置：新帖 / 新项目 / 新评论均过敏感词 + AI 预审（v7 已有 `AdminAiSuggestion` 表与框架）
- AIGC 与推荐算法备案（若启用推荐流，必做）
- 实名边界：v8 不开放"强实名"，采用手机号 + 邮箱即可；需实名的场景（例如申请大额提现，如有）再单独申请
- 未成年人保护：注册年龄门槛 + 夜间模式提示
- 数据跨境：默认服务器与数据在中国大陆；跨境 LLM 调用（若 Pro 用户选择海外模型）需单独同意条款

### 5.2 LLM 与模型选型（成本核心）

v8 不做 LLM 自营。所有 AI 能力分三层：

1. **平台侧 AI（最小化，必须国产优先）**：
   - 后台审核摘要 / 风险打标：DeepSeek / 通义千问 / 豆包 / 智谱 之一，小模型优先，每工单成本预算 < ¥0.02。
   - 用户侧推荐：基于标签 + 互动的统计模型，**不上 LLM**。
2. **用户侧 AI（可选，用户自带）**：
   - 用户在 `/settings/models` 绑定自己的 API key（OpenAI / Anthropic / DeepSeek / 智谱 / 阿里云百炼 / 火山引擎 等）
   - 平台不为用户的推理买单
   - 用户用他们自己的 LLM 去驱动 Cursor / Claude / 自建 agent 来访问 VibeHub MCP
3. **Pro 套餐可选增值（P1 再评估）**：
   - 对订阅 Pro 的用户可赠送一定额度的"VibeHub AI 代写周报/代写项目简介"，走国产模型，严格限额度

**成本守恒原则**：平台不做"无限生成"。AI 能力为"治理"与"摘要"服务，不为"代写作品"服务。

### 5.3 支付与商业化

收入结构（v8 冻结）：

- Free：核心功能无限用、agent binding 2 个、每月 MCP 调用额度 1000 次、团队 3 人
- Pro（¥29/月 或 ¥299/年）：agent binding 10 个、MCP 调用 50,000 次、团队 10 人、优先审核、Pro 徽章
- Team（后续商业化阶段，不作为当前 GA 硬门槛）：扩展团队上限、团队级 agent coordinator 角色、团队分析看板
- MCP Developer Access（申请制，P1 落地）：面向第三方 Agent 开发者的后续按量计费入口，当前只保留能力说明与申请制，不面向个人用户直接开通

收款渠道：

- 支付宝（主）
- 微信支付（主）
- Stripe（保留给海外 agent 开发者）
- ⛔ 禁止个人收款码

### 5.4 内容策略

- 默认语言中文简体，繁体与英文作为显示语言选项（不做海外市场）
- 官方账号"VibeHub 编辑部"定期产"AI+Human 协作范式"精选贴
- 允许用户发英文内容，不鼓励；搜索默认中文相关度加权

---

## 6. 商业模式与单位经济

### 6.1 单位经济（v8 目标模型）

假设 12 个月后：

- 注册用户 30 万
- MAU 3 万（DAU:MAU ~ 15%）
- Pro 转化率 3%（= 900 付费）
- Team 转化率：在后续商业化阶段评估，不纳入当前 GA 收入假设
- ARR 估算（当前保守口径）：`900 × ¥299 = ¥26.9 万`
- MCP Developer Access（P1 落地后）：每月 ¥1 万 ~ ¥3 万递增

v8 阶段不追求 ARR 绝对值。目标：**验证单位经济为正**——即月付费用户 LTV ≥ 单用户获客 + 单用户基础设施 + 单用户审核成本之和。

### 6.2 固定成本上限（自我约束）

月固定成本上限（v8 规划内）：

- 服务器 / 带宽 / 数据库：¥1500 / 月（阿里云或腾讯云标准版）
- Redis：¥300 / 月
- 对象存储 / CDN：¥500 / 月
- 邮件 SMTP：¥100 / 月
- LLM 平台侧（审核）：¥500 / 月（假设日均 1000 条过审）
- 监控 / 日志：¥200 / 月
- **合计：< ¥3100 / 月**

这个上限是硬约束，一旦触顶必须回到平台侧 AI 额度而不是加预算。

### 6.3 增长不靠烧钱

三条真实增长通道：

1. **Agent 协议位点带来的自然口碑**：Cursor / Claude / 自建 agent 用户在 MCP 场景下使用时会主动告诉同行。
2. **项目画廊 SEO**：每个项目页都生成结构化摘要，百度 / 搜狗 / 必应收录。
3. **组队摩擦降低带来的留存**：陌生开发者能在这里找到合作者；找到过一次就会回来。

---

## 7. 技术边界与系统架构（v8 冻结）

### 7.1 架构分层

```
前端 (Next.js 15 + React 19 + Tailwind v4)
   │
   ├─ 用户界面（广场 / 画廊 / 团队 / 设置 / 后台）
   └─ 设计系统 Monochrome Geek v2（单一 tokens）
        │
后端 (Next.js Route Handlers + Prisma + PostgreSQL + Redis)
   │
   ├─ 内容层 (Post / Project / Team / Comment)
   ├─ 身份层 (User / Session / ApiKey / AgentBinding)
   ├─ 协作层 (TeamTask / TeamMilestone / TeamDiscussion / TeamChat)
   ├─ 审计层 (AuditLog / AgentActionAudit / McpInvokeAudit / AdminAiSuggestion)
   ├─ 治理层 (ReportTicket / AgentConfirmationRequest / ContentGuideline)
   ├─ 商业层 (UserSubscription / BillingRecord / PaymentProvider)
   │
外部接入
   ├─ MCP Server (ws-server.ts / mcp-server.ts)
   ├─ OpenAPI (/api/v1/openapi.json)
   └─ Webhook (出站与入站)
```

### 7.2 不做项（边界硬约束）

- ❌ LLM 自营
- ❌ 自建 IDE
- ❌ 代码托管 / PR / Issue
- ❌ CI/CD 流水线
- ❌ 视频会议 / 白板
- ❌ 企业 SCIM / SSO / 多工作区（Enterprise 降级为认证标识已冻结）
- ❌ Investor Radar / 投资者视图
- ❌ 挑战赛 / 活动（P3 之前不做）

### 7.3 必须做项（v8 内完成或达到标准）

- ✅ 中国支付（支付宝 / 微信）真实商户跑通
- ✅ Agent 在团队内的"角色牌 + 协作日志 + 确认队列"端到端可用
- ✅ `/settings/agents` 升级成"协作中心"而不只是 binding 列表
- ✅ `/teams/[slug]/agents` 新增团队侧 agent 管理
- ✅ 运营仪表盘：WAHC / AO% / Agent 拒绝率 三个北极星指标可视化
- ✅ 后台 AI 审核助手 MVP 真实数据跑通
- ✅ 设计系统统一：`components/ui/*` 覆盖 EmptyState / ErrorState / PageHeader / DataTable / StatCard / Form
- ✅ 首屏与主导航叙事 AI+Human 化
- ✅ 合规前置：ICP / 法务 / 数据跨境确认
- ✅ Redis 拓扑落地

---

## 8. 风险与红线

| 风险 | 等级 | 应对 |
|------|------|------|
| 合规：AI 代操作法律责任 | 🔴 | Confirmation + 审计 + 人类兜底；绝不自治 |
| 合规：AIGC 备案 | 🔴 | v8 发布前完成备案或限制 AI 输出范围 |
| 合规：推荐算法备案 | 🟠 | 若上线推荐流则需备案；若备案周期长则 v8 只上标签+互动排序 |
| 合规：数据跨境 | 🟠 | 国产 LLM 优先；用户自带 LLM 的跨境行为走用户勾选协议 |
| 商业：支付宝/微信商户号审批 | 🟠 | v8 GA 允许"至少一条渠道真实跑通"，两者二选一到位即可 |
| 成本：LLM 审核账单 | 🟠 | 每日额度硬上限 + 可一键关闭 AI 预审 |
| 技术：Redis 接入暴露隐藏 bug | 🟡 | 灰度切换；保留内存限速 fallback |
| 技术：Agent 多绑定导致越权 | 🔴 | scope 联合校验 + Confirmation + 封禁用户即时吊销 |
| 产品：用户不理解"agent 作为队员" | 🟠 | onboarding 专门讲解 + 首次 agent 加入团队时阻塞式弹窗说明 |
| 产品：agent 协作流被用成垃圾机器人 | 🔴 | 平台级反垃圾 + 每日 agent 写操作总额 + 恶意 binding 吊销机制 |

---

## 9. v8 期间冻结清单

以下内容在 v8 周期中**不得重新讨论、不得偷偷开发、不得以"顺手做了"为由混入**：

- 挑战赛 / 活动
- 企业工作台 / 企业协同
- Investor Radar / 猎头视角
- 多 agent 自治（无人工确认的写入）
- Light / Dark 模式切换
- PWA / Service Worker
- 自建 LLM / 自建向量库
- 代码托管 / CI/CD
- 海外优先的国际化
- 满减、补贴、红包、签到
- 抽奖、榜单游戏化

---

## 10. 结论

**VibeHub v8.0 的立身之本：**

1. **面向中国中文开发者**
2. **广场 + 画廊 + 团队 + Agent 总线 四支柱**
3. **AI 是一等公民而非调用方**
4. **人类永远在决策链顶端**
5. **平台不烧钱、不卷流量、不替用户算 LLM**

本计划书一经确认，将取代 `VibeHub_项目计划书_v3.0.md`（v4.0 专业版）成为唯一战略底本。所有后续路线图（含 `docs/roadmap-v8.md`）必须在本文件约束下编制。
