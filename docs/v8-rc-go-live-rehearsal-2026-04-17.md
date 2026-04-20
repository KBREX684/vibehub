> ⛔ **已归档**（2026-04-19）：本文件代表 v11.0 之前的产品方向，**不再作为当前主线**。
> 当前主线见 `docs/v11.0-final-chapter-rfc.md`，主线索引 `docs/roadmap-current.md`。
> 本文件保留作为历史档案，新工作请勿基于本文件展开。

# VibeHub v8 RC / Go-Live Rehearsal

日期：2026-04-17  
环境：production-like 本机演练  
对应路线图：`docs/roadmap-v8.md`  
对应清单：`docs/v7-go-live-checklist.md`、`docs/launch-readiness-standard.md`

---

## 1. 结论

本轮 `v8` production-like RC / go-live 演练已完成。

结论分两层：

1. **代码与部署基线已通过**
   - clean schema `migrate -> seed -> smoke -> build -> start` 全部通过
   - 关键用户链路、API/MCP、后台治理、WebSocket 团队聊天已在 production 模式下验证
2. **正式 go-live 仍未 ready**
   - 原因已经收敛到明确的 **W6 外部 blocker**
   - 不再是“系统大体未完成”，而是“外部凭据与合规审批未完成”

---

## 2. 演练环境

- Next.js：`next start` on `127.0.0.1:3150`
- WS server：`ws-server.ts` on `127.0.0.1:3151`
- PostgreSQL：`127.0.0.1:55432`
- Redis：`127.0.0.1:6379`
- 数据库 schema：`rc_rehearsal_20260417`
- 关键环境：
  - `NODE_ENV=production`
  - `ENFORCE_REQUIRED_ENV=true`
  - `USE_MOCK_DATA=false`
  - `REDIS_URL` 已配置
  - `WS_HEALTH_URL` 已配置
  - `SESSION_SECRET`、`INTERNAL_SERVICE_SECRET`、`CHAT_WS_TOKEN_SECRET` 已配置

说明：

- 未配置 SMTP
- 未配置 Stripe live keys
- 未配置支付宝 live appId / RSA keys
- 未配置微信支付 live merchant cert / API v3 key
- 未配置 admin AI provider，系统按 fallback 运行

---

## 3. 预发布结果

### 3.1 基础设施与部署

通过：

- clean schema `prisma migrate deploy`
- `npm run prisma:seed`
- `npm run smoke:live-data`
- `npm run build`
- `next start`
- `ws-server.ts`

本轮发现并修复的真实阻塞：

- `web/prisma/migrations/20260419000000_p2_enterprise_profile_fulltext/migration.sql`
  - 原问题：对 `searchVector` 的存在判断写死 `table_schema='public'`，导致非 `public` clean schema 迁移时重复建列
  - 修复：改为 `table_schema = current_schema()`
  - 结果：clean deploy 恢复可用

### 3.2 自动化门禁

通过：

- `npm run lint`
  - 通过，2 条历史 warning 未变
- `npm run validate:openapi`
  - 通过
  - `paths=127`
  - `non-admin coverage=92.2% (128 routes)`
- `npm run generate:types`
  - 通过
- `npm test`
  - 通过
  - `64` 个测试文件
  - `275` 个测试全部通过
- `npm run build`
  - 通过

### 3.3 健康检查

`/api/v1/health` 与 `/api/v1/admin/health` 均返回 **`degraded`**。

这是本轮的正确结果，不是误报。原因如下：

- `database=ok`
- `redis=ok`
- `websocket=ok`
- `smtp=not_configured`
- `payments.stripe=not_configured`
- `payments.alipay=not_configured`
- `payments.wechatpay=not_configured`
- `ai=fallback`

`/api/v1/admin/health` 还显示了 recent alert：

- `billing.checkout_failed`
  - 触发原因：production-like 环境下 checkout 请求命中 provider not configured

---

## 4. 链路走查

### 4.1 登录 / 注册

- 注册：**阻塞**
  - `POST /api/v1/auth/register` → `503 EMAIL_NOT_CONFIGURED`
  - 这是 production-like 下的正确阻塞，不允许伪成功
- 登录：**通过**
  - 临时 rehearsal schema 中给种子用户补了已验证密码，用于完成剩余链路验证
  - `alice@vibehub.dev`（admin）可登录
  - `bob@vibehub.dev`（user）可登录

### 4.2 讨论

