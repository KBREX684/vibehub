> ⛔ **已归档**（2026-04-19）：本文件代表 v11.0 之前的产品方向，**不再作为当前主线**。
> 当前主线见 `docs/v11.0-final-chapter-rfc.md`，主线索引 `docs/roadmap-current.md`。
> 本文件保留作为历史档案，新工作请勿基于本文件展开。

# VibeHub 后端优化线路图 v1.0

> 基于当前代码仓库（v3.4 封版）的全量审计，面向"可信协作平台底座"目标的系统性后端整改与演进计划。  
> 更新日期：2026-04-15  
> 作者：Backend Platform Engineer Agent

---

## 一、当前状态总结（审计基准）

| 维度 | 当前状态 | 风险等级 |
|------|---------|---------|
| 认证安全 | 自签名 HMAC-SHA256 session + Bearer API Key，结构合理 | 🟡 中 — 有几处需加固 |
| 权限模型 | admin/user/guest 三级，enterprise 通过 User 字段区分，team 有 RBAC | 🟠 高 — enterprise 权限边界模糊，team 权限有逃逸点 |
| API 契约 | 53 条 OpenAPI 路径，CI 有结构验证，但覆盖不完整 | 🟡 中 — 约 40+ 条路由未在 OpenAPI 中详细描述 |
| MCP 能力层 | 9 个只读工具，审计日志健全，scope 绑定正确 | 🟢 低 — 主要问题是 write tools 规划不够严谨 |
| 数据模型 | Prisma + PostgreSQL，模型完整，但有若干索引缺失和业务约束漏洞 | 🟡 中 |
| 测试覆盖 | 143 个单元测试，17 个 E2E，CI 通过，但关键链路仍有盲区 | 🟡 中 |
| 性能与可扩展性 | 无分页游标、无全文搜索、信誉分数计算为全量重算 | 🟡 中 — 当前规模下不是瓶颈，但需提前设计 |

---

## 二、P0 优先级：必须立即修复的安全与权限问题

> P0 = 生产上线前必须关闭的漏洞，不修不能公测。  
> **2026-04-14 更新：** P0-1～P0-4 已在当前主线实现（企业路由 `enterpriseStatus === approved` 校验、OAuth 会话写入 enterprise 字段、`decodeSession` 回传、`demo-login` 支持 `DISABLE_DEMO_LOGIN`、团队聊天 GET 在带有效 `WS_SERVER_TOKEN` 时跳过 Bearer scope、管理端协作审核允许项目 owner 且 repository 校验所有权）。

### P0-1：Enterprise 权限边界模糊——`enterpriseStatus` 未在服务端路由层强制校验

**问题描述：**  
当前 `GET /api/v1/enterprise/project-radar`、`GET /api/v1/enterprise/talent-radar`、`GET /api/v1/enterprise/due-diligence/:slug` 仅靠 `read:enterprise:workspace` scope 控制，但没有在路由内验证 `user.enterpriseStatus === 'approved'`。Cookie 会话绕过 scope 检查（`allowApiKeyScope` 对 cookie 会话直接放行），任何登录用户都可以访问企业雷达接口。

**当前代码路径：**  
`web/src/lib/api-key-scopes.ts:66-71` — `allowApiKeyScope` 对无 `apiKeyScopes` 的 session 直接返回 `true`。  
`web/src/app/api/v1/enterprise/project-radar/route.ts` — 仅调用 `authenticateRequest(request, "read:enterprise:workspace")`，未验证 `enterpriseStatus`。

**修复方案：**
```typescript
// web/src/lib/auth.ts 新增辅助函数
export function requireEnterpriseApproved(user: SessionUser): boolean {
  return user.enterpriseStatus === "approved";
}
```
在所有 `/enterprise/*` 路由和 `workspace_summary` MCP 工具入口，在 `authenticateRequest` 之后增加：
```typescript
if (!user.enterpriseStatus || user.enterpriseStatus !== "approved") {
  return apiError({ code: "ENTERPRISE_ACCESS_DENIED", message: "Enterprise access requires approved verification" }, 403);
}
```
同时 `SessionUser` 类型需增加 `enterpriseStatus?: EnterpriseVerificationStatus` 字段并在 session encode/decode 时携带。

**受影响路由（需全部修复）：**
- `GET /api/v1/enterprise/project-radar`
- `GET /api/v1/enterprise/talent-radar`
- `GET /api/v1/enterprise/due-diligence/:slug`
- `GET /api/v1/me/enterprise/workspace`
- MCP `workspace_summary`、`get_talent_radar`

**验收标准：**  
- `enterpriseStatus !== 'approved'` 的 cookie 会话用户访问企业路由，返回 403  
- `approved` 用户正常访问  
- 测试覆盖两种路径

