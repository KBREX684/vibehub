import { NextResponse } from "next/server";
import { MCP_V2_TOOL_DEFINITIONS } from "@/lib/mcp-v2-tools";

/** MCP v2: machine-readable tool registry (public; auth enforced per tool on invoke). */
export async function GET() {
  const body = {
    version: "2.0",
    protocol: "vibehub-mcp-http",
    invokeUrl: "/api/v1/mcp/v2/invoke",
    tools: MCP_V2_TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      method: "POST",
      requiredScope: tool.requiredScope,
      inputSchema: tool.inputSchema,
    })),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
