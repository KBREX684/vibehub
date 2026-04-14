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

## 1. New Routes Added in v1.1 (Need OpenAPI doc update)

| Route | Method | Documented | Action |
|---|---|---|---|
| `/api/v1/posts/{slug}` | PATCH | ❌ | Add to spec |
| `/api/v1/posts/{slug}` | DELETE | ❌ | Add to spec |
| `/api/v1/teams/{slug}/chat/messages` | GET | ❌ | Add to spec |
| `/api/v1/teams/{slug}/chat/messages` | POST | ❌ | Add to spec |
| `/api/v1/teams/{slug}/chat/messages` | DELETE | ❌ | Add to spec |
| `/api/v1/admin/cleanup` | POST | ❌ | Add to spec |

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
| `/api/v1/posts/{slug}` | PATCH | ✅ **NEW** | ❌ | Add to spec |
| `/api/v1/posts/{slug}` | DELETE | ✅ **NEW** | ❌ | Add to spec |
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
| `GET/POST/DELETE .../chat/messages` | ✅ **NEW** | ❌ | Add to spec |
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

## 7. Action Items (for next sprint)

- [ ] Add PATCH/DELETE `/api/v1/posts/{slug}` to `openapi-spec.ts`
- [ ] Add GET/POST/DELETE `/api/v1/teams/{slug}/chat/messages` to spec
- [ ] Add POST `/api/v1/admin/cleanup` to spec
- [ ] Exclude `/api/v1/auth/demo-login` from production OpenAPI
- [ ] Run `npm run validate:openapi` after spec updates
