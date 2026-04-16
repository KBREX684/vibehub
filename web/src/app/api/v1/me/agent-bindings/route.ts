import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { createAgentBindingForUser, listAgentBindingsForUser } from "@/lib/repository";
import { safeServerErrorDetails } from "@/lib/safe-error-details";

const createSchema = z.object({
  label: z.string().min(1).max(80),
  agentType: z.string().min(1).max(40),
  description: z.string().max(280).optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  try {
    const bindings = await listAgentBindingsForUser(session.userId);
    return apiSuccess({ bindings });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    return apiError(
      {
        code: "AGENT_BINDINGS_LIST_FAILED",
        message: "Failed to list agent bindings",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);

  try {
    const json = await request.json();
    const parsed = createSchema.parse(json);
    const binding = await createAgentBindingForUser({
      userId: session.userId,
      label: parsed.label,
      agentType: parsed.agentType,
      description: parsed.description,
      active: parsed.active,
    });
    return apiSuccess({ binding }, 201);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid payload", details: error.flatten() }, 400);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message === "INVALID_AGENT_BINDING_LABEL") {
      return apiError({ code: message, message: "Label is required" }, 400);
    }
    if (message === "INVALID_AGENT_BINDING_TYPE") {
      return apiError({ code: message, message: "Agent type is required" }, 400);
    }
    return apiError(
      {
        code: "AGENT_BINDING_CREATE_FAILED",
        message: "Failed to create agent binding",
        details: safeServerErrorDetails(error),
      },
      500
    );
  }
}
