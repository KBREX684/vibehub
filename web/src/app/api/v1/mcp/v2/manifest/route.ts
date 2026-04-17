import { NextResponse } from "next/server";
import { buildMcpV2Manifest } from "@/lib/mcp-v2-tools";

/** MCP v2: machine-readable tool registry (public; auth enforced per tool on invoke). */
export async function GET() {
  const body = buildMcpV2Manifest();

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
