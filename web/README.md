# VibeHub Web (v11.0)

Next.js 全栈实现 · v11.0 最终章 · "AI 工作留痕本（Operation Ledger）"

> 一句话定位：你和 AI 一起做的工作，有据可查。
>
> 详细产品定义见仓库根目录 [`docs/v11.0-final-chapter-rfc.md`](../docs/v11.0-final-chapter-rfc.md)。

---

## 1. 当前产品范围（v11.0）

只做三件事：

- **Studio** `/studio` — 个人 AI 工作站（任务 + Agent 执行 + 文件 + 快照）
- **Ledger** `/ledger` — 操作账本（哈希链 + 签名 + 司法链锚定 + PDF 导出）
- **Card** `/u/[slug]` — Trust Card 公开信用名片（6 项指标全部来自 Ledger）

支撑能力：

- AIGC 自动加标管线（GB 45438-2025 合规，腾讯 / 阿里 / local 三 provider）
- 司法链锚定（至信链 / 保全网，仅 Pro）
- `vibehub-verify` 独立 npm 包（本地校验 ledger 真伪）
- Free + Pro 两档订阅（Alipay China-only，无团队 / 企业套餐）

**已永久冻结的能力**（不要重启，详见 RFC §10）：
团队协作 / 多人 Workspace / 项目撮合 / 私信 / 内容流 / 自建 Agent 商店 /
跨境支付 / IDE / repo / CI。

---

## 2. 快速开始

