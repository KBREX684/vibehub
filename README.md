# VibeHub Workspace

VibeHub 当前仓库围绕 **v11.0 AI 留痕本** 维护：
- `Studio`：记录你与 Agent 的日常工作
- `Ledger`：把关键操作写成可校验账本
- `Trust Card`：把真实工作记录公开展示与导出

## 当前入口

- `web/`：Next.js 全栈应用
- `docs/roadmap-current.md`：当前主线索引
- `docs/v11.0-final-chapter-rfc.md`：产品与收敛定义
- `docs/v11.0-backend-tasks.md`：后端执行计划
- `docs/v11.0-frontend-tasks.md`：前端执行计划
- `DESIGN.md`：当前设计系统基线

## 归档

历史路线图、旧设计参考与存量辅助文档已移至：
- `docs/archive/v8-v10/`
- `docs/archive/design/`
- `docs/archive/reference/`

这些文件仅供回溯，不得继续作为当前实现依据。

## Quick Start

```bash
cd web
npm install
cp .env.example .env.local
npm run dev
```

## 推荐验证路径

Mock 模式：

```bash
cd web
USE_MOCK_DATA=true npm run test
```

真实数据库路径：

```bash
cd web
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run smoke:live-data
```
