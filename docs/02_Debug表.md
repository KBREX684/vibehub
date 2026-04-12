# VibeHub Debug 表

版本：v1.0  
更新日期：2026-04-12

## 状态流转标准

`Open -> InProgress -> Resolved -> Verified -> Closed`

## Debug 表（模板）

| Issue ID | 阶段 | 模块 | 环境 | 复现步骤 | 期望结果 | 实际结果 | 根因 | 修复方案 | 状态 | 责任人 | 验证记录 | 关联提交 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-XXXX | PX | API/UI/DB | dev/staging/prod | step1; step2 | ... | ... | ... | ... | Open | owner | ... | commit hash |

## 当前问题清单

| Issue ID | 阶段 | 模块 | 环境 | 复现步骤 | 期望结果 | 实际结果 | 根因 | 修复方案 | 状态 | 责任人 | 验证记录 | 关联提交 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-P1-001 | P1 | 脚手架 | dev | 运行 `npx create-next-app` | 正常生成 | npm registry 超时 | 网络不可达 | 改为手工搭建 Next.js 工程骨架 | Resolved | Codex | 文件已生成并可进入下一步 | 本次提交 |
| BUG-P1-002 | P1 | 鉴权 | dev | 构造非法 role 调用 demo-login | 非法 role 不应获得高权限 | 非法 role 可回退到 admin 会话 | role 未白名单且 demo 用户回退逻辑不安全 | 增加 role 白名单 + 取消 admin fallback + 会话签名 | Verified | Codex | 已通过代码审计复核 | `0b24104` |
| BUG-P1-003 | P1 | 构建 | dev/ci | 执行 `npm run build` | 构建成功 | mock 模式仍触发 Prisma 初始化失败 | repository 顶层静态导入 Prisma | 改为 DB 分支按需动态加载 Prisma | Verified | Codex | 本地 `npm run build` 通过 | 本次提交 |

## 维护规则

1. 无编号问题不修复。
2. 每次状态变更必须更新“验证记录”。
3. 进入 `Verified` 必须有复测结论。

## P2-2 Debug Closure (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| BUG-P2-2-001 | P2 | Collaboration workflow | Missing collaboration entry/review loop between project page and admin queue | No CollaborationIntent model or API chain | Added model + repository + `/api/v1/projects/[slug]/collaboration-intents` + `/api/v1/admin/collaboration-intents` + admin review endpoint/page | Verified | `npm run check` passed; tests include `collaboration-intent-repository.test.ts` |

## P2 Closure Audit (2026-04-12)

| Issue ID | Stage | Module | Symptom | Root Cause | Fix | Status | Verification |
|---|---|---|---|---|---|---|---|
| BUG-P2-4-001 | P2 | API contracts (`projects`, `mcp/search_projects`) | Invalid `status` query was silently ignored, yielding broad result set without caller feedback | Parameter parsing returned `undefined` for unknown values and proceeded | Added strict validation: invalid `status` now returns `400 INVALID_STATUS` with allowed enum values | Verified | `npm run check` passed after API update |
| AUDIT-P2-DOC-001 | P2 | `web/README.md` | Scope documentation still labeled as `P1 + P2-1`, missing P2-2/3/4 endpoints and discovery routes | Docs were not updated alongside feature increments | Updated scope and endpoint sections to include P2-2/3/4 public APIs and discover/facets filters | Verified | Manual doc review + endpoint list cross-check with `src/app/api/v1/**/route.ts` |
