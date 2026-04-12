import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { createApiKeyForUser, listApiKeysForUser } from "@/lib/repository";

const createSchema = z.object({
  label: z.string().min(1).max(80),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const keys = await listApiKeysForUser(session.userId);
    return apiSuccess({ keys });
  } catch (error) {
    return apiError(
      {
        code: "API_KEYS_LIST_FAILED",
        message: "Failed to list API keys",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const json = await request.json();
    const parsed = createSchema.parse(json);
    const created = await createApiKeyForUser({ userId: session.userId, label: parsed.label });
    return apiSuccess({ key: created }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid label", details: error.flatten() }, 400);
    }
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === "INVALID_API_KEY_LABEL") {
      return apiError({ code: "INVALID_API_KEY_LABEL", message: "Label is required" }, 400);
    }
    if (msg === "USER_NOT_FOUND") {
      return apiError({ code: "USER_NOT_FOUND", message: "User not found" }, 404);
    }
    return apiError(
      {
        code: "API_KEY_CREATE_FAILED",
        message: "Failed to create API key",
        details: msg,
      },
      500
    );
  }
}
