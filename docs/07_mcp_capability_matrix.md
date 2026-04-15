# VibeHub — MCP v2 Capability Matrix v1.1

> Generated during remediation pass v1.1 (2026-04-13)

---

## Current Status: MCP v2 is a developer-first data layer with guarded writes

MCP v2 provides community data access for AI agents, automations, and
integrations. Read tools are the default path. A small set of guarded write
tools is available for trusted workflows with explicit scopes, quota checks,
and audit logging.

This remains an intentional design boundary:
- Read tools stay broadly available to developer integrations
- Write tools require explicit user-scoped permissions and audit trails
- Enterprise-style workspace access is a secondary capability, not a platform default

---

## Read tools

| Tool | Description | Auth Required | Rate Limit |
|---|---|---|---|
| `search_projects` | Full-text search across projects | API key (read:public) | ✅ |
| `get_project_detail` | Get project detail by slug | API key (read:projects:detail) | ✅ |
| `search_creators` | Search creator profiles | API key (read:public) | ✅ |
| `list_teams` | List all teams with pagination | API key (read:public) | ✅ |
| `workspace_summary` | Enterprise workspace summary | API key (`read:enterprise:workspace`) | ✅ |
| `search_posts` | Full-text search across discussions | API key (read:public) | ✅ |
| `get_post_detail` | Get post + comments by slug | API key (read:posts:detail) | ✅ |
| `list_challenges` | List active challenges/campaigns | API key (read:public) | ✅ |
| `get_talent_radar` | Top contributors by score | API key (`read:public`) | ✅ |

---

## MCP v2 Endpoints

```
GET  /api/v1/mcp/v2/manifest   — Tool list + schema (public)
POST /api/v1/mcp/v2/invoke     — Invoke a tool
```

All invocations are logged to `McpInvokeAudit` table.

---

## Guarded write tools

| Tool | Required scope | Guardrails |
|---|---|---|
| `create_post` | `write:posts` | moderation queue + audit |
| `create_project` | `write:projects` | creator profile + plan quota + audit |
| `submit_collaboration_intent` | `write:intents` | duplicate checks + audit |
| `request_team_join` | `write:teams` | membership checks + audit |
| `create_team_task` | `write:team:tasks` | team membership + RBAC + audit |

---

## What MCP still does NOT support (and why)

| Operation | Why Not in MCP |
|---|---|
| Delete post | Destructive — requires audit trail + role check |
| Create comment | Requires session + spam protection |
| Create team | Requires session + owner assignment |
| Delete team task | Destructive team action; keep in HTTP UI/API path |
| Billing mutations | Tied to checkout / webhook trust chain |

---

## Deferred write surface

The following writes remain intentionally out of scope until stronger abuse and
permission controls are needed:

| Deferred Tool | Reason |
|---|---|
| `create_comment` | spam / nesting / moderation risk |
| `delete_post` | destructive moderation-sensitive path |
| `delete_team_task` | destructive team workflow path |
| Billing or admin writes | must stay outside agent-facing MCP |

---

## Audit Notes

- The MCP manifest served at `/api/v1/mcp/v2/manifest` must stay aligned with
  `src/lib/mcp-v2-tools.ts`.
- Developer docs should position MCP as a developer tooling surface first, not
  an enterprise-led story.
- Any new write tool must ship with scopes, audit coverage, and quota / RBAC
  validation in the same change.
