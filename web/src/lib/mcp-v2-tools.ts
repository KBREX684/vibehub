import type { ApiKeyScope } from "@/lib/api-key-scopes";

export const MCP_V2_TOOL_NAMES = [
  "search_projects",
  "search_creators",
  "get_project_detail",
  "workspace_summary",
  "list_teams",
  "search_posts",
  "get_post_detail",
  "list_challenges",
  "get_talent_radar",
  /** P3-1: write tools (Bearer scope + optional idempotencyKey on invoke body) */
  "create_post",
  "create_project",
  "submit_collaboration_intent",
  "request_team_join",
  "create_team_task",
] as const;

export type McpV2ToolName = (typeof MCP_V2_TOOL_NAMES)[number];

export const MCP_V2_WRITE_TOOLS: McpV2ToolName[] = [
  "create_post",
  "create_project",
  "submit_collaboration_intent",
  "request_team_join",
  "create_team_task",
];

export function isMcpWriteTool(tool: McpV2ToolName): boolean {
  return MCP_V2_WRITE_TOOLS.includes(tool);
}

export const MCP_V2_TOOL_SCOPES: Record<McpV2ToolName, ApiKeyScope> = {
  search_projects: "read:projects:list",
  search_creators: "read:creators:list",
  get_project_detail: "read:projects:detail",
  workspace_summary: "read:enterprise:workspace",
  list_teams: "read:teams:list",
  search_posts: "read:posts:list",
  get_post_detail: "read:posts:detail",
  list_challenges: "read:public",
  get_talent_radar: "read:enterprise:workspace",
  create_post: "write:posts",
  create_project: "write:projects",
  submit_collaboration_intent: "write:intents",
  request_team_join: "write:teams",
  create_team_task: "write:team:tasks",
};

export const MCP_V2_TOOL_DEFINITIONS: Array<{
  name: McpV2ToolName;
  description: string;
  requiredScope: ApiKeyScope;
  inputSchema: Record<string, unknown>;
}> = [
  {
    name: "search_projects",
    description: "Search and paginate VibeHub projects. Filters: query, tag, tech, team, status.",
    requiredScope: MCP_V2_TOOL_SCOPES.search_projects,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Full-text search query" },
        tag: { type: "string", description: "Filter by tag" },
        tech: { type: "string", description: "Filter by tech stack item" },
        team: { type: "string", description: "Filter by team slug" },
        status: { type: "string", enum: ["idea", "building", "launched", "paused"] },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20, maximum: 100 },
      },
    },
  },
  {
    name: "get_project_detail",
    description: "Fetch full details of a single VibeHub project by slug.",
    requiredScope: MCP_V2_TOOL_SCOPES.get_project_detail,
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string", description: "Project slug" } },
    },
  },
  {
    name: "search_creators",
    description: "Search VibeHub creator profiles.",
    requiredScope: MCP_V2_TOOL_SCOPES.search_creators,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "list_teams",
    description: "Paginated public VibeHub team directory.",
    requiredScope: MCP_V2_TOOL_SCOPES.list_teams,
    inputSchema: {
      type: "object",
      properties: {
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "workspace_summary",
    description: "Enterprise workspace summary: pending join requests, collaboration funnel, your teams.",
    requiredScope: MCP_V2_TOOL_SCOPES.workspace_summary,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_posts",
    description: "Search VibeHub discussion posts. Supports tag and full-text query filters.",
    requiredScope: MCP_V2_TOOL_SCOPES.search_posts,
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Full-text search query" },
        tag: { type: "string", description: "Filter by tag" },
        sort: { type: "string", enum: ["latest", "popular"], default: "latest" },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "get_post_detail",
    description: "Fetch a single VibeHub discussion post by slug, including top-level comments with nested replies.",
    requiredScope: MCP_V2_TOOL_SCOPES.get_post_detail,
    inputSchema: {
      type: "object",
      required: ["slug"],
      properties: { slug: { type: "string" } },
    },
  },
  {
    name: "list_challenges",
    description: "List currently active VibeHub challenges (collection topics with type=challenge).",
    requiredScope: MCP_V2_TOOL_SCOPES.list_challenges,
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_talent_radar",
    description: "Enterprise talent radar: creators filtered by skill, collaboration preference, and recent activity.",
    requiredScope: MCP_V2_TOOL_SCOPES.get_talent_radar,
    inputSchema: {
      type: "object",
      properties: {
        skill: { type: "string", description: "Filter by skill keyword" },
        collaborationPreference: { type: "string", enum: ["open", "invite_only", "closed"] },
        page: { type: "number", default: 1 },
        limit: { type: "number", default: 20 },
      },
    },
  },
  {
    name: "create_post",
    description: "Create a discussion post (pending moderation). Requires write:posts.",
    requiredScope: MCP_V2_TOOL_SCOPES.create_post,
    inputSchema: {
      type: "object",
      required: ["title", "body"],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 120 },
        body: { type: "string", minLength: 10 },
        tags: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "create_project",
    description: "Create a project for the authenticated user (creator profile required). Requires write:projects.",
    requiredScope: MCP_V2_TOOL_SCOPES.create_project,
    inputSchema: {
      type: "object",
      required: ["title", "oneLiner", "description"],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 120 },
        oneLiner: { type: "string", minLength: 5, maxLength: 200 },
        description: { type: "string", minLength: 20 },
        techStack: { type: "array", items: { type: "string" } },
        tags: { type: "array", items: { type: "string" } },
        status: { type: "string", enum: ["idea", "building", "launched", "paused"] },
        demoUrl: { type: "string" },
      },
    },
  },
  {
    name: "submit_collaboration_intent",
    description: "Submit a collaboration intent on a project (by project slug). Requires write:intents.",
    requiredScope: MCP_V2_TOOL_SCOPES.submit_collaboration_intent,
    inputSchema: {
      type: "object",
      required: ["projectSlug", "intentType", "message"],
      properties: {
        projectSlug: { type: "string" },
        intentType: { type: "string", enum: ["join", "recruit"] },
        message: { type: "string", minLength: 1 },
        contact: { type: "string" },
      },
    },
  },
  {
    name: "request_team_join",
    description: "Request to join a team by slug. Requires write:teams.",
    requiredScope: MCP_V2_TOOL_SCOPES.request_team_join,
    inputSchema: {
      type: "object",
      required: ["teamSlug"],
      properties: {
        teamSlug: { type: "string" },
        message: { type: "string", maxLength: 500 },
      },
    },
  },
  {
    name: "create_team_task",
    description: "Create a task in a team you belong to. Requires write:team:tasks.",
    requiredScope: MCP_V2_TOOL_SCOPES.create_team_task,
    inputSchema: {
      type: "object",
      required: ["teamSlug", "title"],
      properties: {
        teamSlug: { type: "string" },
        title: { type: "string", minLength: 1, maxLength: 200 },
        description: { type: "string", maxLength: 2000 },
        status: { type: "string", enum: ["todo", "doing", "done"] },
        assigneeUserId: { type: "string" },
        milestoneId: { type: "string" },
      },
    },
  },
];
