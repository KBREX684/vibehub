import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import {
  createCollaborationIntent,
  getProjectBySlug,
  listProjectCollaborationIntents,
} from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";

const createCollaborationIntentSchema = z.object({
  intentType: z.enum(["join", "recruit"]),
  message: z.string().trim().min(10).max(500),
  contact: z.string().trim().min(3).max(120).optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: Params) {
  try {
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

    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const result = await listProjectCollaborationIntents({
      projectId: project.id,
      status: "approved",
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "COLLABORATION_INTENTS_LIST_FAILED",
        message: "Failed to load collaboration intents",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  const sessionUser = await getSessionUserFromCookie();
  if (!sessionUser) {
    return apiError(
      {
        code: "UNAUTHORIZED",
        message: "Login required",
      },
      401
    );
  }

  try {
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

    const body = await request.json();
    const parsed = createCollaborationIntentSchema.parse(body);

    const created = await createCollaborationIntent({
      projectId: project.id,
      applicantId: sessionUser.userId,
      intentType: parsed.intentType,
      message: parsed.message,
      contact: parsed.contact,
    });

    return apiSuccess(created, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === "PROJECT_NOT_FOUND") {
      return apiError(
        {
          code: "PROJECT_NOT_FOUND",
          message: "Project not found",
        },
        404
      );
    }

    return apiError(
      {
        code: "COLLABORATION_INTENT_CREATE_FAILED",
        message: "Failed to create collaboration intent",
        details: message,
      },
      400
    );
  }
}