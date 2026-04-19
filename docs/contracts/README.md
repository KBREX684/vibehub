# v11.0 Contracts Directory

每个 P-阶段开工前，由 PM 在此目录下放一份契约文件并 lock。
BE（GPT）与 FE（GLM）都从这里读，**契约文件一经签字冻结，禁止任意一方私改**。

约定：
- 文件名格式 `pN-feature.md`（如 `p0-deprecation.md`）
- 文件顶部必须有 `状态：草案 / 已冻结 / 已实现` 三选一
- 已冻结后修改必须新建 PR 并通知双方

详见 `docs/v11.0-engineering-plan.md` §二。
