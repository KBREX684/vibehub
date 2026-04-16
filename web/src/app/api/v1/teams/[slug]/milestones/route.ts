import { z } from "zod";
import type { NextRequest } from "next/server";
import { authenticateRequest, getSessionUserFromCookie, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { createTeamMilestone, listTeamMilestones } from "@/lib/repository";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  targetDate: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:team:milestones");
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:team:milestones required" }, 401);
  }
  const session = gate.user!;

  try {
    const { slug } = await params;
    const milestones = await listTeamMilestones({ teamSlug: slug, viewerUserId: session.userId });
    return apiSuccess({ milestones });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }
    return apiError(
      {
        code: "TEAM_MILESTONES_LIST_FAILED",
        message: "Failed to list milestones",
      },
      500
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug } = await params;
    const json = await request.json();
    const parsed = createSchema.parse(json);
    const m = await createTeamMilestone({
      teamSlug: slug,
      actorUserId: session.userId,
      title: parsed.title,
      description: parsed.description,
      targetDate: parsed.targetDate,
      sortOrder: parsed.sortOrder,
    });
    return apiSuccess(m, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid milestone payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "TEAM_NOT_FOUND") {
      return apiError({ code: "TEAM_NOT_FOUND", message: "Team not found" }, 404);
    }
    if (msg === "FORBIDDEN_NOT_TEAM_MEMBER") {
      return apiError({ code: "FORBIDDEN", message: "Team members only" }, 403);
    }
    if (msg === "INVALID_MILESTONE_TITLE") {
      return apiError({ code: "INVALID_MILESTONE_TITLE", message: "Title is required" }, 400);
    }
    if (msg === "INVALID_MILESTONE_DATE") {
      return apiError({ code: "INVALID_MILESTONE_DATE", message: "targetDate must be a valid ISO date" }, 400);
    }
    return apiError(
      {
        code: "TEAM_MILESTONE_CREATE_FAILED",
        message: "Failed to create milestone",
      },
      500
    );
  }
}