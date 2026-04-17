import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { decideAdminAiSuggestion } from "@/lib/admin-ai";
import { withRequestLogging } from "@/lib/request-logging";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const bodySchema = z.object({
  decision: z.enum(["accepted", "rejected", "modified"]),
  decisionNote: z.string().max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ suggestionId: string }> }
) {
  return withRequestLogging(
    request,
    {
      route: "POST /api/v1/admin/ai-suggestions/[suggestionId]/decision",
      alertOn5xx: { kind: "admin_ai.decision_failed", dedupeKey: "admin-ai-decision-failed" },
    },
    async () => {
      const auth = await requireAdminSession();
      if (!auth.ok) return auth.response;

      try {
        const { suggestionId } = await params;
        const parsed = bodySchema.parse(await request.json());
        const suggestion = await decideAdminAiSuggestion({
          suggestionId,
          adminUserId: auth.session.userId,
          decision: parsed.decision,
          decisionNote: parsed.decisionNote,
        });
        return apiSuccess({ suggestion });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return apiError({ code: "INVALID_BODY", message: "Invalid AI decision payload", details: error.flatten() }, 400);
        }
        const message = error instanceof Error ? error.message : String(error);
        if (message === "ADMIN_AI_SUGGESTION_NOT_FOUND") {
          return apiError({ code: "ADMIN_AI_SUGGESTION_NOT_FOUND", message: "AI suggestion not found" }, 404);
        }
        return apiError(
          {
            code: "ADMIN_AI_DECISION_FAILED",
            message: "Failed to save AI decision",
            details: safeServerErrorDetails(error),
          },
          500
        );
      }
    }
  );
}
