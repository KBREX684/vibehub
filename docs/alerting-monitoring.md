# VibeHub 告警机制 (Alerting & Monitoring)

> 更新日期：2026-04-16  
> 依据：`docs/launch-readiness-standard.md` §2.6

---

## 1. 当前能力

### 已有
- `GET /api/v1/health` — 健康检查端点（DB + Redis + WebSocket 连通性）
- pino structured logging — 结构化日志 + requestId 追踪
- `X-Request-Id` — 请求级别追踪

### 本次新增
- `scripts/health-check-cron.sh` — 定时健康巡检脚本
- 支持邮件告警 + Webhook 告警

## 2. Cron 巡检配置

### 安装

```bash
# 每 5 分钟检查一次
crontab -e
# 添加以下行：
*/5 * * * * /path/to/vibehub/web/scripts/health-check-cron.sh >> /var/log/vibehub-health.log 2>&1
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VIBEHUB_HEALTH_URL` | 健康检查端点 | `http://localhost:3000/api/v1/health` |
| `VIBEHUB_ALERT_EMAIL` | 告警邮箱（需安装 `mail` 命令） | 空（不发邮件） |
| `VIBEHUB_ALERT_WEBHOOK` | 告警 Webhook URL（Slack/Discord/飞书等） | 空（不发 webhook） |

### Webhook 格式

告警时发送 POST 请求，body 为：

```json
{
  "text": "[VibeHub Alert] Health status is 'degraded' ...",
  "timestamp": "2026-04-16T12:00:00Z"
}
```

## 3. 推荐外部监控方案

对于生产环境，建议配合使用外部 SaaS 监控服务：

| 服务 | 特点 | 免费额度 |
|------|------|---------|
| [UptimeRobot](https://uptimerobot.com) | HTTP 监控 + 邮件/Slack 告警 | 50 monitors |
| [Better Stack](https://betterstack.com) | 日志 + uptime + 告警 | 有免费层 |
| [Checkly](https://checklyhq.com) | API + 浏览器监控 | 有免费层 |
| [Grafana Cloud](https://grafana.com/products/cloud/) | 全栈可观测性 | 有免费层 |

### 推荐配置

1. 在外部监控服务中添加 `https://your-domain.com/api/v1/health` 作为 HTTP check
2. 设置告警阈值：连续 2 次失败触发告警
3. 配置通知渠道：邮件 + Slack/飞书

## 4. 健康检查响应格式

```json
{
  "service": "vibehub-api",
  "version": "v1",
  "status": "ok",
  "dataMode": "database",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "websocket": "ok"
  }
}
```

`status` 字段值：
- `ok` — 所有检查通过
- `degraded` — 部分检查失败但服务可用
