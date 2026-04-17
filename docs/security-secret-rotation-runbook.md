# VibeHub Security Secret Rotation / Backfill Runbook

日期：2026-04-17  
适用范围：`v8` 安全整改之后的 staging / production 环境  
关联实现：

- `web/scripts/backfill-encrypted-secrets.ts`
- `web/src/lib/secret-crypto.ts`
- `web/src/lib/workflow-automation.ts`
- `web/src/lib/repository.ts`

---

## 1. 目标

本次安全整改解决了两个问题：

1. 新写入的用户 webhook secret 不再明文落库
2. 自动化工作流中的第三方敏感配置不再明文落库

但这不会自动修改历史数据库中的旧明文字段。  
本 runbook 用于完成以下动作：

- 为环境补齐必要密钥
- 对历史数据执行一次回填加密
- 明确哪些值需要进一步轮换，而不是只做加密存储

---

## 2. 前置条件

在 staging / production 环境执行前，必须确认以下变量已经配置：

- `DATABASE_URL`
- `SESSION_SECRET`
- `DATA_ENCRYPTION_KEY`
- `INTERNAL_SERVICE_SECRET`

说明：

- `DATA_ENCRYPTION_KEY` 是凭据静态加密专用密钥
- 不要复用 `SESSION_SECRET`
- 长度要求至少等价于高强度随机 32+ 字节

---

## 3. dry-run 检查

先执行 dry-run，确认还有多少历史明文数据需要重写：

```bash
cd /root/vibehub/web
USE_MOCK_DATA=false npm run security:backfill-secrets
```

预期输出：

```json
{
  "ok": true,
  "mode": "dry-run",
  "rewrites": {
    "webhookSecrets": 0,
    "automationStepConfigs": 0
  }
}
```

含义：

- `webhookSecrets`：历史明文 `WebhookEndpoint.secret` 数量
- `automationStepConfigs`：历史明文自动化敏感配置数量

如果命令失败：

- `DATABASE_URL_REQUIRED`
  - 环境没有配置数据库
- `BACKFILL_REQUIRES_DATABASE_MODE`
  - 当前仍在 mock 模式
- Prisma table/schema 错误
  - 先完成 `migrate deploy`

---

## 4. apply 执行

确认 dry-run 结果后，再执行真正回填：

```bash
cd /root/vibehub/web
USE_MOCK_DATA=false npm run security:backfill-secrets -- --apply
```

执行逻辑：

- 明文 `WebhookEndpoint.secret` 会被改写成 `enc:v1:*`
- 自动化步骤中的以下字段会被改写成加密值：
  - `send_slack_message.webhookUrl`
  - `send_discord_message.webhookUrl`
  - `send_feishu_message.webhookUrl`
  - `trigger_github_repository_dispatch.token`

注意：

- 这是就地更新，不会新增表
- 推荐在执行前做一次数据库备份

---

## 5. 必须轮换的值

加密落库不等于轮换。以下情况仍建议主动轮换：

### 必须轮换

- 如果历史数据库、备份、导出、日志中可能已经暴露过明文值
- 如果任何真实 GitHub PAT / 第三方 webhook URL 曾被人工粘贴到工单、聊天、README、注释或演示环境

### 轮换对象

- 用户 webhook secret
- Slack / Discord / Feishu webhook URL
- GitHub `repository_dispatch` token
- 任何曾经写进自动化配置的第三方敏感字段

### 轮换方式

- webhook secret：
  - 删除并重建对应 webhook endpoint
- Slack / Discord / Feishu：
  - 在第三方平台重新生成 webhook，回填到 VibeHub 设置页
- GitHub token：
  - 在 GitHub 撤销旧 PAT，生成新 token，再更新自动化配置

---

## 6. 执行后验证

执行回填与轮换后，至少验证以下项目：

1. `npm run security:backfill-secrets`
   - 结果应变成 `rewrites = 0`
2. 用户 webhook 测试发送仍然成功
3. 自动化工作流实际触发仍然成功
4. 用户设置页不回显真实 secret，只显示脱敏值
5. 数据库抽查目标字段不再是明文

---

## 7. 发布门槛

以下条件全部满足后，才应认为这部分整改闭环：

1. `DATA_ENCRYPTION_KEY` 已在正式环境配置
2. dry-run 已执行
3. `--apply` 已执行
4. 需要轮换的第三方凭据已轮换
5. 回填后功能链路已验证

如果第 4 步没做，只完成了回填：

- 结论应是：**“已降低数据库只读泄露风险，但不视为完全闭环”**

