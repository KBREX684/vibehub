import { getCsrfToken } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";

/**
 * GET /api/v1/auth/csrf-token
 *
 * Returns the CSRF token derived from the current session cookie.
 * Called by the client-side `apiFetch` wrapper on first use and cached
 * in memory for the page lifetime.
 *
 * Returns 401 when no session is active (API-key-only callers skip CSRF).
 */
export async function GET() {
  const token = await getCsrfToken();
  if (!token) {
    return apiError({ code: "UNAUTHORIZED", message: "No active session" }, 401);
  }
  return apiSuccess({ csrfToken: token });
}