- `GET /api/v1/posts?sort=recommended` → 通过
- 创建讨论：通过
- 点赞：通过
- 收藏：通过
- 评论 / 举报：
  - 对新创建的 `pending` 帖子：不可用，返回 `POST_NOT_FOUND`
  - 这是当前 moderation 设计边界，不是部署故障
  - 对已审核种子帖子：评论通过、举报通过

### 4.3 项目

- 项目创建：通过
- 项目收藏：通过
- 项目列表与详情：通过

### 4.4 团队

- 团队创建：通过
- 团队任务创建：通过
- 团队 WebSocket 聊天：
  - 获取 chat token：通过
  - `ws://127.0.0.1:3151/ws` 连接、鉴权、发送消息：通过

### 4.5 企业认证

- 用户提交企业认证：通过
- 后台读取待审列表：通过
- 管理员审核通过：通过

### 4.6 API / MCP

- 创建 API key：通过
- 拉取 MCP manifest：通过
- Bearer API key 调用 `search_projects`：通过
- API key usage 聚合：通过

### 4.7 支付

全部 **阻塞**，且返回结果符合 production-like 预期：

- Stripe checkout → `503 PAYMENT_PROVIDER_NOT_CONFIGURED`
- Alipay checkout → `503 PAYMENT_PROVIDER_NOT_CONFIGURED`
- WeChat Pay checkout → `503 PAYMENT_PROVIDER_NOT_CONFIGURED`

这证明：

- 代码已拒绝 sandbox 伪成功
- 当前缺的确实是 live provider 凭据与商户配置，而不是实现缺失

### 4.8 后台治理

- `/api/v1/admin/health`：通过
- `/api/v1/admin/reports`：通过
- AI suggestion generate（report ticket）：通过
- AI suggestion decision：通过
- enterprise verification admin review：通过

---

## 5. W6 外部 blocker（已收口）

### Blocker A · SMTP 未配置

影响：

- 邮箱注册在 production-like 下直接失败
- 忘记密码 / 验证邮件同样不能作为正式上线能力启用

状态：

- **正式上线 blocker**

需要提供：

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Blocker B · 支付宝 live 商户参数未配置

影响：

- 中国市场主支付通道不可用
- `/api/v1/billing/checkout` 对 `alipay` 明确返回 `503`

状态：

- **正式上线 blocker**

需要提供：

- `ALIPAY_MODE=live`
- `ALIPAY_APP_ID`
- `ALIPAY_PRIVATE_KEY`
- `ALIPAY_PUBLIC_KEY`
- `ALIPAY_GATEWAY_URL`
- 实际 `notify` / `return` 域名联调

### Blocker C · 微信支付 live 商户参数未配置

影响：

- 微信支付不可用
- 是否构成上线 blocker，取决于首发是否要求支付宝之外的第二支付通道

状态：

- **条件性 blocker**

需要提供：

- `WECHATPAY_MODE=live`
- `WECHATPAY_APP_ID`
- `WECHATPAY_MCH_ID`
- `WECHATPAY_SERIAL_NO`
- `WECHATPAY_PRIVATE_KEY`
- `WECHATPAY_PUBLIC_KEY`
- `WECHATPAY_API_V3_KEY`
- 实际回调联调

### Blocker D · 海外 Stripe live 凭据未配置

影响：

- 海外银行卡订阅不可用

状态：

- **非中国首发 blocker**
- 若首发范围限定中国市场，可列为后续上线项

需要提供：

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- 真实 publishable key 与回调域名

### Blocker E · 合规终审未完成

影响：

- 不能宣称正式 GA

状态：

- **正式上线 blocker**

需要完成：

- ICP
- 隐私政策 / 用户协议法务终审
- AIGC 策略终审
- 推荐流 / 算法备案义务确认
- 数据跨境评估确认

---

## 6. 当前上线判断

当前状态：

- **代码 readiness：通过**
- **production-like 技术演练：通过**
- **正式 go-live：未通过**

未通过原因已经缩小为：

1. SMTP
2. 支付宝 live 商户
3. 微信支付 live 商户（若列入首发）
4. 合规终审

也就是说，当前不是继续开发 `W1-W8` 的问题，而是把外部上线条件补齐的问题。

---

## 7. 下一步

按阻塞优先级执行：

1. 配置并联调 SMTP，重跑注册 / 验证邮件 / 重置密码
2. 配置支付宝 live 商户参数，完成一次真实支付与一次退款演练
3. 明确微信支付是否纳入首发；若纳入，同步完成 live 联调
4. 完成 ICP / 法务 / AIGC / 跨境数据最终审批
5. 审批完成后，再做一次最终 `v8` go-live rehearsal，并切 release candidate
