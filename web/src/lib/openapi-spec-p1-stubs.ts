/**
 * Minimal path entries to raise OpenAPI coverage toward P1 targets.
 * Full request/response schemas remain on critical paths in openapi-spec.ts;
 * these stubs document that the route exists for contract consumers.
 */
const envRef = { $ref: "#/components/schemas/ApiSuccessEnvelope" };
const errRef = { $ref: "#/components/schemas/ApiErrorEnvelope" };
const ok = { "200": { description: "Success", content: { "application/json": { schema: envRef } } }, "401": { description: "Unauthorized", content: { "application/json": { schema: errRef } } }, "500": { description: "Server error", content: { "application/json": { schema: errRef } } } } as const;
const okWrite = { ...ok, "400": { description: "Bad request", content: { "application/json": { schema: errRef } } } } as const;

export const P1_API_PATH_STUBS: Record<string, Record<string, unknown>> = {
  "/api/v1/auth/demo-login": {
    get: { tags: ["auth"], summary: "Demo login (non-production)", responses: ok },
  },
  "/api/v1/auth/github": {
    get: { tags: ["auth"], summary: "Start GitHub OAuth", responses: { "302": { description: "Redirect to GitHub" } } },
  },
  "/api/v1/auth/github/callback": {
    get: { tags: ["auth"], summary: "GitHub OAuth callback", responses: { "302": { description: "Redirect after OAuth" } } },
  },
  "/api/v1/auth/logout": {
    post: { tags: ["auth"], summary: "Logout (clear session cookie)", responses: ok },
  },
  "/api/v1/billing/checkout": {
    post: { tags: ["subscription"], summary: "支付宝结算会话", responses: okWrite },
  },
  "/api/v1/billing/portal": {
    post: { tags: ["subscription"], summary: "支付宝续费说明入口", responses: okWrite },
  },
  "/api/v1/billing/webhook": {
    post: { tags: ["subscription"], summary: "支付宝支付回调", responses: ok },
  },
  "/api/v1/collection-topics": {
    get: { tags: ["meta"], summary: "List collection topics", responses: ok },
  },
  "/api/v1/collection-topics/{slug}": {
    get: {
      tags: ["meta"],
      summary: "Collection topic payload",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
  },
  "/api/v1/creators": {
    get: { tags: ["creators"], summary: "List creators", responses: ok },
  },
  "/api/v1/creators/{slug}": {
    get: {
      tags: ["creators"],
      summary: "Creator profile",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
  },
  "/api/v1/leaderboards/discussions": {
    get: { tags: ["meta"], summary: "All-time discussion leaderboard", responses: ok },
  },
  "/api/v1/leaderboards/projects": {
    get: { tags: ["meta"], summary: "All-time project leaderboard", responses: ok },
  },
  "/api/v1/leaderboards/weekly/discussions": {
    get: { tags: ["meta"], summary: "Weekly discussion leaderboard", responses: ok },
  },
  "/api/v1/leaderboards/weekly/projects": {
    get: { tags: ["meta"], summary: "Weekly project leaderboard", responses: ok },
  },
  "/api/v1/me/bookmarks": {
    get: { tags: ["me"], summary: "My bookmarks", security: [{ SessionCookie: [] }], responses: ok },
  },
  "/api/v1/me/workspaces": {
    get: { tags: ["me"], summary: "List workspace console entries and badges", security: [{ SessionCookie: [] }], responses: ok },
  },
  "/api/v1/me/library": {
    get: { tags: ["me"], summary: "List work-library projects for the current user", security: [{ SessionCookie: [] }], responses: ok },
  },
  "/api/v1/me/intents": {
    get: { tags: ["me"], summary: "List collaboration inbox items for the current user", security: [{ SessionCookie: [] }], responses: ok },
  },
  "/api/v1/me/agent-tasks": {
    get: { tags: ["me"], summary: "List work-console agent tasks for the current user", security: [{ SessionCookie: [] }], responses: ok },
  },
  "/api/v1/me/feed": {
    get: { tags: ["me"], summary: "Personalized feed", security: [{ SessionCookie: [] }], responses: ok },
  },
  "/api/v1/me/profile": {
    get: { tags: ["me"], summary: "Current user creator profile", security: [{ SessionCookie: [] }], responses: ok },
    post: { tags: ["me"], summary: "Create creator profile", security: [{ SessionCookie: [] }], responses: ok },
    patch: { tags: ["me"], summary: "Update creator profile", security: [{ SessionCookie: [] }], responses: ok },
  },
  "/api/v1/metrics/collaboration-intent-funnel": {
    get: { tags: ["meta"], summary: "Collaboration intent funnel metrics", responses: ok },
  },
  "/api/v1/posts/{slug}/bookmark": {
    post: {
      tags: ["posts"],
      summary: "Bookmark post",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
    delete: {
      tags: ["posts"],
      summary: "Remove post bookmark",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
  },
  "/api/v1/posts/{slug}/comments": {
    get: {
      tags: ["posts"],
      summary: "List comments for post",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
    post: {
      tags: ["posts"],
      summary: "Create comment on post",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
  },
  "/api/v1/posts/{slug}/like": {
    post: {
      tags: ["posts"],
      summary: "Like post",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
    delete: {
      tags: ["posts"],
      summary: "Unlike post",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
  },
  "/api/v1/projects/{slug}/bookmark": {
    post: {
      tags: ["projects"],
      summary: "Bookmark project",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
    delete: {
      tags: ["projects"],
      summary: "Remove project bookmark",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
  },
  "/api/v1/projects/{slug}/collaboration-intents": {
    get: {
      tags: ["projects"],
      summary: "List collaboration intents for project",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
    post: {
      tags: ["projects"],
      summary: "Submit collaboration intent",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
  },
  "/api/v1/projects/{slug}/collaboration-intents/{intentId}/review": {
    post: {
      tags: ["projects"],
      summary: "Project owner reviews collaboration intent",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "intentId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/projects/{slug}/collaboration-intents/{intentId}/ignore": {
    post: {
      tags: ["projects"],
      summary: "Project owner ignores collaboration intent",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "intentId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/projects/{slug}/collaboration-intents/{intentId}/block-and-report": {
    post: {
      tags: ["projects"],
      summary: "Project owner blocks and reports collaboration intent",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "intentId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/projects/{slug}/github-stats": {
    get: {
      tags: ["projects"],
      summary: "GitHub repo stats (cached)",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
  },
  "/api/v1/projects/{slug}/metadata": {
    get: {
      tags: ["projects"],
      summary: "Machine-readable project metadata",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
  },
  "/api/v1/search": {
    get: { tags: ["meta"], summary: "Unified search", responses: ok },
  },
  "/api/v1/teams/{slug}/join": {
    post: {
      tags: ["teams"],
      summary: "Request to join team",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
  },
  "/api/v1/teams/{slug}/join-requests/{requestId}/review": {
    post: {
      tags: ["teams"],
      summary: "Owner approves or rejects join request",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "requestId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/teams/{slug}/links": {
    patch: {
      tags: ["teams"],
      summary: "Update team external links",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
  },
  "/api/v1/teams/{slug}/members": {
    get: {
      tags: ["teams"],
      summary: "List team members",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
    post: {
      tags: ["teams"],
      summary: "Add member by email (owner)",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
  },
  "/api/v1/teams/{slug}/members/{userId}": {
    delete: {
      tags: ["teams"],
      summary: "Remove member or self-leave",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "userId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: ok,
    },
  },
  "/api/v1/teams/{slug}/milestones/{milestoneId}": {
    patch: {
      tags: ["teams"],
      summary: "Update milestone",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "milestoneId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
    delete: {
      tags: ["teams"],
      summary: "Delete milestone (owner)",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "milestoneId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: ok,
    },
  },
  "/api/v1/teams/{slug}/tasks/{taskId}": {
    patch: {
      tags: ["teams"],
      summary: "Update team task",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
    delete: {
      tags: ["teams"],
      summary: "Delete team task",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: ok,
    },
  },
  "/api/v1/teams/{slug}/tasks/{taskId}/reorder": {
    post: {
      tags: ["teams"],
      summary: "Reorder task within column",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "taskId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/users/{slug}/follow": {
    post: {
      tags: ["me"],
      summary: "Follow user",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
    delete: {
      tags: ["me"],
      summary: "Unfollow user",
      parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
  },
  "/api/v1/workspaces/{workspaceId}/artifacts": {
    get: {
      tags: ["workspaces"],
      summary: "List artifacts for a workspace",
      security: [{ SessionCookie: [] }],
      parameters: [{ name: "workspaceId", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
    post: {
      tags: ["workspaces"],
      summary: "Request a workspace artifact upload",
      security: [{ SessionCookie: [] }],
      parameters: [{ name: "workspaceId", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
  },
  "/api/v1/workspaces/{workspaceId}/artifacts/{artifactId}": {
    delete: {
      tags: ["workspaces"],
      summary: "Delete a workspace artifact",
      security: [{ SessionCookie: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "artifactId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/workspaces/{workspaceId}/artifacts/{artifactId}/complete": {
    post: {
      tags: ["workspaces"],
      summary: "Mark a workspace artifact upload as complete",
      security: [{ SessionCookie: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "artifactId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/workspaces/{workspaceId}/artifacts/{artifactId}/download-url": {
    get: {
      tags: ["workspaces"],
      summary: "Get a workspace artifact download URL",
      security: [{ SessionCookie: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "artifactId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: ok,
    },
  },
  "/api/v1/workspaces/{workspaceId}/snapshots": {
    get: {
      tags: ["workspaces"],
      summary: "List snapshots for a workspace",
      security: [{ SessionCookie: [] }],
      parameters: [{ name: "workspaceId", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
    post: {
      tags: ["workspaces"],
      summary: "Create a snapshot for a workspace",
      security: [{ SessionCookie: [] }],
      parameters: [{ name: "workspaceId", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
  },
  "/api/v1/workspaces/{workspaceId}/snapshots/{snapshotId}": {
    get: {
      tags: ["workspaces"],
      summary: "Get a workspace snapshot",
      security: [{ SessionCookie: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "snapshotId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: ok,
    },
  },
  "/api/v1/workspaces/{workspaceId}/snapshots/{snapshotId}/rollback": {
    post: {
      tags: ["workspaces"],
      summary: "Create a rollback snapshot from an existing workspace snapshot",
      security: [{ SessionCookie: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "snapshotId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/workspaces/{workspaceId}/deliverables": {
    get: {
      tags: ["workspaces"],
      summary: "List deliverables for a workspace",
      security: [{ SessionCookie: [] }],
      parameters: [{ name: "workspaceId", in: "path", required: true, schema: { type: "string" } }],
      responses: ok,
    },
    post: {
      tags: ["workspaces"],
      summary: "Create a deliverable for a workspace",
      security: [{ SessionCookie: [] }],
      parameters: [{ name: "workspaceId", in: "path", required: true, schema: { type: "string" } }],
      responses: okWrite,
    },
  },
  "/api/v1/workspaces/{workspaceId}/deliverables/{deliverableId}/submit": {
    post: {
      tags: ["workspaces"],
      summary: "Submit a workspace deliverable",
      security: [{ SessionCookie: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "deliverableId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
  "/api/v1/workspaces/{workspaceId}/deliverables/{deliverableId}/review": {
    post: {
      tags: ["workspaces"],
      summary: "Review a workspace deliverable",
      security: [{ SessionCookie: [] }],
      parameters: [
        { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        { name: "deliverableId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: okWrite,
    },
  },
};
