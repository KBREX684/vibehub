import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { allowApiKeyScope } from "@/lib/api-key-scopes";
import { hasApprovedEnterpriseAccess } from "@/lib/enterprise-access";
import { clientIp } from "@/lib/api-key-rate-limit";
import { assertContentSafeText } from "@/lib/content-safety";
import { checkMcpUserToolRateLimit } from "@/lib/mcp-user-write-rate-limit";
import { checkQuota } from "@/lib/quota";
import { apiError, apiSuccess } from "@/lib/response";
import { isRepositoryError } from "@/lib/repository-errors";
import {
  MCP_V2_TOOL_NAMES,
  type McpV2ToolName,
  MCP_V2_TOOL_SCOPES,
  isMcpWriteTool,
} from "@/lib/mcp-v2-tools";
import {
  countUserProjects,
  createPost,
  createProject,
  createTeamTask,
  getEnterpriseWorkspaceSummary,
  getPostBySlug,
  getProjectBySlug,
  getTalentRadar,
  getUserTier,
  listCollectionTopics,
  listCommentsForPost,
  listCreators,
  listPosts,
  listProjects,
  listTeams,
  logMcpInvoke,
  requestTeamJoin,
  submitCollaborationIntent,
  tryRegisterMcpInvokeIdempotency,
} from "@/lib/repository";
import type { CollaborationIntentType, ProjectStatus } from "@/lib/types";