---

### P0-2：`demo-login` 接口在非 DEV 环境无硬性服务端封锁

**问题描述：**  
`GET /api/v1/auth/demo-login` 目前靠注释约定"仅开发可用"，但代码中没有 `NODE_ENV === 'production'` 的硬拒绝逻辑（仅靠 `.env` 配置区分）。若环境变量配置失误，任何人可用 `?role=admin` 获得 admin session。

**修复方案：**
```typescript
// web/src/app/api/v1/auth/demo-login/route.ts
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production" || process.env.DISABLE_DEMO_LOGIN === "true") {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 }
    );
  }
  // ... existing logic
}
```

**验收标准：**  
- `NODE_ENV=production` 时返回 404  
- CI 环境变量设置 `DISABLE_DEMO_LOGIN=true`

---

### P0-3：WebSocket 服务器身份信任链条过弱

**问题描述：**  
`ws-server.ts` 通过 HTTP token 换取 WS 身份，但 WS 连接建立后服务端对消息来源的持续校验依赖初始握手状态，如果 WS 服务器进程被重启，内存中的认证状态丢失，但客户端连接可能被错误复用。另外 WS 服务器与 Next.js 主服务通信使用内部 REST 调用，该内部端口未设置任何 secret 校验。

**修复方案：**
1. WS 服务器持久化 token → userId 映射到 Redis（已有 `REDIS_URL`）
2. WS 服务器调用内部 REST API 时在请求头携带 `X-Internal-Secret: ${INTERNAL_SERVICE_SECRET}`
3. 内部 REST 路由增加 `INTERNAL_SERVICE_SECRET` 校验中间件

**验收标准：**  
- WS 服务重启后旧 token 失效，客户端需重新握手  
- 内部 REST 调用无 secret 时返回 401

---

### P0-4：`CollaborationIntent` 审核权限仍为全局 Admin，未迁移到项目 owner

**问题描述：**  
路线图 T-4 标注"审核权限从管理员迁移到项目 owner"，但当前 `POST /api/v1/admin/collaboration-intents/:id/review` 仍要求 admin 角色，前端映射表也显示此路由走 admin 模块。项目 owner 无法处理自己项目的协作申请，这是一个功能性权限错误（不是 P0 安全漏洞，但 P0 级产品缺陷）。

**修复方案：**
1. 新增 `POST /api/v1/projects/:slug/collaboration-intents/:intentId/review`
2. 权限检查：`session.userId === project.creator.userId`（项目 owner）或 `session.role === 'admin'`
3. 老的 admin 路由保留（admin 兜底）
4. 同步更新 OpenAPI

---

## 三、P1 优先级：核心功能缺口和契约修复

> P1 = 公测阶段应完成，影响产品核心体验或外部可信度。  
> **2026-04-15 更新：** P1-1～P1-7 已在当前主线落地：`openapi-spec-p1-stubs.ts` + `scripts/openapi-path-coverage.ts`（非 admin 路由覆盖率门禁 ≥80%，当前 100%）；OAuth 会话写入 `subscriptionTier`；Bearer 会话携带 `subscriptionTier`；`ApiKey.expiresAt` + `POST /me/api-keys` 可选 `expiresInDays`；里程碑 owner/创建者分级；`GET /posts?mine=1` 与 `getPostBySlug(viewer)` 作者可见待审帖；贡献分增量（任务完成、里程碑完成、评论、项目创建、协作意向批准、入队申请等）+ 帖子审核通过加分；帖子/项目创建与删除审计日志。

### P1-1：OpenAPI 严重覆盖不足——53 条已记录，实际路由约 103 条

**问题描述：**  
`openapi-spec.ts` 仅记录了约 53 条路径，已确认实现但未在 spec 中详细描述的路由至少包括：
- 全部 `POST/PATCH/DELETE` 变更类路由的 request body schema
- `/api/v1/teams/:slug/activity-log`
- `/api/v1/reputation/leaderboard`
- `/api/v1/me/reputation`
- `/api/v1/subscription-plans`、`/api/v1/me/subscription`
- `/api/v1/challenges/:slug` PATCH/DELETE
- `/api/v1/reports/ecosystem`
- `/api/v1/embed/*`、`/api/v1/oembed`
- 所有 `admin/*` 路由（建议标注 `x-internal: true`）

**修复方案：**
1. `openapi-spec.ts` 拆分为多个模块（`posts.paths.ts`、`teams.paths.ts`、`enterprise.paths.ts` 等）再 merge
2. 为每个变更类路由补充 `requestBody` schema（使用 Zod `toJSON()` 或手写 JSON Schema）
3. `validate:openapi` CI 步骤升级为：对比文件系统中实际存在的 `route.ts` 文件与 spec 中路径，检测漂移
4. 为 `admin/*` 路由添加 `security: [{ AdminSession: [] }]` 标记

