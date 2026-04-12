import { listUsers } from "@/lib/repository";
import { parsePagination } from "@/lib/pagination";
import { apiError, apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const { page, limit } = parsePagination(url.searchParams);
    const query = url.searchParams.get("query") ?? undefined;
    const result = await listUsers({ query, page, limit });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      {
        code: "ADMIN_USERS_LIST_FAILED",
        message: "Failed to list users",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
}