const bodySchema = z.object({
  tool: z.enum(MCP_V2_TOOL_NAMES),
  input: z.record(z.string(), z.unknown()).optional().default({}),
  idempotencyKey: z.string().min(8).max(128).optional(),
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

function assertNeverTool(value: never): never {
  throw new Error(`Unhandled MCP tool: ${String(value)}`);
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

  const { tool, input, idempotencyKey } = parsed;
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

  const rlUser = checkMcpUserToolRateLimit(userId, tool);
  if (!rlUser.ok) {
    httpStatus = 429;
    errorCode = "MCP_USER_TOOL_RATE_LIMITED";
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
        code: "MCP_USER_TOOL_RATE_LIMITED",
        message: "Too many MCP invocations for this tool; slow down.",
        details: { retryAfterSeconds: rlUser.retryAfter },
      },
      429,
      { "Retry-After": String(rlUser.retryAfter) }
    );
  }

  if (idempotencyKey && isMcpWriteTool(tool as McpV2ToolName)) {
    const first = await tryRegisterMcpInvokeIdempotency({ userId, tool, key: idempotencyKey });
    if (!first) {
      httpStatus = 409;
      errorCode = "MCP_IDEMPOTENCY_CONFLICT";
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
          code: "MCP_IDEMPOTENCY_CONFLICT",
          message: "This idempotency key was already used for this tool.",
        },
        409
      );
    }
  }

  if (
    (tool === "workspace_summary" || tool === "get_talent_radar") &&
    !hasApprovedEnterpriseAccess({ role: session.role, enterpriseStatus: session.enterpriseStatus })
  ) {
    httpStatus = 403;
    errorCode = "ENTERPRISE_ACCESS_DENIED";
    await logMcpInvoke({ tool, userId, apiKeyId, httpStatus, clientIp: ip, userAgent: ua, errorCode, durationMs: Date.now() - started });
    return apiError(
      {
        code: "ENTERPRISE_ACCESS_DENIED",
        message: "Enterprise verification must be approved for this tool",
      },
      403
    );
  }

  if (isMcpWriteTool(tool as McpV2ToolName) && session.apiKeyScopes?.length) {
    const required = MCP_V2_TOOL_SCOPES[tool as McpV2ToolName];
    if (!allowApiKeyScope(session, required)) {
      httpStatus = 403;
      errorCode = "SCOPE_DENIED";
      await logMcpInvoke({ tool, userId, apiKeyId, httpStatus, clientIp: ip, userAgent: ua, errorCode, durationMs: Date.now() - started });
      return apiError({ code: "SCOPE_DENIED", message: `API key missing required scope: ${required}` }, 403);
    }
  }

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

      case "create_post": {
        const title = str(input.title) ?? "";
        const body = str(input.body) ?? "";
        const tags = Array.isArray(input.tags)
          ? input.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim())
          : [];
        if (title.length < 3 || body.length < 10) {
          await log(400, "INVALID_INPUT");
          return apiError({ code: "INVALID_INPUT", message: "title (min 3) and body (min 10) required" }, 400);
        }
        const post = await createPost({ title, body, tags, authorId: session.userId });
        await log(200);
        return apiSuccess({ tool, input, output: post });
      }

      case "create_project": {
        const title = str(input.title) ?? "";
        const oneLiner = str(input.oneLiner) ?? "";
        const description = str(input.description) ?? "";
        const techStack = Array.isArray(input.techStack)
          ? input.techStack.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim())
          : [];
        const tags = Array.isArray(input.tags)
          ? input.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim())
          : [];
        const status = parseStatus(input.status) ?? "idea";
        const demoUrl = typeof input.demoUrl === "string" && input.demoUrl.trim() ? str(input.demoUrl) : undefined;
        if (title.length < 3 || oneLiner.length < 5 || description.length < 20) {
          await log(400, "INVALID_INPUT");
          return apiError({ code: "INVALID_INPUT", message: "title, oneLiner, description validation failed" }, 400);
        }
        const tier = await getUserTier(session.userId);
        const n = await countUserProjects(session.userId);
        const q = checkQuota(tier, "projects", n);
        if (!q.allowed) {
          await log(402, "QUOTA_EXCEEDED");
          return apiError(
            {
              code: "QUOTA_EXCEEDED",
              message: "Project quota exceeded for your plan",
              details: { tier: q.tier, limit: q.limit, upgradeUrl: "/settings/subscription" },
            },
            402
          );
        }
        try {
          const project = await createProject({
            title,
            oneLiner,
            description,
            techStack,
            tags,
            status,
            demoUrl,
            creatorUserId: session.userId,
          });
          await log(200);
          return apiSuccess({ tool, input, output: project });
        } catch (e) {
          if (isRepositoryError(e) && e.code === "CREATOR_PROFILE_REQUIRED") {
            await log(403, e.code);
            return apiError({ code: "CREATOR_PROFILE_REQUIRED", message: e.message }, 403);
          }
          throw e;
        }
      }

      case "submit_collaboration_intent": {
        const projectSlug = str(input.projectSlug) ?? "";
        const intentType = str(input.intentType) as CollaborationIntentType | undefined;
        const message = str(input.message) ?? "";
        const contact = str(input.contact);
        if (!projectSlug || !message || (intentType !== "join" && intentType !== "recruit")) {
          await log(400, "INVALID_INPUT");
          return apiError({ code: "INVALID_INPUT", message: "projectSlug, intentType (join|recruit), message required" }, 400);
        }
        assertContentSafeText(message, "message");
        if (contact) assertContentSafeText(contact, "contact");
        const proj = await getProjectBySlug(projectSlug);
        if (!proj) {
          await log(404, "PROJECT_NOT_FOUND");
          return apiError({ code: "PROJECT_NOT_FOUND", message: `Project "${projectSlug}" not found` }, 404);
        }
        try {
          const intent = await submitCollaborationIntent({
            projectId: proj.id,
            applicantId: session.userId,
            intentType,
            message,
            contact,
          });
          await log(200);
          return apiSuccess({ tool, input, output: intent });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === "DUPLICATE_INTENT") {
            await log(409, "DUPLICATE_INTENT");
            return apiError({ code: "DUPLICATE_INTENT", message: "You already have a pending or approved intent for this project" }, 409);
          }
          if (isRepositoryError(e) && e.code === "CREATOR_PROFILE_REQUIRED") {
            await log(403, e.code);
            return apiError({ code: "CREATOR_PROFILE_REQUIRED", message: e.message }, 403);
          }
          throw e;
        }
      }

      case "request_team_join": {
        const teamSlug = str(input.teamSlug) ?? "";
        const message = str(input.message) ?? "";
        if (!teamSlug) {
          await log(400, "INVALID_INPUT");
          return apiError({ code: "INVALID_INPUT", message: "teamSlug required" }, 400);
        }
        if (message) assertContentSafeText(message, "message");
        try {
          const row = await requestTeamJoin({ teamSlug, userId: session.userId, message: message || undefined });
          await log(200);
          return apiSuccess({ tool, input, output: row });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === "TEAM_NOT_FOUND") {
            await log(404, "TEAM_NOT_FOUND");
            return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
          }
          if (msg === "USER_NOT_FOUND") {
            await log(404, "USER_NOT_FOUND");
            return apiError({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
          }
          if (
            msg === "TEAM_OWNER_NO_REQUEST" ||
            msg === "TEAM_ALREADY_MEMBER" ||
            msg === "TEAM_JOIN_REQUEST_PENDING" ||
            msg === "FORBIDDEN"
          ) {
            await log(403, msg);
            return apiError({ code: "FORBIDDEN", message: msg }, 403);
          }
          throw e;
        }
      }

      case "create_team_task": {
        const teamSlug = str(input.teamSlug) ?? "";
        const title = str(input.title) ?? "";
        if (!teamSlug || !title) {
          await log(400, "INVALID_INPUT");
          return apiError({ code: "INVALID_INPUT", message: "teamSlug and title required" }, 400);
        }
        const description = str(input.description);
        if (description) assertContentSafeText(description, "description");
        const st = str(input.status);
        const taskStatus = st === "doing" || st === "done" || st === "todo" ? st : undefined;
        const assigneeUserId = str(input.assigneeUserId);
        const milestoneId = str(input.milestoneId);
        try {
          const task = await createTeamTask({
            teamSlug,
            actorUserId: session.userId,
            title,
            description,
            status: taskStatus,
            assigneeUserId,
            milestoneId: milestoneId ?? undefined,
          });
          await log(200);
          return apiSuccess({ tool, input, output: task });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === "TEAM_NOT_FOUND") {
            await log(404, "TEAM_NOT_FOUND");
            return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
          }
          if (msg.includes("FORBIDDEN") || msg === "ASSIGNEE_NOT_TEAM_MEMBER") {
            await log(403, msg);
            return apiError({ code: "FORBIDDEN", message: msg }, 403);
          }
          throw e;
        }
      }

      default: {
        await log(400, "UNKNOWN_TOOL");
        return assertNeverTool(tool);
      }
    }
  } catch (error) {
    await log(500, "MCP_V2_INVOKE_FAILED");
    return apiError({ code: "MCP_V2_INVOKE_FAILED", message: `MCP v2 tool ${tool} failed`, details: error instanceof Error ? error.message : String(error) }, 500);
  }
}
