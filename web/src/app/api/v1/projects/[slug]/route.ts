import { z } from "zod";
import type { NextRequest } from "next/server";
import {
  authenticateRequest,
  getSessionUserFromCookie,
  rateLimitedResponse,
  resolveReadAuth,
} from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { apiErrorFromRepositoryMessage } from "@/lib/route-repository-message";
import { getProjectBySlug, updateProjectTeamLink, updateProject, deleteProject } from "@/lib/repository";

const patchSchema = z.object({
  teamSlug: z.union([z.string().min(1).max(48), z.null()]).optional(),
  title: z.string().min(3).max(120).optional(),
  oneLiner: z.string().min(5).max(200).optional(),
  description: z.string().min(20).optional(),
  readmeMarkdown: z.union([z.string().max(200_000), z.null()]).optional(),
  techStack: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  status: z.enum(["idea", "building", "launched", "paused"]).optional(),
  demoUrl: z.union([z.string().url(), z.null()]).optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:projects:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError(
      { code: "UNAUTHORIZED", message: "API key with read:projects:detail required" },
      401
    );
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return apiError(
      {
        code: "PROJECT_NOT_FOUND",
        message: `Project "${slug}" not found`,
      },
      404
    );
  }

  return apiSuccess(project);
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);

    if (parsed.teamSlug !== undefined) {
      const project = await updateProjectTeamLink({
        projectSlug: slug,
        actorUserId: session.userId,
        teamSlug: parsed.teamSlug,
      });
      return apiSuccess(project);
    }

    const { teamSlug: _, ...updateFields } = parsed;
    void _;
    if (Object.keys(updateFields).length === 0) {
      return apiError({ code: "INVALID_BODY", message: "At least one field to update is required" }, 400);
    }

    const project = await updateProject({
      projectSlug: slug,
      actorUserId: session.userId,
      ...updateFields,
    });
    return apiSuccess(project);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError(
        {
          code: "INVALID_BODY",
          message: "Invalid payload",
          details: error.flatten(),
        },
        400
      );
    }
    const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      {
        code: "PROJECT_UPDATE_FAILED",
        message: "Failed to update project",
      },
      500
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const { slug } = await params;
    await deleteProject({
      projectSlug: slug,
      actorUserId: session.userId,
      actorRole: session.role,
    });
    return apiSuccess({ deleted: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
const msg = error instanceof Error ? error.message : String(error);
    const mapped = apiErrorFromRepositoryMessage(msg);
    if (mapped) return mapped;
    return apiError(
      { code: "PROJECT_DELETE_FAILED", message: "Failed to delete project" },
      500
    );
  }
}