**验收标准：**  
- OpenAPI 路径覆盖率 ≥ 80%（所有非内部路由）  
- CI `validate:openapi` 检测到任何已有 route.ts 但未入 spec 的路径时报错

---

### P1-2：`SessionUser` 类型缺少关键字段，导致 enterprise/subscription 状态需二次查库

**问题描述：**  
当前 `SessionUser` 仅包含 `{ userId, role, name, apiKeyScopes? }`。每次企业路由处理都需要额外查 `User.enterpriseStatus`，订阅判断需要查 `UserSubscription`。这既增加延迟，也是产生 P0-1 漏洞的根因（懒得查就不查了）。

**修复方案：**
```typescript
// web/src/lib/types.ts
export interface SessionUser {
  userId: string;
  role: Role;
  name: string;
  enterpriseStatus?: EnterpriseVerificationStatus; // 新增
  subscriptionTier?: SubscriptionTier;              // 新增
  apiKeyScopes?: ApiKeyScope[];
  apiKeyId?: string;
}
```
在 GitHub OAuth callback 创建 session 时和 `authenticateRequest` 的 API key 路径中携带这两个字段。  
**注意：** session cookie 体积会略增，但仍在合理范围（JSON base64 增加 ~50 字节）。session TTL 7 天，变更后需强制用户重新登录以刷新 session（或在 decode 时对 `enterpriseStatus === undefined` 的旧 session 二次查库补全）。

**验收标准：**  
- 企业路由无需额外查库即可验证 `enterpriseStatus`  
- `encodeSession` / `decodeSession` 保持向后兼容（旧 session 缺字段时降级处理）

---

### P1-3：`ContributionCredit` 计算为全量重算，无增量机制

**问题描述：**  
`POST /api/v1/me/reputation` 触发 `recomputeContributionCredit`，该函数对单个用户执行 7 个并行 COUNT 查询然后 upsert。目前为手动触发，但如果接入自动触发（如任务完成后），大规模用户同时触发将导致数据库过载。

**修复方案：**
1. 现阶段（P1）：为所有触发积分变化的操作（任务完成、里程碑达成、帖子发布）增加增量更新函数：
```typescript
async function incrementContributionCredit(userId: string, field: keyof CreditFields, delta: number)
```
2. 保留全量重算 API 作为管理员修复工具
3. P2 阶段考虑引入异步 job queue（pg_boss 或 Redis Bull）

**验收标准：**  
- 任务状态变为 `done` 时自动 `+10` 积分，不触发全量重算  
- 管理员仍可手动触发全量重算

---

### P1-4：Team 权限存在逃逸点——`assertTeamTaskMutateAllowed` 未覆盖里程碑操作

**问题描述：**  
任务的 RBAC 逻辑通过 `assertTeamTaskMutateAllowed` 统一管理，但里程碑的创建/修改/删除（`POST/PATCH/DELETE /api/v1/teams/:slug/milestones`）目前只检查"是否为团队成员"，没有区分 owner 和 member 的权限差异。里程碑属于团队目标层，建议 owner 才能创建/删除，member 只能更新 progress。

**修复方案：**
```typescript
// 里程碑写操作权限分级
// POST /milestones: 仅 owner
// PATCH /milestones/:id: owner 或 createdByUserId === session.userId
// DELETE /milestones/:id: 仅 owner
```

**验收标准：**  
- member 创建里程碑时返回 403  
- owner 全量操作正常  
- 测试覆盖三种角色路径

---

### P1-5：`/api/v1/posts` 缺少基于 `reviewStatus` 的访问控制

**问题描述：**  
帖子有 `reviewStatus: pending | approved | rejected`，但 `GET /api/v1/posts` 的 `listPosts` 函数当前是否过滤 `pending/rejected` 帖子不明确（需确认 mock 和 Prisma 路径是否一致）。如果 pending 帖子对匿名用户可见，内容审核将失效。

**修复方案：**  
确认 `listPosts` 的 Prisma 路径默认过滤 `reviewStatus: "approved"`，mock 路径同步。  
管理员路由 `GET /api/v1/admin/moderation/posts` 才展示 pending 内容。  
帖子作者可以看到自己的 pending/rejected 帖子（通过 `authorId === session.userId` 条件）。

**验收标准：**  
- 匿名访问 `GET /api/v1/posts` 只返回 approved 帖子  
- 作者可看到自己的全状态帖子（通过 `?mine=1` 参数或包含在 `me/feed` 中）  
- 测试覆盖三种状态的过滤

---

### P1-6：`ApiKey` 没有 `expiresAt` 字段，长期 key 无法被强制过期

