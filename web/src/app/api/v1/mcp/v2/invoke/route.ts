import type { NextRequest } from "next/server";
import { z } from "zod";
import type { ApiKeyScope } from "@/lib/api-key-scopes";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { clientIp } from "@/lib/api-key-rate-limit";
import { apiError, apiSuccess } from "@/lib/response";
import {
  getEnterpriseWorkspaceSummary,
  getProjectBySlug,
  listCreators,
  listProjects,
  listTeams,
  logMcpInvoke,
} from "@/lib/repository";
import type { ProjectStatus } from "@/lib/types";

const bodySchema = z.object({
  tool: z.enum([
    "search_projects",
    "search_creators",
    "get_project_detail",
    "workspace_summary",
    "list_teams",
  ]),
  input: z.record(z.string(), z.unknown()).optional().default({}),
});

const TOOL_SCOPES: Record<z.infer<typeof bodySchema>["tool"], ApiKeyScope> = {
  search_projects: "read:projects:list",
  search_creators: "read:creators:list",
  get_project_detail: "read:projects:detail",
  workspace_summary: "read:enterprise:workspace",
  list_teams: "read:teams:list",
};

const PROJECT_STATUSES: readonly ProjectStatus[] = ["idea", "building", "launched", "paused"];

function parseStatus(raw: unknown): ProjectStatus | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  return PROJECT_STATUSES.includes(raw as ProjectStatus) ? (raw as ProjectStatus) : undefined;
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
    if (e instanceof z.ZodError) {
      httpStatus = 400;
      errorCode = "INVALID_BODY";
      await logMcpInvoke({
        tool: "parse_error",
        userId: "anonymous",
        httpStatus,
        clientIp: ip,
        userAgent: ua,
        errorCode,
        durationMs: Date.now() - started,
      });
      return apiError({ code: "INVALID_BODY", message: "Invalid MCP v2 invoke payload", details: e.flatten() }, 400);
    }
    httpStatus = 400;
    errorCode = "INVALID_JSON";
    await logMcpInvoke({
      tool: "parse_error",
      userId: "anonymous",
      httpStatus,
      clientIp: ip,
      userAgent: ua,
      errorCode,
      durationMs: Date.now() - started,
    });
    return apiError({ code: "INVALID_JSON", message: "Expected JSON body" }, 400);
  }

  const tool = parsed.tool;
  const { input } = parsed;
  const requiredScope = TOOL_SCOPES[tool];
  const auth = await authenticateRequest(request, requiredScope);
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    httpStatus = gate.status;
    errorCode = gate.status === 429 ? "RATE_LIMITED" : "UNAUTHORIZED";
    await logMcpInvoke({
      tool,
      userId: "anonymous",
      httpStatus,
      clientIp: ip,
      userAgent: ua,
      errorCode,
      durationMs: Date.now() - started,
    });
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError(
      {
        code: "UNAUTHORIZED",
        message: `Session or Bearer API key with scope ${requiredScope} required for tool ${tool}`,
      },
      401
    );
  }
  const session = gate.user!;
  userId = session.userId;
  const apiKeyId = session.apiKeyId;

  try {
    switch (tool) {
      case "search_projects": {
        const page = typeof input.page === "number" ? input.page : 1;
        const limit = typeof input.limit === "number" ? input.limit : 20;
        const status = parseStatus(input.status);
        if (typeof input.status === "string" && !status) {
          httpStatus = 400;
          errorCode = "INVALID_STATUS";
          await logMcpInvoke({
            tool,
            userId,
            apiKeyId,
            httpStatus,
            clientIp: ip,
            userAgent: ua,
            errorCode,
            durationMs: Date.now() - started,
          });
          return apiError(
            {
              code: "INVALID_STATUS",
              message: `status must be one of: ${PROJECT_STATUSES.join(", ")}`,
            },
            400
          );
        }
        const result = await listProjects({
          query: typeof input.query === "string" ? input.query : undefined,
          tag: typeof input.tag === "string" ? input.tag : undefined,
          tech: typeof input.tech === "string" ? input.tech : undefined,
          team: typeof input.team === "string" ? input.team : undefined,
          status,
          page,
          limit,
        });
        httpStatus = 200;
        await logMcpInvoke({
          tool,
          userId,
          apiKeyId,
          httpStatus,
          clientIp: ip,
          userAgent: ua,
          durationMs: Date.now() - started,
        });
        return apiSuccess({ tool, input, output: result });
      }
      case "search_creators": {
        const page = typeof input.page === "number" ? input.page : 1;
        const limit = typeof input.limit === "number" ? input.limit : 20;
        const result = await listCreators({
          query: typeof input.query === "string" ? input.query : undefined,
          page,
          limit,
        });
        httpStatus = 200;
        await logMcpInvoke({
          tool,
          userId,
          apiKeyId,
          httpStatus,
          clientIp: ip,
          userAgent: ua,
          durationMs: Date.now() - started,
        });
        return apiSuccess({ tool, input, output: result });
      }
      case "get_project_detail": {
        const slug = typeof input.slug === "string" ? input.slug.trim() : "";
        if (!slug) {
          httpStatus = 400;
          errorCode = "MISSING_SLUG";
          await logMcpInvoke({
            tool,
            userId,
            apiKeyId,
            httpStatus,
            clientIp: ip,
            userAgent: ua,
            errorCode,
            durationMs: Date.now() - started,
          });
          return apiError({ code: "MISSING_SLUG", message: "input.slug is required" }, 400);
        }
        const project = await getProjectBySlug(slug);
        if (!project) {
          httpStatus = 404;
          errorCode = "PROJECT_NOT_FOUND";
          await logMcpInvoke({
            tool,
            userId,
            apiKeyId,
            httpStatus,
            clientIp: ip,
            userAgent: ua,
            errorCode,
            durationMs: Date.now() - started,
          });
          return apiError({ code: "PROJECT_NOT_FOUND", message: `Project "${slug}" not found` }, 404);
        }
        httpStatus = 200;
        await logMcpInvoke({
          tool,
          userId,
          apiKeyId,
          httpStatus,
          clientIp: ip,
          userAgent: ua,
          durationMs: Date.now() - started,
        });
        return apiSuccess({ tool, input, output: project });
      }
      case "workspace_summary": {
        const summary = await getEnterpriseWorkspaceSummary({ viewerUserId: session.userId });
        httpStatus = 200;
        await logMcpInvoke({
          tool,
          userId,
          apiKeyId,
          httpStatus,
          clientIp: ip,
          userAgent: ua,
          durationMs: Date.now() - started,
        });
        return apiSuccess({ tool, input, output: summary });
      }
      case "list_teams": {
        const page = typeof input.page === "number" ? input.page : 1;
        const limit = typeof input.limit === "number" ? input.limit : 20;
        const result = await listTeams({ page, limit });
        httpStatus = 200;
        await logMcpInvoke({
          tool,
          userId,
          apiKeyId,
          httpStatus,
          clientIp: ip,
          userAgent: ua,
          durationMs: Date.now() - started,
        });
        return apiSuccess({ tool, input, output: result });
      }
      default: {
        httpStatus = 400;
        errorCode = "UNKNOWN_TOOL";
        await logMcpInvoke({
          tool,
          userId,
          apiKeyId,
          httpStatus,
          clientIp: ip,
          userAgent: ua,
          errorCode,
          durationMs: Date.now() - started,
        });
        return apiError({ code: "UNKNOWN_TOOL", message: "Unsupported tool" }, 400);
      }
    }
  } catch (error) {
    httpStatus = 500;
    errorCode = "MCP_V2_INVOKE_FAILED";
    await logMcpInvoke({
      tool,
      userId,
      apiKeyId,
      httpStatus,
      clientIp: ip,
      userAgent: ua,
      errorCode,
      durationMs: Date.now() - started,
    });
    return apiError(
      {
        code: "MCP_V2_INVOKE_FAILED",
        message: `MCP v2 tool ${tool} failed`,
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
