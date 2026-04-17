import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { generateAdminAiSuggestion } from "@/lib/admin-ai";
import { withRequestLogging } from "@/lib/request-logging";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import type { AdminAiSuggestionTargetValue } from "@/lib/types";

const bodySchema = z.object({
  targetType: z.enum(["report_ticket", "enterprise_verification", "post_review", "other"] satisfies [AdminAiSuggestionTargetValue, ...AdminAiSuggestionTargetValue[]]),
  targetId: z.string().min(1),
  task: z.enum(["summarize_report", "triage_post", "verify_enterprise"]),
});

const TASK_TARGET_TYPE: Record<z.infer<typeof bodySchema>["task"], AdminAiSuggestionTargetValue> = {
  summarize_report: "report_ticket",
  triage_post: "post_review",
  verify_enterprise: "enterprise_verification",
};

export async function POST(request: Request) {
  return withRequestLogging(
    request,
    {
      route: "POST /api/v1/admin/ai-suggestions/generate",
      alertOn5xx: { kind: "admin_ai.generate_failed", dedupeKey: "admin-ai-generate-failed" },
    },
    async () => {
      const auth = await requireAdminSession();
      if (!auth.ok) return auth.response;

      try {
        const parsed = bodySchema.parse(await request.json());
        if (TASK_TARGET_TYPE[parsed.task] !== parsed.targetType) {
          return apiError({ code: "INVALID_TASK_TARGET", message: "task does not match targetType" }, 400);
        }
        const suggestion = await generateAdminAiSuggestion({ task: parsed.task, targetId: parsed.targetId });
        return apiSuccess({ suggestion });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError({ code: "INVALID_BODY", message: "Invalid generation payload", details: error.flatten() }, 400);
        }
        return apiError(
          {
            code: "ADMIN_AI_GENERATE_FAILED",
            message: "Failed to generate AI suggestion",
            details: safeServerErrorDetails(error),
          },
          500
        );
      }
    }
  );
}
