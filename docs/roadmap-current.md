# VibeHub Roadmap (Current)

更新日期：2026-04-16

## 当前战略

VibeHub 当前只聚焦三条主线：

1. 社区 -> 项目 -> 协作意向
2. 项目 -> 团队 -> 任务 / 里程碑
3. 开发者 API / MCP

产品定位统一为：

- 开发者优先
- 小团队优先
- Free + Pro
- 企业能力为次级旁观层，不是主飞轮

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

## 当前企业能力定位

企业能力仅保留为次级 observer layer：

- 项目雷达
- 人才雷达
- 尽调摘要
- 生态报告

平台管理员与 enterprise access 是两条独立权限线：

- `admin`: 平台治理、审核、运维
- `enterpriseStatus=approved`: 雷达工作台访问能力

## 当前验收主链路

1. 登录 -> 创建 creator profile -> 发布项目
2. 浏览项目 -> 提交协作意向 -> 审核
3. 创建团队 -> 入队审批 -> 任务推进
4. 创建 API Key -> 调用公开 API / MCP
5. 升级 Pro -> 权限与额度生效

## 配套文档

- 当前主线：`docs/roadmap-current.md`
- 完整规划（v5.0）：`docs/roadmap-v5.md`
- 查漏补缺（v6.5）：`docs/roadmap-v6.5.md` ← **最新**
- 历史演进：`docs/roadmap-history.md`
- 发布与整改记录：`docs/release-notes.md`
- 仓库整理报告：`docs/repository-cleanup-report.md`

## 当前迭代焦点（v6.5 路线图）

v5.0 规划的 P0–P4 已在 v6.0 全部收尾，当前根据全量代码审计结果聚焦查漏补缺：

### 🔴 P0 紧急安全（3 项，均为普通难度）
- 替换 Math.random() ID 生成为加密安全随机数
- 为 parseInt/Number() 调用添加有限性校验与上限
- 消除 API 响应中的原始错误信息泄露

### 🟠 P1 健壮性与质量工程（7 项：5 普通 + 2 复杂）
- 剩余 ~61 个路由 Zod 验证补全
- 类型化错误枚举替换字符串匹配
- SSE 流异常保护 + webhook-deliveries 路由异常处理
- Vitest 覆盖率配置 + 组件/Hook 单元测试

### 🟡 P2 前端体验细节（5 项：4 普通 + 1 复杂）
- Feed 组件空状态与重试、i18n 遗漏补充
- fetch 超时与中止控制、无障碍属性补全
- AuthContext 拆分减少重渲染

### 🟢 P3 基建运维（4 项：3 普通 + 1 复杂）
- GitHub Actions CI/CD 流水线
- 环境变量校验完善、Prisma 查询超时、.env 模板更新

详见 `docs/roadmap-v6.5.md`。
