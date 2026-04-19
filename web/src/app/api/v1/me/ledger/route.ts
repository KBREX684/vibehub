import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listByUser } from "@/lib/repositories/ledger.repository";

function parseDate(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseLimit(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const result = await listByUser({
      userId: session.userId,
      workspaceId: searchParams.get("workspaceId") ?? undefined,
      from: parseDate(searchParams.get("from")),
      to: parseDate(searchParams.get("to")),
      actor: searchParams.get("actor") ?? undefined,
      kind: searchParams.get("kind") ?? undefined,
      cursor: searchParams.get("cursor") ?? undefined,
      limit: parseLimit(searchParams.get("limit")),
    });
    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to list ledger entries";
    return apiError({ code: "LEDGER_LIST_FAILED", message }, 500);
  }
}

