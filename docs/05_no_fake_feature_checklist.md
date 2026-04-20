> ⛔ **已归档**（2026-04-19）：本文件代表 v11.0 之前的产品方向，**不再作为当前主线**。
> 当前主线见 `docs/v11.0-final-chapter-rfc.md`，主线索引 `docs/roadmap-current.md`。
> 本文件保留作为历史档案，新工作请勿基于本文件展开。

# VibeHub — No Fake Feature Checklist v1.1

> Audit completed during remediation pass v1.1 (2026-04-13)

---

## Audit Method

For each interactive element, confirm:
1. Does clicking / submitting trigger a real API call?
2. Does the API return data that updates the UI?
3. Are there loading / error / success / empty states?
4. Is the element gated by the correct role/auth?

---

## 1. CTAs & Buttons

| Element | Location | Real Action | Status |
|---|---|---|---|
| "Sign in" button | TopNav | → `/login` page | ✅ Fixed |
| "Get Started Free" | Home CTA | → `/login` | ✅ |
| "New Discussion" | Discussions page | → `/discussions/new` | ✅ Fixed |
| "Create Team" | Teams page | → `/teams/new` | ✅ Fixed |
| "Apply for Enterprise" | Enterprise gate page | → `/enterprise/verify` | ✅ |
| "Submit for Review" | New discussion form | `POST /api/v1/posts` | ✅ |
| "Post" comment button | Discussion detail | `POST /api/v1/posts/[slug]/comments` | ✅ Fixed |
| "Reply" button | Comment card | Expands real input → `POST` | ✅ Fixed |
| "Edit" comment | Comment card | `PATCH /api/v1/comments/[id]` | ✅ Fixed |
| "Delete" comment | Comment card | Confirm dialog → `DELETE` | ✅ Fixed |
| "Mark all read" | Notifications | `PATCH /api/v1/me/notifications` markAll | ✅ Fixed |
| Single mark read | Notification item | `PATCH /api/v1/me/notifications` ids | ✅ Fixed |
| "Apply to Join" | Project collab intent | `POST /api/v1/projects/[slug]/collaboration-intents` | ✅ |
| "Join" team | Team detail | `POST /api/v1/teams/[slug]/join` | ✅ |
| Send chat message | Team chat panel | WS → DB persist | ✅ Fixed |
| "Demo Login as Admin" | Login page | `GET /api/v1/auth/demo-login?role=admin` | ✅ dev-only |

---

## 2. Navigation & Links

| Entry | Target | Real Content | Status |
|---|---|---|---|
| `/admin` (TopNav user menu) | `/admin` | Admin console layout | ✅ Role-gated |
| `/workspace/enterprise` | Radar workspace | Gated by approved enterprise capability | ✅ Fixed |
| `/notifications` | Notifications page | Real DB items | ✅ |
| `/settings/api-keys` | API Keys panel | Real keys list | ✅ |
| `/discussions/new` | New discussion form | Connects to POST endpoint | ✅ Fixed |
| `/teams/new` | Create team form | Connects to POST endpoint | ✅ Fixed |
| `/login` | Login page (no bare API) | OAuth + demo | ✅ Fixed |

---

## 3. Tabs & Filters

| Element | Location | Real Effect | Status |
|---|---|---|---|
| Sort tabs (Recent/Hot/Featured) | Discussions list | Changes `sort` param → different data | ✅ |
| Query filter | Discover | URL param → `listProjects` filter | ✅ |
| Tag filter | Discover | URL param → `listProjects` tag filter | ✅ |
| Tech filter | Discover | URL param → `listProjects` tech filter | ✅ |
| Status filter | Discover | URL param → `listProjects` status filter | ✅ |
| Team filter | Discover | URL param → `listProjects` team filter | ✅ |
| Week navigation | Leaderboards | URL param → different weekly snapshot | ✅ |
| Unread filter | Notifications API | `?unread=1` param | ✅ |

---

## 4. Form Fields & Validation

| Form | Field | Validated | Error State | Status |
|---|---|---|---|---|
| New discussion | title (min 5, max 200) | Client + server | ✅ | ✅ |
| New discussion | body (min 10, max 50k) | Client + server | ✅ | ✅ |
| New discussion | tags (max 5, max 32 each) | Client | ✅ | ✅ |
| Comment input | body (min 2, max 2000) | Client + server | ✅ | ✅ |
| Chat input | body (max 2000 bytes) | Client + WS server | ✅ | ✅ |
| Join team | message | Server | ✅ | ✅ |
| Collab intent | message (min 10) | Server | ✅ | ✅ |

