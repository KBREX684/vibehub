> ⚠️ 已归档：本文件仅供历史参考，不得作为当前实现依据。当前主线请看 `docs/roadmap-current.md` 与 v11 系列文档。

# VibeHub — OpenAPI / Route Audit v1.1

> Audit completed during remediation pass v1.1 (2026-04-13)

---

## Audit Scope

Cross-reference every HTTP route in `web/src/app/api/v1/**` against
`web/src/lib/openapi-spec.ts` to detect:
- Document-only (no implementation)
- Implementation-only (undocumented)
- Parameter or response field drift

---

## 1. Route/Spec sync status (v2 refresh)

| Route | Method | Documented | Action |
|---|---|---|---|
| `/api/v1/posts/{slug}` | PATCH | ✅ | keep synced with route |
| `/api/v1/posts/{slug}` | DELETE | ✅ | keep synced with route |
| `/api/v1/teams/{slug}/chat/messages` | GET | ✅ | keep synced with route |
| `/api/v1/teams/{slug}/chat/messages` | POST | ✅ | keep synced with route |
| `/api/v1/teams/{slug}/chat/messages` | DELETE | ✅ | keep synced with route |
| `/api/v1/admin/cleanup` | POST | ✅ | keep synced with route |
| `/api/v1/me/enterprise/verification` | GET | ✅ | keep synced with route |
| `/api/v1/me/enterprise/verification` | POST | ✅ | keep synced with route |
| `/api/v1/admin/enterprise/verifications` | GET | ✅ | keep synced with route |
| `/api/v1/admin/enterprise/verifications` | PATCH | ✅ | keep synced with route |

---

## 2. Comment API — Dual-route clarification

Two comment endpoints exist:

| Route | Purpose | Auth | Status |
|---|---|---|---|
| `GET/POST /api/v1/comments` | Generic comment CRUD (integration/OpenAPI use) | Session | ✅ |
| `GET/POST /api/v1/posts/{slug}/comments` | **Primary frontend endpoint** | Session | ✅ |
| `PATCH/DELETE /api/v1/comments/{commentId}` | Edit / delete by ID | Session (author or admin) | ✅ |

**Decision (v1.1):** Frontend uses `/api/v1/posts/{slug}/comments` as primary.
`/api/v1/comments` remains for backward compat and API integrations.
Both endpoints are documented.

---

## 3. Post Routes Audit

| Route | Method | Implementation | Documented | Notes |
|---|---|---|---|---|
| `/api/v1/posts` | GET | ✅ | ✅ | |
| `/api/v1/posts` | POST | ✅ | ✅ | |
| `/api/v1/posts/featured` | GET | ✅ | ✅ | |
| `/api/v1/posts/{slug}` | GET | ✅ | ✅ | |
| `/api/v1/posts/{slug}` | PATCH | ✅ | ✅ | |
| `/api/v1/posts/{slug}` | DELETE | ✅ | ✅ | |
| `/api/v1/posts/{slug}/like` | POST | ✅ | ✅ | |
| `/api/v1/posts/{slug}/bookmark` | POST | ✅ | ✅ | |
| `/api/v1/posts/{slug}/comments` | GET | ✅ | ✅ | |
| `/api/v1/posts/{slug}/comments` | POST | ✅ | ✅ | |

---

## 4. Auth Routes Audit

| Route | Method | Implementation | Documented | Notes |
|---|---|---|---|---|
| `/api/v1/auth/github` | GET | ✅ | ⚠️ | Redirect, not typical JSON |
| `/api/v1/auth/github/callback` | GET | ✅ | ⚠️ | Redirect |
| `/api/v1/auth/session` | GET | ✅ | ✅ | Returns `{data:{session}}` |
| `/api/v1/auth/logout` | POST | ✅ | ✅ | |
| `/api/v1/auth/demo-login` | GET | ✅ | ❌ dev-only | Should be excluded from prod OpenAPI |

---

## 5. Teams Routes Audit

| Route | Implementation | Documented | Notes |
|---|---|---|---|
| `GET /api/v1/teams` | ✅ | ✅ | |
| `POST /api/v1/teams` | ✅ | ✅ | |
| `GET /api/v1/teams/{slug}` | ✅ | ✅ | |
| `POST /api/v1/teams/{slug}/join` | ✅ | ✅ | |
| `POST .../join-requests/{id}/review` | ✅ | ✅ | |
| `GET/POST /api/v1/teams/{slug}/tasks` | ✅ | ✅ | |
| `PATCH/DELETE .../tasks/{id}` | ✅ | ✅ | |
| `POST .../tasks/{id}/reorder` | ✅ | ✅ | |
| `GET/POST .../milestones` | ✅ | ✅ | |
| `PATCH/DELETE .../milestones/{id}` | ✅ | ✅ | |
| `GET/POST/DELETE .../chat/messages` | ✅ | ✅ | |
| `PATCH /api/v1/teams/{slug}/links` | ✅ | ✅ | |
| `GET .../activity-log` | ✅ | ✅ | |

---

## 6. Response Field Contracts (Critical)

### `GET /api/v1/auth/session`
```json
{
  "data": {
    "session": {
      "userId": "string",
      "role": "user|admin|guest",
      "name": "string"
    } | null
  }
}
```
**Fix applied (C1):** `AuthContext` now reads `json.data.session`.

### `GET /api/v1/me/notifications`
```json
{ "data": { "notifications": InAppNotification[] } }
```
`NotificationsClient` reads `json?.data?.notifications`.

### `GET /api/v1/teams/{slug}/chat/messages`
```json
{ "data": { "messages": TeamChatMessage[], "retainedSince": "ISO" } }
```
`TeamChatPanel` reads `json.data?.messages`.

---

## 7. Current residual risks / next checks

- [ ] Expand OpenAPI coverage for more implemented routes under `/api/v1/**` (spec still intentionally partial)
- [ ] Decide production policy for excluding `/api/v1/auth/demo-login` from published OpenAPI
- [ ] Keep MCP v2 invoke enum/scope mapping generated from shared source (`mcp-v2-tools.ts`)
- [ ] Run `npm run validate:openapi` in CI gate after any route/spec change
