import type { NextRequest } from "next/server";
import { z } from "zod";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import {
  getProjectBySlug,
  listProjectCollaborationIntents,
  submitCollaborationIntent,
  getCreatorProfileByUserId,
} from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { isRepositoryError } from "@/lib/repository-errors";
import type { CollaborationIntentStatus } from "@/lib/types";
import {
  deprecatedResponse,
  isV11BackendLockdownEnabled,
  withDeprecatedHeaders,
} from "@/lib/v11-deprecation";

interface Props { params: Promise<{ slug: string }> }

const VALID_STATUSES: (CollaborationIntentStatus | "all")[] = [
  "pending",
  "approved",
  "rejected",
  "ignored",
  "blocked",
  "expired",
  "all",
];

export async function GET(request: NextRequest, { params }: Props) {
  const auth = await authenticateRequest(request);
  const gate = resolveReadAuth(auth, false);
  if (!gate.ok) {
    if (gate.status === 429) return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);

  // Only approved intents for public; owner sees all
  const creatorProfile = await getCreatorProfileByUserId(gate.user!.userId);
  const isOwner = creatorProfile?.id === project.creatorId;

  const url = new URL(request.url);
  const { page, limit } = parsePagination(url.searchParams);
  const rawStatus = url.searchParams.get("status") ?? (isOwner ? "all" : "approved");
  const status = VALID_STATUSES.includes(rawStatus as CollaborationIntentStatus | "all")
    ? (rawStatus as CollaborationIntentStatus | "all")
    : "approved";

  if (!isOwner && status !== "approved") {
    return apiError({ code: "FORBIDDEN", message: "Only the project owner can view non-approved intents" }, 403);
  }

  const result = await listProjectCollaborationIntents({ projectId: project.id, status, page, limit });
  return withDeprecatedHeaders(apiSuccess(result));
}

const submitSchema = z.object({
  intentType: z.enum(["join", "recruit"]),
  pitch: z.string().min(10).max(250),
  whyYou: z.string().min(10).max(250),
  howCollab: z.string().min(10).max(250),
});

export async function POST(request: NextRequest, { params }: Props) {
  if (isV11BackendLockdownEnabled()) {
    return deprecatedResponse("INTENTS_DEPRECATED");
  }
  const auth = await authenticateRequest(request);
  if (auth.kind === "rate_limited") return rateLimitedResponse(auth.retryAfterSeconds);
  if (auth.kind !== "ok") return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return apiError({ code: "PROJECT_NOT_FOUND", message: "Project not found" }, 404);

  let body: unknown;
  try { body = await request.json(); } catch { return apiError({ code: "INVALID_JSON", message: "Invalid JSON" }, 400); }

  let parsed: z.infer<typeof submitSchema>;
  try { parsed = submitSchema.parse(body); } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (err instanceof z.ZodError) return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: err.flatten() }, 400);
    return apiError({ code: "INVALID_BODY", message: "Invalid payload" }, 400);
  }

  try {
    const intent = await submitCollaborationIntent({
      projectId: project.id,
      applicantId: auth.user.userId,
      intentType: parsed.intentType,
      pitch: parsed.pitch,
      whyYou: parsed.whyYou,
      howCollab: parsed.howCollab,
    });
    return apiSuccess({ intent }, 201);
  } catch (err) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(err);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (isRepositoryError(err) && err.code === "CREATOR_PROFILE_REQUIRED") {
      return apiError({ code: "CREATOR_PROFILE_REQUIRED", message: err.message }, 403);
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "DUPLICATE_INTENT") return apiError({ code: "DUPLICATE_INTENT", message: "You already submitted an intent for this project" }, 409);
    return apiError({ code: "SUBMIT_FAILED", message: msg }, 500);
  }
}
