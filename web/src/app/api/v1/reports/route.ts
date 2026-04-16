import { z } from "zod";
import { authenticateRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { readJsonObjectBody } from "@/lib/api-json-body";
import { apiErrorFromZod } from "@/lib/zod-api-error";
import { createReportTicket, getPostBySlug } from "@/lib/repository";
import { getRequestLogger, serializeError } from "@/lib/logger";
import type { NextRequest } from "next/server";

const bodySchema = z
  .object({
    postSlug: z.string().min(1),
    reason: z.string().min(8).max(1000),
  })
  .strict();

export async function POST(request: NextRequest) {
  const log = getRequestLogger(request, { route: "POST /api/v1/reports" });
  const auth = await authenticateRequest(request);
  if (auth.kind !== "ok") {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const parsed = await readJsonObjectBody(request);
  if (!parsed.ok) return parsed.response;
  const zod = bodySchema.safeParse(parsed.body);
  if (!zod.success) return apiErrorFromZod(zod.error);

  try {
    const post = await getPostBySlug(zod.data.postSlug);
    if (!post) {
      return apiError({ code: "POST_NOT_FOUND", message: "Reported post not found" }, 404);
    }
    const ticket = await createReportTicket({
      targetType: "post",
      targetId: post.id,
      reporterId: auth.user.userId,
      reason: zod.data.reason,
    });
    return apiSuccess({ ticket }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "REPORT_REASON_TOO_SHORT") {
      return apiError({ code: "REPORT_REASON_TOO_SHORT", message: "Please provide more detail for the report" }, 400);
    }
    log.error({ err: serializeError(error) }, "report creation failed");
    return apiError({ code: "REPORT_CREATE_FAILED", message: "Failed to submit report" }, 500);
  }
}
