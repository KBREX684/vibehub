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
        description: "Search and paginate projects (filters: query, tag, tech, team, status).",
        method: "POST",
        requiredScope: "read:projects:list",
      },
      {
        name: "search_creators",
        description: "Search creator profiles.",
        method: "POST",
        requiredScope: "read:creators:list",
      },
      {
        name: "get_project_detail",
        description: "Fetch a single project by slug.",
        method: "POST",
        requiredScope: "read:projects:detail",
      },
      {
        name: "workspace_summary",
        description: "Enterprise-style summary: pending team join requests you own, collaboration funnel, your teams.",
        method: "POST",
        requiredScope: "read:enterprise:workspace",
      },
      {
        name: "list_teams",
        description: "Paginated public team directory.",
        method: "POST",
        requiredScope: "read:teams:list",
      },
    ],
  };
  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
