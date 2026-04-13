import { z } from "zod";
import { getChallengeBySlug, updateChallenge, deleteChallenge } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";

const patchSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  description: z.string().min(10).optional(),
  rules: z.union([z.string(), z.null()]).optional(),
  tags: z.array(z.string().min(1)).optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const challenge = await getChallengeBySlug(slug);
    if (!challenge) {
      return apiError({ code: "CHALLENGE_NOT_FOUND", message: `Challenge "${slug}" not found` }, 404);
    }
    return apiSuccess(challenge);
  } catch (error) {
    return apiError(
      { code: "CHALLENGE_GET_FAILED", message: "Failed to get challenge", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { slug } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    if (Object.keys(parsed).length === 0) {
      return apiError({ code: "INVALID_BODY", message: "At least one field to update is required" }, 400);
    }
    const challenge = await updateChallenge({ challengeSlug: slug, ...parsed });
    return apiSuccess(challenge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "CHALLENGE_NOT_FOUND") {
      return apiError({ code: "CHALLENGE_NOT_FOUND", message: "Challenge not found" }, 404);
    }
    return apiError({ code: "CHALLENGE_UPDATE_FAILED", message: "Failed to update challenge", details: msg }, 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const { slug } = await params;
    await deleteChallenge(slug);
    return apiSuccess({ deleted: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "CHALLENGE_NOT_FOUND") {
      return apiError({ code: "CHALLENGE_NOT_FOUND", message: "Challenge not found" }, 404);
    }
    return apiError({ code: "CHALLENGE_DELETE_FAILED", message: "Failed to delete challenge", details: msg }, 500);
  }
}