```bash
npm install
cp .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

### Mock 模式（无需 DB）

```bash
USE_MOCK_DATA=true npm run dev
```

适合纯前端开发、UI 联调、CI smoke。

### 真实 DB 模式（推荐）

```bash
# 在 .env.local 里设置 DATABASE_URL + SESSION_SECRET
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run smoke:live-data
npm run dev
```

---

## 3. 质量门

```bash
npm run check
# = lint + typecheck + test + validate:openapi + build
```

CI（`.github/workflows/p1-gate.yml`）跑相同序列，并附加：

- `prisma migrate deploy` → `prisma db seed` → `smoke:live-data`
- v11 测试套件（`tests/v11-*.test.ts`，35 用例）

---

## 4. 关键路由

### 公开层
- `GET /` — Home
- `GET /pricing` — 两档定价
- `GET /p/[slug]` — 项目展示
- `GET /p/[slug]/snapshots/[snapshotId]` — 公开快照（带锚定凭证）
- `GET /u/[slug]` — Trust Card
- `GET /u/[slug]/print` — Trust Card 打印 / PDF 视图

### 工作层（需登录）
- `GET /studio` — 个人 AI 工作站
- `GET /ledger` — 操作账本
- `GET /settings`、`/settings/profile`、`/settings/account`、`/settings/agents`、
  `/settings/api-keys`、`/settings/developers`、`/settings/notifications`、
  `/settings/compliance`、`/settings/subscription`、`/settings/data-export`

### 后台（admin only）
- `GET /admin/*` — 后台治理
- `GET /admin/v11-pmf-dashboard` — v11 三北极星指标 dashboard

### 兼容残留（v11.2 将移除）
- `/work/*` — v10 协作中枢残留，已锁创建路径

---

## 5. v11 新增 API

```
# Ledger（操作账本）
GET  /api/v1/me/ledger?workspaceId=&from=&to=&actor=&kind=&cursor=&limit=
GET  /api/v1/workspaces/:id/ledger
GET  /api/v1/workspaces/:id/ledger/export?format=json|pdf|txt
POST /api/v1/workspaces/:id/ledger/anchor          # Pro：锚定到至信链/保全网
GET  /api/v1/ledger/:id/verify                     # 公开校验
POST /api/v1/ledger/verify-bundle                  # 公开校验整份导出 bundle

# AIGC Stamp（合规标识）
POST  /api/v1/artifacts/:id/aigc-stamp             # 重做 / 手动加标
GET   /api/v1/me/aigc-compliance/audit-trail?month=YYYY-MM[&format=pdf]
GET   /api/v1/me/compliance-settings
PATCH /api/v1/me/compliance-settings

# OPC Profile / Trust Card
GET   /api/v1/me/opc-profile
PATCH /api/v1/me/opc-profile
GET   /api/v1/u/:slug/trust-card                   # 公开
GET   /api/v1/u/:slug/trust-card.pdf               # 公开 PDF

# PMF（v11 三北极星）
POST /api/v1/internal/pmf/event
GET  /api/v1/admin/v11-pmf-dashboard               # admin 限定
```

完整 OpenAPI 见 `GET /api/v1/openapi.json` 或 `npm run validate:openapi`。
当前 158 paths，覆盖率 93.7%。

---

## 6. v11 新增数据对象

```
Workspace                  (v10 即有，v11 锁创建 type=team)
SnapshotCapsule            (v10 即有)
WorkspaceArtifact          (v10 即有 + v11 加 aigcStampId/requireAigcStamp)
WorkspaceDeliverable       (v10 即有 + v11 加 ledgerEntryId)
AgentTask / AgentBinding /
AgentActionAudit /
AgentConfirmationRequest   (v10 即有 + v11 加 ledgerEntryId)

LedgerEntry                (v11 新增；哈希链 + ed25519 签名 + 可锚定司法链)
AigcStamp                  (v11 新增；GB 45438-2025 合规标识 + 6 个月留存)
OpcProfile                 (v11 新增；OPC 名片资料)
OpcTrustMetric             (v11 新增；6 项 Trust 指标，物化视图)
LegalAttestationLink       (v11 新增；Ledger 锚定到至信链 / 保全网的链接)
PmfEvent                   (v11 新增；三北极星埋点)
```

旧表（Team / TeamMembership / CollaborationIntent / Post / Comment 等）
**保留以维持数据完整性**，但创建路径已锁定 410。

---

## 7. v11 已弃用的 API（返回 410 Gone）

POST 写路径全部返回 410，错误码：`TEAMS_DEPRECATED` / `INTENTS_DEPRECATED` /
`TEAM_WORKSPACE_DEPRECATED`。

```
POST /api/v1/teams
POST /api/v1/teams/:slug/{members,agents,tasks,milestones,discussions,join}
POST /api/v1/projects/:slug/collaboration-intents
POST /api/v1/projects/:slug/collaboration-intents/:id/{review,ignore,block-and-report}
POST /api/v1/workspaces                             # 仅当 type='team' 时
```

GET 路径仍 200，但响应带 `X-Deprecated: true` header。

---

## 8. 第三方接入（环境变量）

仅 Pro 用户使用：

```ini
# AIGC Stamp providers（任选其一，与 Workspace.aigcProvider 对齐）
VIBEHUB_TENCENT_AIGC_SECRET_ID=
VIBEHUB_TENCENT_AIGC_SECRET_KEY=
VIBEHUB_TENCENT_AIGC_REGION=ap-shanghai

VIBEHUB_ALIYUN_AIGC_ACCESS_KEY=
VIBEHUB_ALIYUN_AIGC_SECRET=
VIBEHUB_ALIYUN_AIGC_REGION=cn-hangzhou

# Legal Anchor providers（Pro 用户主动锚定）
VIBEHUB_ZHIXIN_APP_KEY=
VIBEHUB_ZHIXIN_SECRET=

VIBEHUB_BAOQUAN_API_KEY=

# Ledger signer（ed25519 私钥，base64）
VIBEHUB_LEDGER_SIGNER_PRIV=
```

未配置时自动降级到 `local` provider；`local` 模式下 stamp 仅写 metadata，
不调外部 API（合规等级低，仅适合 Free 演示）。

---

## 9. API 响应约定

成功：

```json
{ "data": {}, "meta": { "requestId": "uuid", "timestamp": "ISO8601" } }
```

错误：

```json
{
  "error": { "code": "ERROR_CODE", "message": "Human readable message" },
  "meta": { "requestId": "uuid", "timestamp": "ISO8601" }
}
```

弃用响应：

```json
{
  "error": {
    "code": "TEAMS_DEPRECATED",
    "message": "团队功能已在 v11.0 停用",
    "deprecatedSince": "2026-04-19",
    "learnMoreUrl": "/v11"
  }
}
```

---

## 10. 设计系统与主题

- **当前**：dark Monochrome Geek（暗色画布 #09090B + Inter + Geist Mono +
  Apple Blue 主色 + 印戳虚线）
- **v11.1 计划**：暖色护眼版（米白画布 #FAF9F6 + Anthropic Sienna 主色 +
  serif 标题 + soft shadow elevation）

详见仓库根目录 [`DESIGN.md`](../DESIGN.md) 与 v11.1 提示词文档
[`docs/v11.1-warm-ui-prompts.md`](../docs/v11.1-warm-ui-prompts.md)。

v11.1 通过 `[data-theme="warm"]` 与 `[data-theme="dark"]` 双主题共存，老
admin / work 路由保留 dark，v11 主线切 warm。

---

## 11. 自托管部署

参见：

- `infra/docker-compose.yml`（PostgreSQL）
- `infra/nginx/vibehub.conf`（反向代理）
- `infra/pm2/ecosystem.config.cjs`（Node 进程管理）
