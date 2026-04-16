# VibeHub 回滚操作标准流程 (Rollback SOP)

> 更新日期：2026-04-16  
> 依据：`docs/launch-readiness-standard.md` §2.6

---

## 1. 回滚判定条件

出现以下任一情况时，应立即启动回滚：

| 条件 | 阈值 | 监控方式 |
|------|------|---------|
| 5xx 错误率 | > 5% 持续 5 分钟 | 健康检查 + 日志 |
| 核心链路不可用 | 任一主链路失败 | E2E smoke test |
| 数据库连接失败 | health endpoint 报告 database: error | health-check-cron.sh |
| 支付链路异常 | Stripe webhook 持续失败 | Stripe Dashboard |
| 用户报告大规模故障 | > 3 个独立报告 | 支持渠道 |

## 2. 应用回滚（PM2）

### 快速回滚到上一版本

```bash
# 查看部署历史
pm2 deploy production list

# 回滚到上一版本
pm2 deploy production revert 1

# 验证回滚
curl -s http://localhost:3000/api/v1/health | jq .status
```

### 手动回滚

```bash
# 1. 切换到上一个已知正常的版本
cd /path/to/vibehub/web
git checkout <last-known-good-commit>

# 2. 安装依赖
npm ci

# 3. 重新构建
npm run build

# 4. 重启服务
pm2 restart ecosystem.config.js

# 5. 验证
curl -s http://localhost:3000/api/v1/health | jq .status
```

## 3. 数据库 Migration 回滚

### 注意事项

- 当前所有 migration 为 **up-only**（无自动 down migration）
- 数据库回滚需要手动编写 SQL

### 回滚步骤

```bash
# 1. 确认当前 migration 状态
npx prisma migrate status

# 2. 手动编写回滚 SQL（根据需要回滚的 migration）
# 例如回滚 G-01 magic link migration：
psql $DATABASE_URL -c "
  DROP TABLE IF EXISTS \"MagicLinkToken\";
  ALTER TABLE \"ApiKey\" DROP COLUMN IF EXISTS \"agentLabel\";
"

# 3. 标记 migration 为已回滚
npx prisma migrate resolve --rolled-back 20260424000000_g01_magic_link_g05_agent_label

# 4. 验证 schema 状态
npx prisma migrate status
```

### 回滚 SQL 模板

每个 migration 应在部署前准备对应的回滚 SQL。以下是当前 migration 的回滚参考：

| Migration | 回滚 SQL |
|-----------|---------|
| `20260424000000_g01_magic_link_g05_agent_label` | `DROP TABLE IF EXISTS "MagicLinkToken"; ALTER TABLE "ApiKey" DROP COLUMN IF EXISTS "agentLabel";` |

## 4. 配置回滚

```bash
# 1. 检查当前配置
cat .env.production

# 2. 恢复上一版本配置（从备份）
cp .env.production.backup .env.production

# 3. 重启服务
pm2 restart ecosystem.config.js
```

**配置变更最佳实践：**
- 每次配置变更前备份：`cp .env.production .env.production.$(date +%Y%m%d%H%M%S)`
- 使用版本控制管理配置模板（不含实际密钥）

## 5. 回滚后通知流程

回滚完成后，按以下顺序通知：

1. **即时通知** — 在团队通讯群发送回滚通知，包含：
   - 回滚时间
   - 触发原因
   - 当前状态（服务恢复 / 部分降级）
   - 负责人

2. **事后分析** — 24 小时内完成：
   - 根因分析 (Root Cause Analysis)
   - 时间线梳理
   - 影响范围评估
   - 改进措施

3. **文档更新** — 将回滚事件记录到 `docs/release-notes.md`

## 6. 回滚检查清单

执行回滚时，逐项确认：

- [ ] 确认回滚版本/commit SHA
- [ ] 通知团队成员正在回滚
- [ ] 执行应用回滚（PM2 或手动 git checkout）
- [ ] 如需数据库回滚，执行回滚 SQL
- [ ] 如需配置回滚，恢复配置文件
- [ ] 验证 health endpoint 返回 `ok`
- [ ] 验证核心链路（登录、项目浏览、团队功能）
- [ ] 发送回滚完成通知
- [ ] 安排事后分析会议
