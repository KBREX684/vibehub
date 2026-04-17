import type { ApiKeyScope } from "@/lib/api-key-scopes";

export type McpV2CapabilityGroup = "discovery" | "projects" | "posts" | "teams" | "enterprise";

export const MCP_V2_MANIFEST_VERSION = "2.1.0";
export const MCP_V2_PROTOCOL_VERSION = "2024-11-05";

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
  "create_post",
  "create_project",
  "submit_collaboration_intent",
  "request_team_join",
  "create_team_task",
  "list_team_tasks",
  "list_team_milestones",
  "agent_complete_team_task",
  "agent_submit_task_review",
  "request_team_task_delete",
  "request_team_member_role_change",
] as const;

export type McpV2ToolName = (typeof MCP_V2_TOOL_NAMES)[number];

export interface McpV2ToolDefinition {
  name: McpV2ToolName;
  description: string;
  requiredScope: ApiKeyScope;
  inputSchema: Record<string, unknown>;
  exampleInput: Record<string, unknown>;
  capabilityGroup: McpV2CapabilityGroup;
  writeTool: boolean;
}

export const MCP_V2_WRITE_TOOLS: McpV2ToolName[] = [
  "create_post",
  "create_project",
  "submit_collaboration_intent",
  "request_team_join",
  "create_team_task",
  "agent_complete_team_task",
  "agent_submit_task_review",
  "request_team_task_delete",
  "request_team_member_role_change",
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
  get_talent_radar: "read:public",
  create_post: "write:posts",
  create_project: "write:projects",
  submit_collaboration_intent: "write:intents",
  request_team_join: "write:teams",
  create_team_task: "write:team:tasks",
  list_team_tasks: "read:team:tasks",
  list_team_milestones: "read:team:milestones",
  agent_complete_team_task: "write:team:tasks",
  agent_submit_task_review: "write:team:tasks",
  request_team_task_delete: "write:team:tasks",
  request_team_member_role_change: "write:teams",
};