**问题描述：**  
当前 API key 只有 `revokedAt` 手动撤销机制，没有自动过期能力。对于企业客户接入场景，无法强制 key 定期轮换，存在长期泄露风险。

**修复方案：**
```sql
-- Migration
ALTER TABLE "ApiKey" ADD COLUMN "expiresAt" TIMESTAMP;
```
```typescript
// auth.ts: getSessionUserFromApiKeyToken 增加过期检查
if (key.expiresAt && key.expiresAt < new Date()) {
  return null; // 视为 revoked
}
```
创建 API key 时支持可选 `expiresIn`（天数），UI 展示过期时间。

**验收标准：**  
- 过期 key 返回 401（不是 429）  
- Migration 向后兼容（`expiresAt` nullable）

---

### P1-7：`AuditLog` 缺乏对关键写操作的系统性覆盖

**问题描述：**  
当前 `AuditLog` 主要记录管理员操作，但以下用户侧关键操作没有审计记录：
- 帖子的发布/编辑/删除
- 项目的创建/删除
- 团队的创建/解散
- API key 的创建/撤销
- 企业认证的提交

没有审计日志意味着平台无法追溯异常操作，违反"可信平台底座"的基础要求。

**修复方案：**  
在各 repository 函数中，在写操作成功后调用 `createAuditLog`：
```typescript
await createAuditLog({
  actorId: session.userId,
  action: "post.created",
  entityType: "Post",
  entityId: post.id,
  metadata: { slug: post.slug, title: post.title },
});
```
建议审计的 action 列表（按优先级）：
- `post.created`、`post.updated`、`post.deleted`
- `project.created`、`project.deleted`
- `team.created`
- `api_key.created`、`api_key.revoked`
- `enterprise.verification_submitted`
- `user.followed`（可选，量大时考虑采样）

**验收标准：**  
- 帖子创建后 `AuditLog` 有对应记录  
- admin 审计日志页面可查到上述操作

---

## 四、P2 优先级：契约完善与可扩展性加固

> P2 = 影响平台长期健康度，应在 P1 完成后 1-2 个迭代内交付。  
> **2026-04-14 更新：** P2-1～P2-6 已在当前分支落地：`searchVector` + GIN（Project/Post/CreatorProfile）+ `plainto_tsquery`/`ts_rank_cd` 查询路径；MCP v2 `idempotencyKey` + `McpInvokeIdempotency` 表、每用户每工具内存限速、`write:*` scope 注册、OpenAPI 补充；`EnterpriseProfile` 独立表 + 数据迁移；`quota.ts` + 创建团队/项目 402 `QUOTA_EXCEEDED`；WS 与 REST 聊天 URL 限制、`<>` 转义、WS 每用户每分钟 30 条；`getFollowFeed` 无关注时降级 `listPosts(hot)`（mock/DB 一致）+ 单测。

### P2-1：全文搜索——当前为内存模糊匹配，无法支撑 100+ 项目规模

**问题描述：**  
`listProjects`、`listPosts`、`listCreators` 的 `query` 参数在 Prisma 路径中使用 `contains` + `mode: 'insensitive'`，本质是全表扫描 ILIKE。无 `tsvector` GIN 索引，100 个项目还可以，1000 个以上会明显降速。

**修复方案（路线图 C-7）：**
```sql
-- Migration
ALTER TABLE "Project" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce("oneLiner",'') || ' ' || coalesce(description,''))
  ) STORED;
CREATE INDEX "Project_searchVector_idx" ON "Project" USING GIN ("searchVector");

ALTER TABLE "Post" ADD COLUMN "searchVector" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) STORED;
CREATE INDEX "Post_searchVector_idx" ON "Post" USING GIN ("searchVector");
```
Repository 查询改为 `WHERE searchVector @@ to_tsquery(...)` + `ts_rank` 排序。

**验收标准：**  
- EXPLAIN ANALYZE 显示使用 GIN 索引  
- 中文内容：配置 `zhparser` 或退化为 `pg_trgm` 方案（视用户语言分布决定）

---

### P2-2：MCP Write Tools 实施前置条件清单

**问题描述：**  
路线图中规划了 `create_post`、`create_project`、`submit_collaboration_intent` 等写工具，当前已有 `07_mcp_capability_matrix.md` 标注为"P2 未实现"。在实施前必须明确前置条件，避免重蹈"假能力"覆辙。

