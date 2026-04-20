# VibeHub Web

Next.js 全栈实现，当前只服务 v11 主线：
- `Studio`
- `Ledger`
- `Trust Card`
- `Pricing / Settings / Compliance`

## 当前产品范围

- 个人工作记录、artifact、快照、交付
- Agent 执行与确认留痕
- Ledger 导出、校验、锚定
- AIGC 标识、合规设置与审计轨迹
- Trust Card 公开页与 PDF
- 中国版订阅与设置能力

旧 `discover / team workspace / collaboration intent / discussions / leaderboards / collections / developers-public`
如仍有代码或 API，仅属于兼容面或历史能力，不再是当前主产品面。

## 质量门禁

- `npm run lint`
- `npx tsc --noEmit`
- `npm run validate:openapi`
- `npm run generate:types`
- `npm run build`

## 当前文档入口

- `../docs/roadmap-current.md`
- `../docs/v11.0-final-chapter-rfc.md`
- `../docs/v11.0-backend-tasks.md`
- `../docs/v11.0-frontend-tasks.md`
- `../DESIGN.md`

归档文档请看 `../docs/archive/README.md`。

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

本地默认使用当前环境配置；无数据库时可显式开启 mock：

```bash
USE_MOCK_DATA=true npm run dev
```
