import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { clientIp } from "@/lib/api-key-rate-limit";
import { apiError, apiSuccess } from "@/lib/response";
import {
  MCP_V2_TOOL_NAMES,
  type McpV2ToolName,
  MCP_V2_TOOL_SCOPES,
} from "@/lib/mcp-v2-tools";
import {
  getEnterpriseWorkspaceSummary,
  getPostBySlug,
  getProjectBySlug,
  getTalentRadar,
  listCollectionTopics,
  listCommentsForPost,
  listCreators,
  listPosts,
  listProjects,
  listTeams,
  logMcpInvoke,
} from "@/lib/repository";
import type { ProjectStatus } from "@/lib/types";

const bodySchema = z.object({
  tool: z.enum(MCP_V2_TOOL_NAMES),
  input: z.record(z.string(), z.unknown()).optional().default({}),
});

const PROJECT_STATUSES: readonly ProjectStatus[] = ["idea", "building", "launched", "paused"];

function parseStatus(raw: unknown): ProjectStatus | undefined {
  if (typeof raw !== "string") return undefined;
  return PROJECT_STATUSES.includes(raw as ProjectStatus) ? (raw as ProjectStatus) : undefined;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export async function POST(request: NextRequest) {
  const started = Date.now();
  let userId = "";
  let httpStatus = 500;
  let errorCode: string | null = null;
  const ua = request.headers.get("user-agent");
  const ip = clientIp(request);

  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    parsed = bodySchema.parse(json);
  } catch (e) {
    httpStatus = 400;
    errorCode = e instanceof z.ZodError ? "INVALID_BODY" : "INVALID_JSON";
    await logMcpInvoke({ tool: "parse_error", userId: "anonymous", httpStatus, clientIp: ip, userAgent: ua, errorCode, durationMs: Date.now() - started });
    if (e instanceof z.ZodError) return apiError({ code: "INVALID_BODY", message: "Invalid MCP v2 invoke payload", details: e.flatten() }, 400);
    return apiError({ code: "INVALID_JSON", message: "Expected JSON body" }, 400);
  }

  const { tool, input } = parsed;
  const requiredScope = MCP_V2_TOOL_SCOPES[tool as McpV2ToolName];
  const auth = await authenticateRequest(request, requiredScope);
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    httpStatus = gate.status;
    errorCode = gate.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED";
    await logMcpInvoke({ tool, userId: "anonymous", httpStatus, clientIp: ip, userAgent: ua, errorCode, durationMs: Date.now() - started });
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: `Session or Bearer API key with scope ${requiredScope} required for tool ${tool}` }, 401);
  }
  const session = gate.user!;
  userId = session.userId;
  const apiKeyId = session.apiKeyId;

  async function log(status: number, err?: string) {
    httpStatus = status;
    if (err) errorCode = err;
    await logMcpInvoke({ tool, userId, apiKeyId, httpStatus, clientIp: ip, userAgent: ua, errorCode: err ?? null, durationMs: Date.now() - started });
  }

  try {
    switch (tool) {
      case "search_projects": {
        const status = parseStatus(input.status);
        if (typeof input.status === "string" && !status) {
          await log(400, "INVALID_STATUS");
          return apiError({ code: "INVALID_STATUS", message: `status must be one of: ${PROJECT_STATUSES.join(", ")}` }, 400);
        }
        const result = await listProjects({ query: str(input.query), tag: str(input.tag), tech: str(input.tech), team: str(input.team), status, page: num(input.page, 1), limit: num(input.limit, 20) });
        await log(200);
        return apiSuccess({ tool, input, output: result });
      }

      case "search_creators": {
        const result = await listCreators({ query: str(input.query), page: num(input.page, 1), limit: num(input.limit, 20) });
        await log(200);
        return apiSuccess({ tool, input, output: result });
      }

      case "get_project_detail": {
        const slug = str(input.slug) ?? "";
        if (!slug) { await log(400, "MISSING_SLUG"); return apiError({ code: "MISSING_SLUG", message: "input.slug is required" }, 400); }
        const project = await getProjectBySlug(slug);
        if (!project) { await log(404, "PROJECT_NOT_FOUND"); return apiError({ code: "PROJECT_NOT_FOUND", message: `Project "${slug}" not found` }, 404); }
        await log(200);
        return apiSuccess({ tool, input, output: project });
      }

      case "workspace_summary": {
        const summary = await getEnterpriseWorkspaceSummary({ viewerUserId: session.userId });
        await log(200);
        return apiSuccess({ tool, input, output: summary });
      }

      case "list_teams": {
        const result = await listTeams({ page: num(input.page, 1), limit: num(input.limit, 20) });
        await log(200);
        return apiSuccess({ tool, input, output: result });
      }

      // ── A-2 new tools ──────────────────────────────────────────────────────

      case "search_posts": {
        const sort = input.sort === "popular" ? "popular" : "latest";
        let items = await listPosts({ query: str(input.query), tag: str(input.tag), page: num(input.page, 1), limit: num(input.limit, 20) });
        if (sort === "popular") {
          items = { ...items, items: [...items.items].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)) };
        }
        await log(200);
        return apiSuccess({ tool, input, output: items });
      }

      case "get_post_detail": {
        const slug = str(input.slug) ?? "";
        if (!slug) { await log(400, "MISSING_SLUG"); return apiError({ code: "MISSING_SLUG", message: "input.slug is required" }, 400); }
        const post = await getPostBySlug(slug);
        if (!post) { await log(404, "POST_NOT_FOUND"); return apiError({ code: "POST_NOT_FOUND", message: `Post "${slug}" not found` }, 404); }
        const postId = post.id;
        const { items: comments } = await listCommentsForPost(postId);
        await log(200);
        return apiSuccess({ tool, input, output: { post, comments } });
      }

      case "list_challenges": {
        // Challenges = collection topics tagged with 'challenge' in description/slug
        const topics = await listCollectionTopics();
        const challenges = topics.filter((t) => t.slug.includes("challenge") || t.description.toLowerCase().includes("challenge"));
        await log(200);
        return apiSuccess({ tool, input, output: { challenges } });
      }

      case "get_talent_radar": {
        const result = await getTalentRadar({
          skill: str(input.skill),
          collaborationPreference: str(input.collaborationPreference),
          page: num(input.page, 1),
          limit: num(input.limit, 20),
        });
        await log(200);
        return apiSuccess({ tool, input, output: result });
      }

      default: {
        await log(400, "UNKNOWN_TOOL");
        return apiError({ code: "UNKNOWN_TOOL", message: "Unsupported tool" }, 400);
      }
    }
  } catch (error) {
    await log(500, "MCP_V2_INVOKE_FAILED");
    return apiError({ code: "MCP_V2_INVOKE_FAILED", message: `MCP v2 tool ${tool} failed`, details: error instanceof Error ? error.message : String(error) }, 500);
  }
}
