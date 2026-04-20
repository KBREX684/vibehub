# VibeHub Repository Cleanup Report

> 适用版本：v8 maturity convergence（已被 v11.0 取代）。
> 本文件描述的清理决策仍然有效（从未撤回过），但里面提到的"developer-first
> small-team"产品定位已不再准确。当前 v11.0 定位见 `docs/v11.0-final-chapter-rfc.md`。

Updated: 2026-04-14（v11 注释 2026-04-19 添加）

## Scope

This report captures the maturity-closeout review of repository structure,
historical documents, and strategy alignment. It is intentionally conservative:
files are only deleted after reference scanning and replacement confirmation.

## Summary Decisions

| Item | Decision | Reason |
|---|---|---|
| `README.md` | Keep, rewrite | Root entry should reflect the current strategy only |
| `docs/roadmap-current.md` | Keep | Primary execution roadmap for the current strategy |
| `docs/roadmap-history.md` | Keep | Historical roadmap and phase archive |
| `docs/release-notes.md` | Keep | Historical delivery log separated from current roadmap |
| `docs/repository-cleanup-report.md` | Keep | Records cleanup decisions and traceability |
| `docs/02_Debug表.md` | Keep | Historical issue log still useful for audits |
| `docs/04_frontend_backend_mapping.md` | Keep | Useful acceptance mapping; should be refreshed later |
| `docs/05_no_fake_feature_checklist.md` | Keep | Still relevant to maturity work |
| `docs/06_openapi_route_audit.md` | Keep | Supports API contract hygiene |
| `docs/07_mcp_capability_matrix.md` | Keep | Supports developer tooling boundary clarity |
| `docs/08_backend_optimization_roadmap.md` | Keep | Technical follow-up document, not a strategy source |
| `VibeHub_项目计划书_v3.0.md` | Keep as archive | Historical strategy context; no longer the active execution source |
| `docs/ROADMAP.md` | Delete after replacement | Redundant with new roadmap split and causes strategy drift |

## Pending Deletion List

| Path | Delete reason | Referenced? | Replacement / destination |
|---|---|---|---|
| `docs/ROADMAP.md` | Mixed current strategy with historical planning, duplicates new split docs, and keeps outdated execution status wording alive | Only as a strategy document; no runtime code dependency | `docs/roadmap-current.md` + `docs/roadmap-history.md` |

## Pending Archive List

| Path | Archive reason | Referenced? | Archive destination |
|---|---|---|---|
| `docs/01_实现计划图.md` | Detailed historical phase log; too noisy for current execution | Yes, historical docs | Folded into `docs/roadmap-history.md` |
| `docs/03_项目日志.md` | Historical delivery log should not be the primary strategy entry | Yes, historical docs | Folded into `docs/release-notes.md` |
| `VibeHub_项目计划书_v3.0.md` | Historical strategy baseline | Yes, docs only | Retained in place as archive |

## Keep Rationale

### `docs/02_Debug表.md`
- Still contains useful issue IDs and verification history.
- Referenced by historical logs.
- No reason to delete while audit traceability remains useful.

### `docs/04_frontend_backend_mapping.md`
- Still valuable for fake-feature and acceptance audits.
- Needs refresh, but not removal.

### `docs/05_no_fake_feature_checklist.md`
- Directly aligned with the maturity-closeout goal.

### `docs/06_openapi_route_audit.md`
- Supports acceptance and contract hygiene.

### `docs/07_mcp_capability_matrix.md`
- Useful for scoping developer tooling and avoiding narrative drift.

### `docs/08_backend_optimization_roadmap.md`
- Technical debt roadmap, not conflicting with current product strategy.

## Mock Runtime Strategy

- **Preferred verification path:** real database + Prisma migrations + seed data.
- **New smoke path:** `npm run smoke:live-data` validates the real seeded path when
  `DATABASE_URL` is configured.
- **Operational compromise for `npm run check`:** if `DATABASE_URL` is absent and
  `USE_MOCK_DATA` is not explicitly forced to `false`, the app may safely fall
  back to mock data so lint/test/build can still run in ephemeral environments.
- **Guardrail:** mock mode remains explicit in docs and test config, and no longer
  serves as the only implied runtime truth.

## Impact Assessment for Deletion

Deleting `docs/ROADMAP.md` is low risk because:
- no code or build pipeline consumes it
- the new roadmap split replaces its only valid purpose
- root documentation will point to the replacement files first

Potential residual risk:
- humans with old bookmarks may still expect the deleted path

Mitigation:
- root README points to the new files
- historical content survives in `docs/roadmap-history.md`

## Follow-up Refreshes (not deletions)

1. Refresh `docs/04_frontend_backend_mapping.md` to reflect current page/API status.
2. Refresh `docs/05_no_fake_feature_checklist.md` after the live DB smoke path becomes standard.
3. Refresh `docs/07_mcp_capability_matrix.md` because MCP write tools now exist in a constrained form.
