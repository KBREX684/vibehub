import { NextResponse } from "next/server";

/** MCP v2: machine-readable tool registry (public; auth enforced per tool on invoke). */
export async function GET() {
  const body = {
    version: "2.0",
    protocol: "vibehub-mcp-http",
    invokeUrl: "/api/v1/mcp/v2/invoke",
    tools: [
      {
        name: "search_projects",
        description: "Search and paginate VibeHub projects. Filters: query, tag, tech, team, status.",
        method: "POST",
        requiredScope: "read:projects:list",
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
        method: "POST",
        requiredScope: "read:projects:detail",
        inputSchema: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string", description: "Project slug" } },
        },
      },
      {
        name: "search_creators",
        description: "Search VibeHub creator profiles.",
        method: "POST",
        requiredScope: "read:creators:list",
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
        method: "POST",
        requiredScope: "read:teams:list",
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
        method: "POST",
        requiredScope: "read:enterprise:workspace",
        inputSchema: { type: "object", properties: {} },
      },
      // A-2 new tools
      {
        name: "search_posts",
        description: "Search VibeHub discussion posts. Supports tag and full-text query filters.",
        method: "POST",
        requiredScope: "read:posts:list",
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
        method: "POST",
        requiredScope: "read:posts:detail",
        inputSchema: {
          type: "object",
          required: ["slug"],
          properties: { slug: { type: "string" } },
        },
      },
      {
        name: "list_challenges",
        description: "List currently active VibeHub challenges (collection topics with type=challenge).",
        method: "POST",
        requiredScope: "read:public",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_talent_radar",
        description: "Enterprise talent radar: creators filtered by skill, collaboration preference, and recent activity.",
        method: "POST",
        requiredScope: "read:enterprise:workspace",
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
    ],
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
