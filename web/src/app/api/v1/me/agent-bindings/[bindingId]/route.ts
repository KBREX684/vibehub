import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { deleteAgentBindingForUser, updateAgentBindingForUser } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const patchSchema = z.object({
  label: z.string().min(1).max(80).optional(),
  agentType: z.string().min(1).max(40).optional(),
  description: z.string().max(280).nullable().optional(),
  active: z.boolean().optional(),
});

interface Params {
  params: Promise<{ bindingId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  try {
    const { bindingId } = await params;
    const json = await request.json();
    const parsed = patchSchema.parse(json);
    const binding = await updateAgentBindingForUser({
      userId: session.userId,
      bindingId,
      label: parsed.label,
      agentType: parsed.agentType,
      description: parsed.description,
      active: parsed.active,
    });
    return apiSuccess({ binding });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message === "AGENT_BINDING_NOT_FOUND") {
      return apiError({ code: message, message: "Agent binding not found" }, 404);
    }
    if (message === "INVALID_AGENT_BINDING_LABEL" || message === "INVALID_AGENT_BINDING_TYPE") {
      return apiError({ code: message, message }, 400);
    }
    return apiError(
      {
        code: "AGENT_BINDING_UPDATE_FAILED",
        message: "Failed to update agent binding",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  try {
    const { bindingId } = await params;
    await deleteAgentBindingForUser({ userId: session.userId, bindingId });
    return apiSuccess({ deleted: true });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : String(error);
    if (message === "AGENT_BINDING_NOT_FOUND") {
      return apiError({ code: message, message: "Agent binding not found" }, 404);
    }
    return apiError(
      {
        code: "AGENT_BINDING_DELETE_FAILED",
        message: "Failed to delete agent binding",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
