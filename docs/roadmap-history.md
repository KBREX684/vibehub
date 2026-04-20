# VibeHub Roadmap History

> 当前主线：**v11.0 最终章 — AI 工作留痕本（Operation Ledger）**
> 唯一事实来源：`docs/v11.0-final-chapter-rfc.md`
> 主线索引：`docs/roadmap-current.md`
> 本文件仅整理历史版本演进，**不再作为执行依据**。

---

## 历史版本时间线

| 版本 | 日期 | 主题 | 状态 |
| --- | --- | --- | --- |
| v3.0 / v4.0 | 2026-04-14 | 项目计划书（最初的全栈策略） | 归档 |
| v5.0 | 2026-04-14 | 基于代码审计的全栈演进路线图 | 归档（被 v7 取代） |
| v7.0 | 2026-04-16 | 生产化升级总计划（China-first / developer-community） | 归档（被 v8 取代） |
| v8.0 | 2026-04-17 | 中国优先 · AI+Human 协作网络（四支柱 + Agent 总线） | 归档（被 v9 取代） |
| v9.0 | 2026-04-18 | Team Workspace 协作中枢（Snapshot Capsule + 合规可见化） | 归档（被 v11 取代） |
| v10.0 | 2026-04-18 | Workspace-first 单主线（Discover→Intent→Workspace→Agent→Snapshot） | 归档（被 v11 取代） |
| **v11.0** | **2026-04-19** | **AI 工作留痕本 · Studio · Ledger · Card 三件事架构** | **当前主线** |
| v11.1 | 2026-04-19（规划） | 暖色护眼 UI 重设计（Claude Code 风） | 待签字 |

---

## 已归档的历史文档（已加归档头）

### v3 / v4
- `VibeHub_项目计划书_v3.0.md`

### v5
- `docs/roadmap-v5.md`

### v7
- `docs/roadmap-v7.md`
- `docs/v7-go-live-checklist.md`
- `docs/v7-pre-release-rehearsal-2026-04-17.md`

### v8
- `docs/product-strategy-v8.md`
- `docs/roadmap-v8.md`
- `docs/v8-progress.md`
- `docs/v8-rc-go-live-rehearsal-2026-04-17.md`

### v9
- `docs/ecosystem-roadmap-v9.0.md`
- `docs/ecosystem-implementation-plan-v9.0.md`

### v10
- `docs/ia-v10-refactor-plan.md`
- `docs/ui-v10-figma-prompts.md`

### 通用历史档案
- `docs/01_实现计划图.md`
- `docs/02_Debug表.md`
- `docs/03_项目日志.md`
- `docs/04_frontend_backend_mapping.md`
- `docs/05_no_fake_feature_checklist.md`
- `docs/06_openapi_route_audit.md`
- `docs/07_mcp_capability_matrix.md`
- `docs/08_backend_optimization_roadmap.md`
- `docs/p0-compliance-checklist.md`

---

## 为什么这些文件还保留

- 记录了迁移决策、阶段交付历史与历史验收 context
- 部分审计 / 测试用例仍引用它们作为历史证据
- 复盘老 migration / 老测试 / 历史 pivot 时仍有参考价值

---

## 当前策略约束

- **不要**把上述任何文件作为当前主线决策依据
- 当前主线 = `docs/v11.0-final-chapter-rfc.md`
- 主线索引 = `docs/roadmap-current.md`
- 后端任务 = `docs/v11.0-backend-tasks.md`
- 前端任务 = `docs/v11.0-frontend-tasks.md`
- 待落地 UI = `docs/v11.1-warm-ui-prompts.md`
- 变更记录 = `docs/release-notes.md`
- 仓库清理决议 = `docs/repository-cleanup-report.md`
- 上线门槛（v11 调整版）= `docs/launch-readiness-standard.md` 顶部 v11.0 注释 +
  RFC §11 三北极星

---

## 永久冻结（v11.0 RFC §10）

签字后 12 个月内禁止重启的方向（即使历史文档里讨论过也不允许）：

- 团队协作 / 多人 Workspace 重启
- 项目展示 / Discover 主线重启
- 撮合 / 配对 / Matching
- 私信 / 聊天 / IM
- 内容流 / 帖子 / 排行榜 / 创作者激励
- 自建 LLM / Agent 商店 / Prompt 市场
- IDE / repo / CI / Diff
- 跨境支付 / 自营外包 / 信用评级业务
- 区块链发行 / Token / NFT 凭证
- "颠覆性 pivot" 字眼

解冻条件见 RFC §10。