**前置条件（必须全部满足才能实施写工具）：**
1. ✅ `McpInvokeAudit` 已实现（已完成）
2. ✅ Bearer scope 校验已实现（已完成）
3. ✅ **每用户写操作速率限制**（`mcp-user-write-rate-limit.ts`，MCP v2 invoke；可调 `MCP_USER_TOOL_MAX_PER_MINUTE`）
4. ✅ **写操作幂等性设计**（`idempotencyKey` + `McpInvokeIdempotency` 唯一约束 → 409）
5. ✅ **内容安全过滤**（`content-safety.ts`：帖子/评论创建与更新路径）
6. ✅ **`write:posts`、`write:projects` 等 scope 注册**（`api-key-scopes.ts`）
7. ✅ **MCP invoke OpenAPI schema 更新**（`idempotencyKey`、409 响应；写工具本体仍属 P3-1）

**验收标准：**  
上述 ✅ 条件已完成，⬜ 条件每实现一个在此打勾，全部完成后方可开始写工具实施。

---

### P2-3：`EnterpriseProfile` 模型分散——企业信息直接嵌在 `User` 表

**问题描述：**  
当前 `User` 表包含 `enterpriseStatus`、`enterpriseOrganization`、`enterpriseWebsite`、`enterpriseUseCase`、`enterpriseAppliedAt` 等 8 个字段，所有用户查询都会加载这些字段，即使 99% 的用户不是企业用户。另外不支持一个用户代表多个企业（未来 B2B 场景），也无法扩展企业档案（如企业 Logo、行业标签）。

**修复方案（非破坏性迁移）：**
```prisma
model EnterpriseProfile {
  id           String                       @id @default(cuid())
  userId       String                       @unique
  status       EnterpriseVerificationStatus @default(none)
  organization String?
  website      String?
  useCase      String?
  role         EnterpriseRole?
  logoUrl      String?                    // 扩展字段
  industry     String?                    // 扩展字段
  appliedAt    DateTime?
  reviewedAt   DateTime?
  reviewedBy   String?
  reviewNote   String?
  createdAt    DateTime                   @default(now())
  updatedAt    DateTime                   @updatedAt
  user         User                       @relation(...)
}
```
迁移策略：先新建表并将 `User.enterprise*` 字段数据迁移，再逐步将路由从 `User` 改为 `EnterpriseProfile`，最后删除 `User` 中冗余字段（分三个 migration 完成，避免大爆炸式变更）。

**验收标准：**  
- 非企业用户查询 `User` 时不携带企业字段  
- 企业验证 API 响应结构保持兼容（字段映射层不变）

---

### P2-4：Subscription 与业务逻辑解耦——当前缺乏配额执行层

**问题描述：**  
`SubscriptionPlan` 模型有 `features` 字段（JSON），但创建团队、上传截图、API 调用等操作并没有实际检查用户的 `subscriptionTier`。付费边界（Pro vs Free）只在 UI 层展示，服务端没有执行。

**修复方案：**
1. 新增 `web/src/lib/quota.ts` 模块：
```typescript
export async function checkQuota(
  userId: string,
  resource: "teams" | "projects" | "screenshots" | "api_calls",
  currentCount: number
): Promise<{ allowed: boolean; limit: number; tier: SubscriptionTier }>
```
2. 在 `POST /api/v1/teams` 创建团队时调用 `checkQuota(userId, "teams", currentTeamCount)`
3. 在 `POST /api/v1/projects` 创建项目时调用 `checkQuota(userId, "projects", currentProjectCount)`
4. 超限时返回 `402 Payment Required` + `{ code: "QUOTA_EXCEEDED", upgradeUrl: "/settings/subscription" }`

**验收标准：**  
- Free 用户创建第 2 个团队时返回 402  
- Pro 用户创建第 5 个团队时返回 402  
- 测试覆盖三个 tier 的限制边界

---

### P2-5：WebSocket 消息缺乏内容校验和频率限制

**问题描述：**  
`ws-server.ts` 对 WS 消息仅做长度校验（2000 字节），没有：
- 每用户消息频率限制（可刷屏）
- 内容中 URL 数量限制（可发垃圾链接）
- 消息体 HTML/XSS 转义（存储到 DB 时是否处理不明确）

**修复方案：**
1. WS 服务器端：每用户每分钟最多 30 条消息（内存滑动窗口，连接期间有效）
2. 消息内容通过 `sanitizeHtml` 或手动转义后再持久化
3. URL 数量限制：单条消息最多 3 个 URL（正则统计）

**验收标准：**  
- 超过频率限制时服务端发送 `{"type":"error","code":"RATE_LIMITED"}` 并关闭连接  
- DB 中不存在未转义的 `<script>` 标签

---

### P2-6：`/api/v1/me/feed` 个性化 Feed 未实现

**问题描述：**  
路线图 C-4 标注为 Done，但 `GET /api/v1/me/feed` 的实现需要确认：是否真实查询 `UserFollow` 关系返回关注用户的帖子，还是仅返回最新帖子。前端映射表显示该路由存在但无 Fake-Risk 标注，需重新审计。

