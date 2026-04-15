import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getContributionCredit, refreshContributionCredit } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { logger, serializeError } from "@/lib/logger";
import { readJsonObjectBodyOrEmpty } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const emptyBodySchema = z.object({}).strict();

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const credit = await getContributionCredit(session.userId);
    return apiSuccess(credit);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    logger.error({ err: serializeError(error) }, "reputation fetch failed");
    return apiError(
      {
        code: "REPUTATION_FETCH_FAILED",
        message: "Failed to fetch reputation",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const parsed = await readJsonObjectBodyOrEmpty(request);
  if (!parsed.ok) return parsed.response;
  const zod = emptyBodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  try {
    const credit = await refreshContributionCredit(session.userId);
    return apiSuccess(credit);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    logger.error({ err: serializeError(error) }, "reputation refresh failed");
    return apiError(
      {
        code: "REPUTATION_REFRESH_FAILED",
        message: "Failed to refresh reputation",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