export const MCP_V2_TOOL_DEFINITIONS: McpV2ToolDefinition[] = [
  {
    name: "search_projects",
    description: "Search and paginate VibeHub projects. Filters: query, tag, tech, team, status.",
    requiredScope: MCP_V2_TOOL_SCOPES.search_projects,
    capabilityGroup: "projects",
    writeTool: false,
    exampleInput: { query: "agent", tag: "ai", page: 1, limit: 10 },
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
    capabilityGroup: "projects",
    writeTool: false,
    exampleInput: { slug: "vibehub" },
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
    capabilityGroup: "discovery",
    writeTool: false,
    exampleInput: { query: "full-stack", page: 1, limit: 10 },
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
    capabilityGroup: "teams",
    writeTool: false,
    exampleInput: { page: 1, limit: 20 },
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
    description: "Enterprise verification compatibility summary: pending join requests, collaboration funnel, your teams.",
    requiredScope: MCP_V2_TOOL_SCOPES.workspace_summary,
    capabilityGroup: "enterprise",
    writeTool: false,
    exampleInput: {},
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "search_posts",
    description: "Search VibeHub discussion posts. Supports tag and full-text query filters.",
    requiredScope: MCP_V2_TOOL_SCOPES.search_posts,
    capabilityGroup: "posts",
    writeTool: false,
    exampleInput: { query: "multi-agent", sort: "latest", page: 1, limit: 10 },
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
    capabilityGroup: "posts",
    writeTool: false,
    exampleInput: { slug: "ship-your-agent-stack" },
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
    capabilityGroup: "discovery",
    writeTool: false,
    exampleInput: {},
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_talent_radar",
    description:
      "Talent radar: creators filtered by skill, collaboration preference, and recent activity. Requires read:public.",
    requiredScope: MCP_V2_TOOL_SCOPES.get_talent_radar,
    capabilityGroup: "discovery",
    writeTool: false,
    exampleInput: { skill: "next.js", collaborationPreference: "open", page: 1, limit: 20 },
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
    description:
      "Create a discussion post as the key owner (pending moderation). Requires write:posts (or write:mcp:v2:posts alias).",
    requiredScope: MCP_V2_TOOL_SCOPES.create_post,
    capabilityGroup: "posts",
    writeTool: true,
    exampleInput: { title: "Ship notes", body: "We opened beta access today.", tags: ["launch"] },
    inputSchema: {
      type: "object",
      required: ["title", "body"],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 120 },
        body: { type: "string", minLength: 10 },
        tags: { type: "array", items: { type: "string", minLength: 1 }, default: [] },
      },
    },
  },
  {
    name: "create_project",
    description:
      "Create a project for the authenticated user (creator profile required). Requires write:projects (or write:mcp:v2:projects alias). Subject to plan quotas.",
    requiredScope: MCP_V2_TOOL_SCOPES.create_project,
    capabilityGroup: "projects",
    writeTool: true,
    exampleInput: {
      title: "VibeHub Agents",
      oneLiner: "Agent-native collaboration board for small teams",
      description: "Ship team workflows, MCP hooks, and audited automation in one place.",
      techStack: ["Next.js", "Prisma"],
      tags: ["agent", "collaboration"],
      status: "building",
    },
    inputSchema: {
      type: "object",
      required: ["title", "oneLiner", "description"],
      properties: {
        title: { type: "string", minLength: 3, maxLength: 120 },
        oneLiner: { type: "string", minLength: 5, maxLength: 200 },
        description: { type: "string", minLength: 20 },
        techStack: { type: "array", items: { type: "string", minLength: 1 }, default: [] },
        tags: { type: "array", items: { type: "string", minLength: 1 }, default: [] },
        status: { type: "string", enum: ["idea", "building", "launched", "paused"], default: "idea" },
        demoUrl: { type: "string", description: "Optional absolute URL" },
      },
    },
  },
  {
    name: "submit_collaboration_intent",
    description: "Submit a collaboration intent on a project (by project slug). Requires write:intents.",
    requiredScope: MCP_V2_TOOL_SCOPES.submit_collaboration_intent,
    capabilityGroup: "projects",
    writeTool: true,
    exampleInput: {
      projectSlug: "vibehub",
      intentType: "join",
      message: "I can help with frontend polish and QA.",
    },
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
    capabilityGroup: "teams",
    writeTool: true,
    exampleInput: { teamSlug: "vibehub-core", message: "I want to help on docs and onboarding." },
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
    capabilityGroup: "teams",
    writeTool: true,
    exampleInput: { teamSlug: "vibehub-core", title: "Write release notes", status: "todo" },
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
  {
    name: "list_team_tasks",
    description: "List tasks for a team you belong to. Requires read:team:tasks.",
    requiredScope: MCP_V2_TOOL_SCOPES.list_team_tasks,
    capabilityGroup: "teams",
    writeTool: false,
    exampleInput: { teamSlug: "vibehub-core" },
    inputSchema: {
      type: "object",
      required: ["teamSlug"],
      properties: {
        teamSlug: { type: "string" },
      },
    },
  },
  {
    name: "list_team_milestones",
    description: "List milestones for a team you belong to. Requires read:team:milestones.",
    requiredScope: MCP_V2_TOOL_SCOPES.list_team_milestones,
    capabilityGroup: "teams",
    writeTool: false,
    exampleInput: { teamSlug: "vibehub-core" },
    inputSchema: {
      type: "object",
      required: ["teamSlug"],
      properties: {
        teamSlug: { type: "string" },
      },
    },
  },
  {
    name: "agent_complete_team_task",
    description: "Mark an assigned team task as ready for review. Requires write:team:tasks on an agent-bound key.",
    requiredScope: MCP_V2_TOOL_SCOPES.agent_complete_team_task,
    capabilityGroup: "teams",
    writeTool: true,
    exampleInput: { teamSlug: "vibehub-core", taskId: "tt_prompt_review" },
    inputSchema: {
      type: "object",
      required: ["teamSlug", "taskId"],
      properties: {
        teamSlug: { type: "string" },
        taskId: { type: "string" },
      },
    },
  },
  {
    name: "agent_submit_task_review",
    description: "Submit an agent review opinion for a task in review. Final approval or rejection still requires human confirmation.",
    requiredScope: MCP_V2_TOOL_SCOPES.agent_submit_task_review,
    capabilityGroup: "teams",
    writeTool: true,
    exampleInput: { teamSlug: "vibehub-core", taskId: "tt_prompt_review", decision: "approve", reviewNote: "Checks passed." },
    inputSchema: {
      type: "object",
      required: ["teamSlug", "taskId", "decision"],
      properties: {
        teamSlug: { type: "string" },
        taskId: { type: "string" },
        decision: { type: "string", enum: ["approve", "reject"] },
        reviewNote: { type: "string", maxLength: 1000 },
      },
    },
  },
  {
    name: "request_team_task_delete",
    description: "Request deletion of a team task. This always creates a human confirmation request.",
    requiredScope: MCP_V2_TOOL_SCOPES.request_team_task_delete,
    capabilityGroup: "teams",
    writeTool: true,
    exampleInput: { teamSlug: "vibehub-core", taskId: "tt_prompt_review", reason: "Duplicate task." },
    inputSchema: {
      type: "object",
      required: ["teamSlug", "taskId"],
      properties: {
        teamSlug: { type: "string" },
        taskId: { type: "string" },
        reason: { type: "string", maxLength: 500 },
      },
    },
  },
  {
    name: "request_team_member_role_change",
    description: "Request a team member role change. This always creates a human confirmation request.",
    requiredScope: MCP_V2_TOOL_SCOPES.request_team_member_role_change,
    capabilityGroup: "teams",
    writeTool: true,
    exampleInput: { teamSlug: "vibehub-core", memberUserId: "u2", role: "reviewer", reason: "Owns QA review now." },
    inputSchema: {
      type: "object",
      required: ["teamSlug", "memberUserId", "role"],
      properties: {
        teamSlug: { type: "string" },
        memberUserId: { type: "string" },
        role: { type: "string", enum: ["admin", "member", "reviewer"] },
        reason: { type: "string", maxLength: 500 },
      },
    },
  },
];

export function buildMcpV2Manifest(invokeUrl = "/api/v1/mcp/v2/invoke") {
  return {
    version: "2.0",
    protocol: "vibehub-mcp-http",
    manifestVersion: MCP_V2_MANIFEST_VERSION,
    protocolVersion: MCP_V2_PROTOCOL_VERSION,
    generatedAt: new Date().toISOString(),
    invokeUrl,
    tools: MCP_V2_TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      method: "POST",
      requiredScope: tool.requiredScope,
      inputSchema: tool.inputSchema,
      exampleInput: tool.exampleInput,
      capabilityGroup: tool.capabilityGroup,
      writeTool: tool.writeTool,
    })),
  };
}