**修复方案：**  
确认 `me/feed` repository 函数的实现逻辑，补充测试：
1. 用户 A 关注用户 B，B 发帖后 A 的 feed 包含该帖
2. 未关注任何人的用户 feed 降级为热门帖子
3. `GET /api/v1/me/feed` 补充到 OpenAPI spec

---

## 五、P3 优先级：平台能力扩张

> P3 = 有产品价值，但不阻塞当前版本公测，按产品节奏排期。  
> **2026-04-14 更新：** P3-1～P3-5 已在分支落地：`mcp-v2` 增加 `create_post` / `create_project` / `submit_collaboration_intent` / `request_team_join` / `create_team_task`（scope + 配额 + 幂等 mock）；`GET /api/v1/search` 支持 `type`+`page`+`limit`+`total`；`WebhookEndpoint` + `POST/PATCH/DELETE /api/v1/me/webhooks` + `dispatchWebhookEvent`（含 `NOTIFICATION_WEBHOOK_URL` 与重试）；`EnterpriseMemberInvite` 预留表；Stripe `subscription.updated` 与 `subscription.past_due` 用户 webhook。

### P3-1：MCP Write Tools 实施（前提：P2-2 全部完成）

完整实施路线图中规划的写工具：
- `create_post`（需 `write:posts` scope + 内容审核）
- `create_project`（需 `write:projects` scope + slug dedup）
- `submit_collaboration_intent`（需 `write:intents` scope + 去重检查）
- `request_team_join`（需 `write:teams` scope + 成员检查）
- `create_team_task`（需 `write:team:tasks` scope + 团队成员校验）

每个工具交付必须同时：
- 实现服务端逻辑
- 添加 `McpInvokeAudit` 记录
- 更新 OpenAPI schema
- 更新 `mcp-v2-tools.ts` 定义
- 补充测试（至少 happy path + 403 + 429）

---

### P3-2：统一搜索 API `GET /api/v1/search`

**功能：** 跨 Post、Project、CreatorProfile 的统一搜索入口（路线图 C-7 的 API 层）。

**Schema：**
```
GET /api/v1/search?q=keyword&type=post|project|creator&page=1&limit=20
```

**Response：**
```json
{
  "data": {
    "results": [
      { "type": "post", "item": PostSummary },
      { "type": "project", "item": ProjectSummary },
      { "type": "creator", "item": CreatorSummary }
    ],
    "total": 42,
    "page": 1
  }
}
```

---

### P3-3：Webhook 系统完善——从通知专用到通用事件总线

**当前状态：** `NOTIFICATION_WEBHOOK_URL` 仅用于推送通知事件，一个 webhook 目标，无事件类型过滤。

**目标状态：**
```prisma
model WebhookEndpoint {
  id         String   @id @default(cuid())
  userId     String
  url        String
  secret     String   // HMAC signing key
  events     String[] // e.g. ["post.created", "team.join_approved"]
  active     Boolean  @default(true)
  createdAt  DateTime @default(now())
}
```
- `POST /api/v1/me/webhooks` CRUD
- 事件分发层统一调用 `dispatchWebhookEvent(event, payload)`
- 失败重试（3 次，指数退避）
- OpenAPI 文档包含所有 event schema

---

### P3-4：`EnterpriseProfile` 多成员支持（B2B 场景准备）

当前一个用户只能关联一个企业状态（直接存在 `User` 表）。如果未来支持"企业账号下的多名成员"，需要：
- `EnterpriseProfile` 支持 `members` 关系（企业 admin 邀请用户加入企业）
- 企业级 API key（与企业关联，而非用户）
- 企业 dashboard 统一数据视图

这是重型架构变更，P3 阶段仅做模型预留设计，不实施。

---

### P3-5：订阅集成 Stripe Webhook 处理

**当前状态：** `UserSubscription` 模型有 `stripeSubscriptionId` 字段，但没有 Stripe Webhook 处理器（`subscription.updated`、`invoice.payment_failed`、`customer.subscription.deleted`）。

**需要实现：**
- `POST /api/v1/billing/webhook`（Stripe 签名校验；与部分文档中的 `webhooks/stripe` 路径等价）
- 处理 `subscription.updated` → 更新 `UserSubscription.status`（与 `customer.subscription.updated` 同逻辑）
- 处理 `invoice.payment_failed` → 设为 `past_due` + 发通知
- 处理 `customer.subscription.deleted` → 降级为 free tier

---

## 六、P4 优先级：基础设施级优化

> P4 = 技术债清偿和长期可扩展性投资，按技术团队节奏排期。  
> **2026-04-15 更新：** P4-1～P4-4 已在当前主线落地（见下各小节「当前状态」）。

### P4-1：数据库连接池与 Prisma 实例管理

