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

## 维护规则

1. 无编号问题不修复。
2. 每次状态变更必须更新“验证记录”。
3. 进入 `Verified` 必须有复测结论。
