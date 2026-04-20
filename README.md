# VibeHub

> **VibeHub — 你和 AI 一起做的工作，有据可查。**
>
> v11.0 最终章定位：中国独立开发者的 **AI 工作留痕本（Operation Ledger）**。
> 自动加合规标识、自动留可校验账本、自动沉淀为可外发的信用名片。

---

## 当前主线（v11.0 最终章）

VibeHub 已收口为单一主线："留痕本"。所有非主线功能（团队协作 / 项目展示 /
撮合 / 私聊 / 内容流 / 后台社区）都已永久冻结或降级。

详细产品定义见 **[`docs/v11.0-final-chapter-rfc.md`](./docs/v11.0-final-chapter-rfc.md)**
（一句话定位、必杀清单、12 个月冻结条款、签字位）。

### 三件事架构

```
Studio (做)  →  Ledger (签)  →  Card (晒)
```

- **Studio** `/studio` — 个人 AI 工作站，任务 + Agent 执行
- **Ledger** `/ledger` — 操作账本，每一次写入都自动留痕，可校验、可外发
- **Card** `/u/[slug]` — 公开信用名片，6 个真实指标全部来自 Ledger，禁止手填

### 两档定价（v11.0 已冻结）

| 档 | 价格 | 包含 |
| --- | --- | --- |
| **Free** | ¥0 | 1 GB · 100 ledger/月 · 基础 AIGC 标识（local）· 公开 Trust Card |
| **Pro** | ¥29/月 或 ¥288/年 | 10 GB · 无限 ledger · 完整 AIGC 标识（腾讯/阿里 API）· 至信链 / 保全网锚定 · 月度合规报告 PDF · Trust Card 高级版 |

---

## 仓库结构

```
.
├── web/                                Next.js 全栈应用
├── packages/
│   └── vibehub-verify/                 独立 npm 包：本地校验 ledger 真伪的 CLI
├── docs/
│   ├── v11.0-final-chapter-rfc.md      产品定义（事实来源）
│   ├── v11.0-backend-tasks.md          后端任务计划书（GPT 用）
│   ├── v11.0-frontend-tasks.md         前端任务计划书（GLM 用）
│   ├── v11.1-warm-ui-prompts.md        v11.1 暖色 UI 重设计提示词（待落地）
│   ├── roadmap-current.md              当前主线索引
│   ├── release-notes.md                变更记录
│   └── （其它 v8 / v9 / v10 历史文档已加归档头，仅供参考）
└── DESIGN.md                           设计系统（v11.1 起将切换为暖色双主题）
```

---

## 快速开始

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

详细的环境变量、Prisma、第三方接入（腾讯云水印 / 阿里云水印 / 至信链 /
保全网）配置，见 [`web/README.md`](./web/README.md) 与 [`web/.env.example`](./web/.env.example)。

---

## 验证路径

### 仅前端联调（mock 模式，无需 DB）

```bash
cd web
USE_MOCK_DATA=true npm run dev
```

### 完整后端验证（推荐）

```bash
cd web
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run smoke:live-data
```

### 全套质量门

```bash
cd web
npm run check
# = lint + typecheck + test + validate:openapi + build
```

CI 在 `.github/workflows/p1-gate.yml` 跑相同序列。

---

## 关键 v11 路由

公开层：

- `/` — Home（v11 留痕本叙事）
- `/pricing` — 两档定价
- `/p/[slug]` — 项目展示
- `/p/[slug]/snapshots/[id]` — 公开快照（已锚定凭证）
- `/u/[slug]` — Trust Card 公开信用名片
- `/u/[slug]/print` — Trust Card 打印 / PDF 视图

工作层：

- `/studio` — 个人 AI 工作站
- `/ledger` — 操作账本
- `/settings/compliance` — AIGC 合规设置（默认开启）
- `/settings/agents` — Agent 接入

历史路径（v10 收口前的兼容残留，将于 v11.2 移除）：

- `/work/*` — v10 协作中枢残留，已锁定不能新建团队 / 协作意向

---

## 历史与归档

V11.0 之前的版本叙事已归档，可用于历史回溯但**不再作为产品方向**：

- `docs/ia-v10-refactor-plan.md` — v10 协作中枢 IA（已被 v11 RFC 取代）
- `docs/ui-v10-figma-prompts.md` — v10 暗色 Figma 提示词（已归档）
- `docs/ecosystem-roadmap-v9.0.md` — v9 Team Workspace 路线图（已归档）
- `docs/product-strategy-v8.md` — v8 战略底本（已归档）
- `docs/roadmap-v5.md` / `roadmap-v7.md` / `roadmap-v8.md` — 历史路线图
- `docs/v8-progress.md` / `v8-rc-go-live-rehearsal-2026-04-17.md` — v8 进度
- `VibeHub_项目计划书_v3.0.md` — 最早期项目计划书

历史索引见 [`docs/roadmap-history.md`](./docs/roadmap-history.md)。

---

## 永久冻结（v11.0 RFC §10）

签字后 12 个月内，下列方向禁止讨论；解冻条件见 RFC §11 PMF 三个北极星：

- 团队协作 / 多人 Workspace 重启
- 项目展示 / Discover 重启（项目页保留为 Trust Card 素材）
- 撮合 / 配对 / Matching
- 私信 / 聊天 / IM
- 内容流 / 帖子 / 排行榜 / 创作者激励
- 自建 LLM / Agent 商店 / Prompt 市场
- IDE / repo / CI / Diff
- 跨境支付 / 自营外包 / 信用评级业务
- 区块链发行 / Token / NFT 凭证
- "颠覆性 pivot" 字眼
