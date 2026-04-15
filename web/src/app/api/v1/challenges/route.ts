import { z } from "zod";
import { listChallenges, createChallenge } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { requireAdminSession } from "@/lib/admin-auth";
import type { ChallengeStatus } from "@/lib/types";

const CHALLENGE_STATUSES: readonly ChallengeStatus[] = ["draft", "active", "closed"];

const createChallengeSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10),
  rules: z.string().optional(),
  tags: z.array(z.string().min(1)).default([]),
  status: z.enum(["draft", "active", "closed"]).default("draft"),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const rawStatus = url.searchParams.get("status");
    let status: ChallengeStatus | undefined;
    if (rawStatus) {
      if (!CHALLENGE_STATUSES.includes(rawStatus as ChallengeStatus)) {
        return apiError({ code: "INVALID_STATUS", message: `status must be one of: ${CHALLENGE_STATUSES.join(", ")}` }, 400);
      }
      status = rawStatus as ChallengeStatus;
    }

    const result = await listChallenges({ status, page, limit });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
return apiError(
      { code: "CHALLENGES_LIST_FAILED", message: "Failed to list challenges", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  try {
    const json = await request.json();
    const parsed = createChallengeSchema.parse(json);
    const challenge = await createChallenge({
      ...parsed,
      createdByUserId: auth.session.userId,
    });
    return apiSuccess(challenge, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid challenge payload", details: error.flatten() }, 400);
    }
    return apiError(
      { code: "CHALLENGE_CREATE_FAILED", message: "Failed to create challenge", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}