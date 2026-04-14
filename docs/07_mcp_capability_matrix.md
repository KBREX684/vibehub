# VibeHub — MCP v2 Capability Matrix v1.1

> Generated during remediation pass v1.1 (2026-04-13)

---

## Current Status: MCP v2 is a READ-ONLY Agent Data Layer

MCP v2 provides read access to VibeHub's community data for AI agents,
automations, and integrations. **No write operations are supported.**

This is an intentional design boundary:
- Write operations require user authentication and audit trails
- MCP tools are rate-limited by API key scopes
- Write MCP tools are planned for a future P2 release with full audit coverage

---

## Supported Read Tools

| Tool | Description | Auth Required | Rate Limit |
|---|---|---|---|
| `search_projects` | Full-text search across projects | API key (read:public) | ✅ |
| `get_project_detail` | Get project detail by slug | API key (read:projects:detail) | ✅ |
| `search_creators` | Search creator profiles | API key (read:public) | ✅ |
| `list_teams` | List all teams with pagination | API key (read:public) | ✅ |
| `workspace_summary` | Enterprise workspace summary | API key (read:enterprise) | ✅ |
| `search_posts` | Full-text search across discussions | API key (read:public) | ✅ |
| `get_post_detail` | Get post + comments by slug | API key (read:posts:detail) | ✅ |
| `list_challenges` | List active challenges/campaigns | API key (read:public) | ✅ |
| `get_talent_radar` | Top contributors by score | API key (read:enterprise) | ✅ |

---

## MCP v2 Endpoints

```
GET  /api/v1/mcp/v2/manifest   — Tool list + schema (public)
POST /api/v1/mcp/v2/invoke     — Invoke a read tool
```

All invocations are logged to `McpInvokeAudit` table.

---

## What MCP Does NOT Support (and Why)

| Operation | Why Not in MCP |
|---|---|
| Create post | Requires session auth, moderation queue |
| Delete post | Destructive — requires audit trail + role check |
| Create comment | Requires session + spam protection |
| Create team | Requires session + owner assignment |
| Submit collab intent | Requires session + duplicate check |
| Request team join | Requires session + team membership check |
| Create task | Requires team membership |

---

## Write Tool Roadmap (P2 — Not Yet Implemented)

The following write tools are **planned** for a future release. They are
NOT currently available and must not be documented as existing.

| Planned Tool | Prerequisites |
|---|---|
| `create_post` | Session-bound API key scope, spam filter, moderation |
| `create_comment` | Session-bound scope, rate limit, nesting guard |
| `create_project` | Session-bound scope, slug dedup |
| `submit_collaboration_intent` | Session-bound scope, duplicate check |
| `request_team_join` | Session-bound scope, membership check |
| `create_team_task` | Session-bound scope, team membership check |

**All write tools will require:**
1. Explicit scope (e.g. `write:posts`)
2. Per-user rate limiting (stricter than read)
3. Full `McpInvokeAudit` logging
4. Role and permission checks identical to the HTTP API
5. OpenAPI schema update before release

---

## Audit Notes

- The MCP manifest served at `/api/v1/mcp/v2/manifest` must not list
  write tools until they are fully implemented.
- The frontend MCP config page should clearly state "read-only agent layer".
- Any marketing or documentation claiming write support before P2 release
  is prohibited.
