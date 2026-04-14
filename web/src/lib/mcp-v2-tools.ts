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
] as const;

export type McpV2ToolName = (typeof MCP_V2_TOOL_NAMES)[number];

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
];
