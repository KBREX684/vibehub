# VibeHub — Frontend ↔ Backend Mapping v1.1

> Generated during remediation pass v1.1 (2026-04-13)

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ Complete | Route exists, tested, no known gaps |
| ⚠️ Partial | Exists but missing states / tests |
| ❌ Missing | Route, component, or test absent |

---

## A. Authentication & Session

| Page/Feature | API Route | Repo Function | Schema | Status | Test | Fake-Risk | OpenAPI |
|---|---|---|---|---|---|---|---|
| `/login` | `GET /api/v1/auth/github` | `encodeSession` | User | ✅ | ⚠️ E2E missing | No | ✅ |
| `/signup` | Same OAuth + identity fork | — | — | ✅ | ❌ | No | — |
| `/auth/error` | — | — | — | ✅ | ❌ | No | — |
| Session check | `GET /api/v1/auth/session` | `getSessionUserFromCookie` | — | ✅ Fixed C1 | ⚠️ | Was broken | ✅ |
| Logout | `POST /api/v1/auth/logout` | cookie clear | — | ✅ | ❌ E2E | No | ✅ |
| Demo login | `GET /api/v1/auth/demo-login` | mock | — | ✅ dev-only | ❌ | Low | ❌ doc |

**C1 fix:** `AuthContext` now reads `json.data.session` (not `json.data.user`).

---

## B. Projects & Discovery

| Page/Feature | API Route | Repo Function | Schema | Status | Test | Fake-Risk | OpenAPI |
|---|---|---|---|---|---|---|---|
| `/discover` | `GET /api/v1/projects` + facets | `listProjects`, `getProjectFilterFacets` | Project | ✅ | ✅ unit | No | ✅ |
| `/projects/[slug]` | `GET /api/v1/projects/[slug]` | `getProjectBySlug` | Project | ✅ | ✅ unit | No | ✅ |
| `/projects/new` | `POST /api/v1/projects` | `createProject` | Project | ⚠️ no frontend page | ❌ | Yes — P1 | ✅ |
| `/projects/[slug]/edit` | `PATCH /api/v1/projects/[slug]` (missing) | `updateProject` (missing) | — | ❌ P1 | ❌ | Yes | ❌ |
| Delete project | `DELETE /api/v1/projects/[slug]` (missing) | `deleteProject` (missing) | — | ❌ P1 | ❌ | Yes | ❌ |
| Bookmarks | `POST /api/v1/projects/[slug]/bookmark` | `toggleProjectBookmark` | ProjectBookmark | ✅ | ✅ | No | ✅ |
| Collab intent | `POST /api/v1/projects/[slug]/collaboration-intents` | `createCollaborationIntent` | CollaborationIntent | ✅ | ✅ | No | ✅ |
| Featured | `GET /api/v1/projects/featured` | `listFeaturedProjects` | Project | ✅ | ✅ | No | ✅ |

---

## C. Discussions & Comments

| Page/Feature | API Route | Repo Function | Schema | Status | Test | Fake-Risk | OpenAPI |
|---|---|---|---|---|---|---|---|
| `/discussions` | `GET /api/v1/posts` | `listPosts` | Post | ✅ | ✅ | No | ✅ |
| `/discussions/new` | `POST /api/v1/posts` | `createPost` | Post | ✅ **NEW** | ❌ E2E | No | ✅ |
| `/discussions/[slug]` | `GET /api/v1/posts/[slug]` | `getPostBySlug` | Post | ✅ | ✅ | No | ✅ |
| Edit post | `PATCH /api/v1/posts/[slug]` | `updatePost` **NEW** | Post | ✅ **NEW** | ❌ | No | ⚠️ needs doc |
| Delete post | `DELETE /api/v1/posts/[slug]` | `deletePost` **NEW** | Post | ✅ **NEW** | ❌ | No | ⚠️ needs doc |
| Comment list | `GET /api/v1/posts/[slug]/comments` | `listCommentsForPost` | Comment | ✅ | ✅ | No | ✅ |
| Add comment | `POST /api/v1/posts/[slug]/comments` | `createComment` | Comment | ✅ | ✅ | Was fake UI | ✅ |
| Edit comment | `PATCH /api/v1/comments/[id]` | `updateComment` | Comment | ✅ | ⚠️ | Was fake | ✅ |
| Delete comment | `DELETE /api/v1/comments/[id]` | `deleteComment` | Comment | ✅ | ⚠️ | Was fake | ✅ |
| Reply comment | `POST .../comments` with parentCommentId | `createComment` | Comment | ✅ | ⚠️ | Was fake | ✅ |
| Comment retention | Admin-only COMMENT_RETAIN_DAYS (default 0=disabled) | `pruneOldComments` | — | ✅ **Fixed D2** | ✅ | Was auto-delete | — |

---

## D. Teams

