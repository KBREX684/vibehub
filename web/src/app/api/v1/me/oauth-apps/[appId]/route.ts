import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import { deleteUserOAuthApp, updateUserOAuthApp } from "@/lib/repositories/oauth-app.repository";

const bodySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).nullable().optional(),
  redirectUris: z.array(z.string().url()).min(1).optional(),
  scopes: z.array(z.string()).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ appId: string }> }) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const { appId } = await params;
    const json = await request.json();
    const body = bodySchema.parse(json);
    const app = await updateUserOAuthApp({ userId: session.userId, appId, ...body });
    return apiSuccess({ app });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid OAuth app payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "OAUTH_APP_UPDATE_FAILED", message: "Failed to update OAuth app", details: safeServerErrorDetails(error) }, 500);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ appId: string }> }) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const { appId } = await params;
    await deleteUserOAuthApp({ userId: session.userId, appId });
    return apiSuccess({ ok: true });
  } catch (error) {
    return apiError({ code: "OAUTH_APP_DELETE_FAILED", message: "Failed to delete OAuth app", details: safeServerErrorDetails(error) }, 500);
  }
}
