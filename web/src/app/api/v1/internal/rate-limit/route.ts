import { z } from "zod";
import { checkDistributedRateLimit, shouldTreatMissingRedisAsDegraded } from "@/lib/distributed-rate-limit";
import { logger, serializeError } from "@/lib/logger";
import { withRequestLogging } from "@/lib/request-logging";
import { apiError, apiSuccess } from "@/lib/response";
import { emitSystemAlert } from "@/lib/system-alerts";

export const runtime = "nodejs";

const bodySchema = z.object({
  bucketKey: z.string().min(1).max(256),
  maxRequests: z.number().int().positive().max(10_000),
  windowMs: z.number().int().positive().max(300_000).optional(),
});

function resolveInternalSecret() {
  return process.env.INTERNAL_SERVICE_SECRET?.trim() || "";
}

export async function POST(request: Request) {
  return withRequestLogging(
    request,
    {
      route: "POST /api/v1/internal/rate-limit",
      alertOn5xx: { kind: "internal_rate_limit.failed", dedupeKey: "internal-rate-limit-failed" },
    },
    async () => {
      const provided = request.headers.get("x-internal-secret")?.trim() || "";
      const expected = resolveInternalSecret();
      if (!expected || provided !== expected) {
        return apiError({ code: "FORBIDDEN", message: "Internal route only" }, 403);
      }

      try {
        const parsed = bodySchema.parse(await request.json());
        const result = await checkDistributedRateLimit(parsed);
        if (result.backend === "memory_fallback" && shouldTreatMissingRedisAsDegraded()) {
          logger.warn({ bucketKey: parsed.bucketKey }, "rate limit route is using memory fallback in production-like mode");
          await emitSystemAlert({
            kind: "redis.memory_fallback",
            severity: "warning",
            message: "Rate limiting fell back to in-memory state in production-like mode.",
            dedupeKey: "redis-memory-fallback",
            metadata: { bucketKey: parsed.bucketKey },
          });
        }
        return apiSuccess({
          ok: result.ok,
          retryAfterSeconds: result.ok ? undefined : result.retryAfterSeconds,
          backend: result.backend,
        });
      } catch (error) {
        logger.error({ err: serializeError(error) }, "internal rate limit route failed");
        if (error instanceof z.ZodError) {
          return apiError({ code: "INVALID_BODY", message: "Invalid rate limit payload", details: error.flatten() }, 400);
        }
        return apiError({ code: "INTERNAL_RATE_LIMIT_FAILED", message: "Could not check rate limit" }, 500);
      }
    }
  );
}
