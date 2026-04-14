import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, getSessionUserFromCookie, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { listProjects, createProject, countUserProjects, getUserTier } from "@/lib/repository";
import { checkProjectLimit } from "@/lib/subscription";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import type { ProjectStatus } from "@/lib/types";

const PROJECT_STATUSES: readonly ProjectStatus[] = ["idea", "building", "launched", "paused"];

function parseStatus(raw: string | null): ProjectStatus | undefined {
  if (!raw) {
    return undefined;
  }
  return PROJECT_STATUSES.includes(raw as ProjectStatus) ? (raw as ProjectStatus) : undefined;
}

const createProjectSchema = z.object({
  title: z.string().min(3).max(120),
  oneLiner: z.string().min(5).max(200),
  description: z.string().min(20),
  techStack: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  status: z.enum(["idea", "building", "launched", "paused"]).default("idea"),
  demoUrl: z.string().url().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:projects:list");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError(
      { code: "UNAUTHORIZED", message: "API key with read:projects:list required" },
      401
    );
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query")?.trim() || undefined;
    const tag = url.searchParams.get("tag")?.trim() || undefined;
    const tech = url.searchParams.get("tech")?.trim() || undefined;
    const team = url.searchParams.get("team")?.trim() || undefined;
    const creatorId = url.searchParams.get("creatorId")?.trim() || undefined;
    const rawStatus = url.searchParams.get("status");
    const status = parseStatus(rawStatus);
    if (rawStatus && !status) {
      return apiError(
        {
          code: "INVALID_STATUS",
          message: `status must be one of: ${PROJECT_STATUSES.join(", ")}`,
        },
        400
      );
    }

    const result = await listProjects({ query, tag, tech, status, team, creatorId, page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "PROJECTS_LIST_FAILED",
        message: "Failed to list projects",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const [tier, projectCount] = await Promise.all([getUserTier(session.userId), countUserProjects(session.userId)]);
    const gate = checkProjectLimit(tier, projectCount);
    if (!gate.allowed) {
      return apiError(
        {
          code: "PROJECT_LIMIT_REACHED",
          message: "You have reached the maximum number of projects for your plan.",
          details: { upgradeReason: gate.upgradeReason, currentTier: tier },
        },
        403
      );
    }

    const json = await request.json();
    const parsed = createProjectSchema.parse(json);
    const project = await createProject({
      ...parsed,
      creatorUserId: session.userId,
    });
    return apiSuccess(project, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(
        { code: "INVALID_BODY", message: "Invalid project payload", details: error.flatten() },
        400
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "CREATOR_PROFILE_REQUIRED") {
      return apiError(
        { code: "CREATOR_PROFILE_REQUIRED", message: "A creator profile is required to submit projects" },
        403
      );
    }
    return apiError(
      { code: "PROJECT_CREATE_FAILED", message: "Failed to create project", details: msg },
      500
    );
  }
}