---

## 5. Permission Gating

| Protected Area | Guard Mechanism | Status |
|---|---|---|
| `/admin/**` | Middleware cookie check + `getAdminSessionForPage()` | ✅ Double-gated |
| `/admin/**` API | `requireAdminSession()` or `getAdminSessionForPage()` | ✅ |
| `/workspace/enterprise` | approved enterprise capability | ✅ Fixed |
| `/notifications` | Server redirect to `/login` | ✅ |
| `/discussions/new` | Server redirect to `/login` | ✅ |
| `/teams/new` | Server redirect to `/login` | ✅ |
| `/enterprise/verify` | Server redirect to `/login` | ✅ |
| Chat (WS) | Auth handshake required | ✅ |
| Chat (REST) | Session cookie or WS-server token | ✅ |

---

## 6. States Coverage

| Component | Loading | Empty | Error | Success | Permission Denied |
|---|---|---|---|---|---|
| CommentThread | ✅ (optimistic) | ✅ "No comments yet" | ✅ inline | ✅ | ✅ login required |
| NotificationsClient | ✅ transition | ✅ BellOff | ✅ rollback | ✅ | ✅ redirect |
| TeamChatPanel | ✅ connecting | ✅ "Say hello" | ✅ error bar | ✅ live | ✅ isMember guard |
| DiscussionNewForm | ✅ "Submitting…" | — | ✅ inline | ✅ redirect | ✅ SSR redirect |
| Discover page | — | ✅ "No projects match" | — | ✅ | — |
| Enterprise page | — | ✅ | — | ✅ | ✅ gating page |
| Admin pages | — | ✅ "Queue empty" | — | ✅ | ✅ layout redirect |

---

## 7. Previously Fake → Now Fixed

| Was Fake | Fixed In | Evidence |
|---|---|---|
| `AuthContext` always null user | C1 | `data.data.session` mapping |
| "Mark all read" no-op button | C5 | `PATCH /api/v1/me/notifications markAll:true` |
| Reply button on comment — visual only | D1 | Full `CommentInput` + `POST` |
| Edit/delete comment — no wiring | D1 | PATCH/DELETE + optimistic state |
| Enterprise/admin boundary was coupled | C3 | enterprise capability gate no longer treats admin as workspace access |
| Login button → raw API URL | C4 | `/login` page created |
| "New Discussion" → `href auth/github` | D3 | `/discussions/new` form page |
| Time-based comment auto cleanup | D2 | Default 0 (disabled); admin-only |
| WS messages only in memory | G3 | DB persistence on every message |
| Chat retention window | G2 | Default 30 days |

---

## 8. Known Remaining Items (Post v2 Polish)

| Feature | Status | Risk |
|---|---|---|
| `/projects/new` frontend form | P1 | Low — API exists |
| `/projects/[slug]/edit` | P1 | Low — PATCH API exists |
| `/teams/[slug]/settings` | P1 | Low — `updateTeamLinks` exists |
| Enterprise admin reviewer page (UI for review queue) | P2 | Low — REST endpoint live |
| Multi-team chat workspace page | P2 | Medium |
| MCP write tools (post/project/task create) | P3 | Must await risk controls |

## 9. V2 Polish Pass — Completed

| Item | Delivered |
|---|---|
| WebSocket auth token (server-signed) | ✅ |
| Chat 30-day retention uniformity | ✅ |
| OpenAPI/MCP alignment | ✅ |
| Enterprise verification full closed-loop | ✅ |
| Subscription page unified styling | ✅ |
| Admin collaboration queue unified styling | ✅ |
| Playwright 17-test E2E suite | ✅ |
| Project detail page: creator card, related projects, roadmap, MCP callout | ✅ |
| Discussion detail: sidebar, related posts, social actions, tags | ✅ |
| Home page: flywheel CTA section | ✅ |
| Contribution credit panel (API-connected, live score) | ✅ |
| Settings hub: credit panel + quick links | ✅ |
| Admin enterprise verification review endpoint | ✅ |
