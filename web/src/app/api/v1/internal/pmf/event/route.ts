import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/response";
import { recordPmfEvent } from "@/lib/repositories/pmf.repository";

const bodySchema = z.object({
  userId: z.string().min(1).max(191),
  event: z.string().min(1).max(128),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().datetime().optional(),
});

function resolveInternalSecret() {
  return process.env.INTERNAL_SERVICE_SECRET?.trim() || "";
}

export async function POST(request: Request) {
  const provided = request.headers.get("x-internal-secret")?.trim() || "";
  const expected = resolveInternalSecret();
  if (!expected || provided !== expected) {
    return apiError({ code: "FORBIDDEN", message: "Internal route only" }, 403);
  }

  try {
    const parsed = bodySchema.parse(await request.json());
    const event = await recordPmfEvent({
      userId: parsed.userId,
      event: parsed.event,
      metadata: parsed.metadata,
      createdAt: parsed.createdAt ? new Date(parsed.createdAt) : undefined,
    });
    return apiSuccess({ event }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid PMF event payload", details: error.flatten() }, 400);
    }
    return apiError(
      {
        code: "PMF_EVENT_RECORD_FAILED",
        message: error instanceof Error ? error.message : "Failed to record PMF event",
      },
      500
    );
  }
}