**问题：** Next.js dev 模式下 HMR 导致 Prisma 实例泄露（社区已知问题）。生产中 serverless 函数冷启动也可能造成连接数暴增。

**修复：**
```typescript
// web/src/lib/prisma.ts 全局单例模式
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
在 `DATABASE_URL` 中设置连接池参数：`?connection_limit=10&pool_timeout=20`。

**当前状态：** `web/src/lib/db.ts` 使用 `global.__vibehub_prisma__` 单例并注明 P4-1；连接池参数仍由部署侧在 `DATABASE_URL` 上配置（Prisma 数据源 URL）。

---

### P4-2：Repository 层统一错误处理

**问题：** 各 route.ts 对 repository 抛出的错误处理方式不一致（部分用 try/catch，部分没有），导致 500 错误暴露 Prisma 内部信息。

**修复：**
1. 定义 `RepositoryError` 类型（`NOT_FOUND`、`CONFLICT`、`UNAUTHORIZED`、`FORBIDDEN`、`CREATOR_PROFILE_REQUIRED`、`INVALID_INPUT` 等）
2. Repository 函数抛出 `RepositoryError` 而非原始 Prisma 错误
3. Route handler 统一转换为 `apiError` 响应
4. `P2002`（唯一约束冲突）→ 409，`P2025`（记录不存在）→ 404

**当前状态：** `web/src/lib/repository-errors.ts` 提供 `RepositoryError`、`mapPrismaToRepositoryError`、`apiErrorFromRepositoryCatch`；`createPost` / `createProject` 等对 Prisma 已知错误做映射；`listPosts` / `listProjects` 的非法 `cursor` 返回 400。`createProject` 与 `submitCollaborationIntent` 缺少创作者资料时抛出 `RepositoryError`（code `CREATOR_PROFILE_REQUIRED`，HTTP 403），对应 HTTP 路由与 MCP `invoke` 已消费该类型。其余 repository 函数可按同一模式逐步补齐。

---

### P4-3：分页游标化（Cursor-based Pagination）

**问题：** 当前所有列表接口使用 offset 分页（`page`/`limit`）。大数据集下 offset 分页性能差（全表计数 + 跳过 N 行），也存在幻读问题（分页期间新增内容导致重复/跳过）。

**修复（分阶段）：**
1. P4 阶段优先对高频接口 `GET /api/v1/posts`、`GET /api/v1/projects` 增加游标分页支持（向后兼容：同时支持 `cursor` 和 `page`）
2. 游标基于 `createdAt` + `id` 组合（稳定排序）
3. Response 中增加 `nextCursor` 字段

**当前状态：** `listPosts` / `listProjects` 支持 `cursor`（与 `page` 并存）；帖子在默认/`recent` 且无全文 `query`、非 featured-only 时使用 `createdAt`+`id`；项目在无非全文 `query` 时使用 `updatedAt`+`id`。通过多取一行判定是否还有下一页，避免末页误发 `nextCursor`。`GET /api/v1/posts` 与 `GET /api/v1/projects` 已透传 `cursor` 查询参数。Mock 数据补充了第三条项目与第四条已审帖子，便于单测覆盖多页游标。

---

### P4-4：OpenAPI Codegen 集成

**目标：** 从 `openapi-spec.ts` 自动生成前端 TypeScript 客户端类型，消除前后端字段漂移。

**工具选型：** `openapi-typescript`（生成类型）+ `openapi-fetch`（类型安全客户端）

**实施路径：**
1. `openapi-spec.ts` 覆盖率达到 P1-1 目标后
2. `npm run generate:types` 生成 `web/src/lib/api-types.ts`
3. 前端组件逐步迁移使用生成类型
4. CI 验证：生成结果未变更（`git diff --exit-code`）

**当前状态：** 已添加 `openapi-typescript` 与 `openapi-fetch`（devDependency）、`npm run generate:types`（`scripts/generate-api-types.ts`）输出 **`web/src/lib/generated/api-types.ts`**（已纳入版本库）；`npm run check` 在 `validate:openapi` 之后执行 `generate:types` 再 `build`，保证 spec 变更会驱动类型重新生成并通过类型检查。OpenAPI 已为 `GET /posts`、`GET /projects` 增加 `cursor` 参数说明，并为帖子创建补充 403/409 响应、为项目创建补充 402/409。

---

## 七、持续监控项（每次 PR 必检）

以下问题曾发生或存在高概率再次发生，每次 PR review 必须对照检查：

| 检查项 | 对应原则 |
|--------|---------|
| 新增 route 是否添加到 `openapi-spec.ts` | 原则 C |
| 企业相关路由是否检查 `enterpriseStatus === 'approved'` | 原则 B / P0-1 |
| 管理员操作是否调用 `requireAdminSession()` | 原则 B |
| 新增写操作是否创建 `AuditLog` | 原则 A |
| MCP 工具新增是否同步 `mcp-v2-tools.ts` + `manifest` | 原则 C |
| 新 scope 是否添加到 `api-key-scopes.ts` | 原则 B |
| mock 路径是否与 Prisma 路径行为一致 | 原则 A |
| `USE_MOCK_DATA` 路径是否有对应的真实 DB 测试 | 原则 D |
| Session 结构变更是否兼容旧 token | 原则 D |

---

## 八、执行优先级汇总表

| 编号 | 任务 | 优先级 | 受影响模块 | 预估复杂度 |
|------|------|--------|-----------|-----------|
| P0-1 | Enterprise 路由强制 `enterpriseStatus` 校验 | 🔴 P0 | 6 条路由 + auth.ts + types.ts | S |
| P0-2 | `demo-login` 生产环境硬封锁 | 🔴 P0 | 1 个 route | XS |
| P0-3 | WebSocket 服务器内部信任链加固 | 🔴 P0 | ws-server.ts + 内部 REST | M |
| P0-4 | 协作意向审核迁移到项目 owner | 🔴 P0 | 1 条新路由 + 权限逻辑 | S |
| P1-1 | OpenAPI 覆盖率提升至 80% | 🟠 P1 | openapi-spec.ts 拆分重构 | L |
| P1-2 | `SessionUser` 增加 enterprise/subscription 字段 | 🟠 P1 | auth.ts + types.ts + 6 条路由 | M |
| P1-3 | 积分系统增量更新机制 | 🟠 P1 | repository + 任务/里程碑路由 | M |
| P1-4 | 里程碑操作 owner-only 权限 | 🟠 P1 | 里程碑路由 + 测试 | S |
| P1-5 | 帖子 `reviewStatus` 过滤统一 | 🟠 P1 | `listPosts` + 测试 | S |
| P1-6 | API Key `expiresAt` 字段 | 🟠 P1 | ApiKey 模型 + migration + auth.ts | S |
| P1-7 | 关键写操作 `AuditLog` 覆盖 | 🟠 P1 | 8+ repository 函数 | M |
| P2-1 | 全文搜索 `tsvector` + GIN 索引 | 🟡 P2 | Migration + repository | M |
| P2-2 | MCP Write Tools 前置条件清单 | 🟡 P2 | 文档 + scope 注册 | S |
| P2-3 | `EnterpriseProfile` 独立模型迁移 | 🟡 P2 | 3 个分阶段 migration | L |
| P2-4 | Subscription 配额执行层 | 🟡 P2 | quota.ts + 创建路由 | M |
| P2-5 | WebSocket 消息频率限制与 XSS 防护 | 🟡 P2 | ws-server.ts | S |
| P2-6 | `me/feed` 真实关注 Feed 审计补全 | 🟡 P2 | repository + 测试 | S |
| P3-1 | MCP Write Tools 实施 | 🟢 P3 | mcp-v2-tools + 6 条路由 | XL |
| P3-2 | 统一搜索 API | 🟢 P3 | 新路由 + repository | M |
| P3-3 | Webhook 系统通用化 | 🟢 P3 | 新模型 + 事件分发层 | L |
| P3-4 | Enterprise 多成员架构预留 | 🟢 P3 | 模型设计（不实施） | S（设计） |
| P3-5 | Stripe Webhook 处理 | 🟢 P3 | 新路由 + 订阅状态机 | M |
| P4-1 | Prisma 连接池优化 | ✅ 已完成（单例 + 部署 URL 池化） | db.ts | XS |
| P4-2 | Repository 统一错误处理 | 🟡 部分完成（核心写路径 + 列表游标校验；其余函数可渐进） | repository-errors + routes | L |
| P4-3 | 游标分页 | ✅ 已完成 | posts/projects + repository | M |
| P4-4 | OpenAPI Codegen | ✅ 已完成 | generate:types + generated/api-types.ts | M |

---

## 九、当前版本（v3.4）已确认无需处理的项目

以下是经过审计后确认"当前实现已足够，不需要额外整改"的项目，供参考：

- `McpInvokeAudit` 全路径记录 — ✅ 已实现且充分
- `timingSafeEqual` HMAC 比较 — ✅ 防时序攻击
- Redis 速率限制回退内存 — ✅ 优雅降级
- `TeamTask.milestoneId` 跨团队校验 — ✅ 已实现
- Team join request 唯一约束 — ✅ 数据库层保证
- `pruneOldComments` 默认禁用（0=disabled）— ✅ 安全默认值
- Post 精华机制 `featuredAt/featuredBy` 双字段 — ✅ 完整审计链
- WS chat 30 天保留策略 — ✅ admin 可控