| Page/Feature | API Route | Repo Function | Schema | Status | Test | Fake-Risk | OpenAPI |
|---|---|---|---|---|---|---|---|
| `/teams` | `GET /api/v1/teams` | `listTeams` | TeamSummary | ✅ | ✅ | No | ✅ |
| `/teams/new` | `POST /api/v1/teams` | `createTeam` | Team | ✅ **NEW page** | ❌ E2E | No | ✅ |
| `/teams/[slug]` | `GET /api/v1/teams/[slug]` | `getTeamBySlug` | TeamDetail | ✅ | ✅ | No | ✅ |
| Join request | `POST /api/v1/teams/[slug]/join` | `createTeamJoinRequest` | TeamJoinRequest | ✅ | ✅ | No | ✅ |
| Approve/reject | `POST /api/v1/teams/[slug]/join-requests/[id]/review` | `reviewTeamJoinRequest` | TeamJoinRequest | ✅ | ✅ | No | ✅ |
| Members | `GET/DELETE /api/v1/teams/[slug]/members` | `listTeamMembers`, `removeTeamMember` | TeamMembership | ✅ | ✅ | No | ✅ |
| Tasks | `GET/POST /api/v1/teams/[slug]/tasks` | `listTeamTasks`, `createTeamTask` | TeamTask | ✅ | ✅ | No | ✅ |
| Milestones | `GET/POST /api/v1/teams/[slug]/milestones` | `listTeamMilestones`, `createTeamMilestone` | TeamMilestone | ✅ | ✅ | No | ✅ |
| Chat messages | `GET/POST /api/v1/teams/[slug]/chat/messages` | `listTeamChatMessages`, `createTeamChatMessage` | TeamChatMessage | ✅ | ✅ | No | ⚠️ needs doc |
| WS Chat | `ws://host:3001` | ws-server.ts + REST persistence | TeamChatMessage | ✅ **WS→DB** | ❌ E2E | No | — |
| Team settings | `/teams/[slug]/settings` | `updateTeamLinks` | Team | ❌ P1 | ❌ | Yes | ✅ |

---

## E. Admin

| Page/Feature | API Route | Repo Function | Schema | Status | Test | Fake-Risk | OpenAPI |
|---|---|---|---|---|---|---|---|
| `/admin` (layout + guard) | N/A | `getAdminSessionForPage` | — | ✅ **Isolated C2** | ❌ E2E | Was accessible | — |
| Admin overview | `GET /api/v1/admin/overview` | `getAdminOverview` | — | ✅ | ✅ | No | ✅ |
| User list | `GET /api/v1/admin/users` | `listUsers` | User | ✅ | ✅ | No | ✅ |
| Moderation | `GET /api/v1/admin/moderation/posts` | `listPostsForModeration` | Post | ✅ | ✅ | No | ✅ |
| Collaboration review | `POST /api/v1/admin/collaboration-intents/[id]/review` | `reviewCollaborationIntentAdmin` | CollaborationIntent | ✅ | ✅ | No | ✅ |
| Audit logs | `GET /api/v1/admin/audit-logs` | `listAuditLogs` | AuditLog | ✅ | ✅ | No | ✅ |
| Cleanup | `POST /api/v1/admin/cleanup` | `pruneOldComments`, `pruneOldTeamChatMessages` | — | ✅ **NEW** | ✅ | No | ❌ |

---

## F. Enterprise Radar Workspace

| Page/Feature | API Route | Repo Function | Schema | Status | Test | Fake-Risk | OpenAPI |
|---|---|---|---|---|---|---|---|
| `/workspace/enterprise` | `GET /api/v1/me/enterprise/workspace` + `GET /api/v1/me/enterprise/verification` | `getEnterpriseWorkspaceSummary` + `getEnterpriseProfileByUserId` | `EnterpriseProfile` | ✅ **Secondary workspace; approved-status gated** | ✅ E2E (gate) | No | ✅ |
| Project radar | `GET /api/v1/enterprise/project-radar` | `getProjectRadar` | ProjectRadarEntry | ✅ | ✅ | No | ✅ |
| Talent radar | `GET /api/v1/enterprise/talent-radar` | `getTalentRadarLegacy` | TalentRadarEntry | ✅ | ✅ | No | ✅ |
| `/enterprise/verify` | `GET/POST /api/v1/me/enterprise/verification` | `getEnterpriseProfileByUserId` + `submitEnterpriseVerification` | `EnterpriseProfile` | ✅ **Closed-loop P0** | ❌ | No | ✅ |
| Admin enterprise reviews | `GET/POST /api/v1/admin/enterprise/verifications` | `listEnterpriseProfiles` + `reviewEnterpriseVerification` | `EnterpriseProfile` | ✅ **P0 review flow** | ❌ | No | ✅ |

---

## G. Notifications

| Page/Feature | API Route | Repo Function | Schema | Status | Test | Fake-Risk | OpenAPI |
|---|---|---|---|---|---|---|---|
| `/notifications` | `GET /api/v1/me/notifications` | `listInAppNotifications` | InAppNotification | ✅ | ✅ | No | ✅ |
| Mark read (single/all) | `PATCH /api/v1/me/notifications` | `markInAppNotificationsRead` | InAppNotification | ✅ **Real C5** | ❌ E2E | Was fake button | ✅ |
| Unread badge (TopNav) | `GET /api/v1/me/notifications?unread=1` | `listInAppNotifications` | — | ✅ **Real C5** | ❌ | Was static dot | ✅ |

---

## H. MCP v2

| Tool | Route | Status | Write? | OpenAPI |
|---|---|---|---|---|
| `search_projects` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |
| `get_project_detail` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |
| `search_creators` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |
| `list_teams` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |
| `workspace_summary` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |
| `search_posts` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |
| `get_post_detail` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |
| `list_challenges` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |
| `get_talent_radar` | `POST /api/v1/mcp/v2/invoke` | ✅ | No | ✅ |

**MCP v2 now includes a small audited write surface.** Read tools remain the default integration path; write tools are limited to guarded actions such as `create_post`, `create_project`, `submit_collaboration_intent`, `request_team_join`, and `create_team_task`.
