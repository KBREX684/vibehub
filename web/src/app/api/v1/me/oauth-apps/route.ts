import { z } from "zod";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { safeServerErrorDetails } from "@/lib/safe-error-details";
import { createUserOAuthApp, listUserOAuthApps } from "@/lib/repositories/oauth-app.repository";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  redirectUris: z.array(z.string().url()).min(1),
  scopes: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const apps = await listUserOAuthApps(session.userId);
    return apiSuccess({ apps });
  } catch (error) {
    return apiError({ code: "OAUTH_APPS_LIST_FAILED", message: "Failed to list OAuth apps", details: safeServerErrorDetails(error) }, 500);
  }
}

export async function POST(request: Request) {
  const session = await getSessionUserFromCookie();
  if (!session) return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    const app = await createUserOAuthApp({ userId: session.userId, ...body });
    return apiSuccess({ app }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError({ code: "INVALID_BODY", message: "Invalid OAuth app payload", details: error.flatten() }, 400);
    }
    return apiError({ code: "OAUTH_APP_CREATE_FAILED", message: "Failed to create OAuth app", details: safeServerErrorDetails(error) }, 500);
  }
}
