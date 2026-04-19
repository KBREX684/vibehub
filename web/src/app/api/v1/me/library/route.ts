import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listWorkLibraryItems } from "@/lib/work-console";

const VALID_STATUSES = new Set(["draft", "public", "private", "open-source", "archived"]);

export async function GET(request: NextRequest) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status") ?? undefined;
  const query = url.searchParams.get("q")?.trim() || undefined;
  const status =
    statusRaw && VALID_STATUSES.has(statusRaw)
      ? (statusRaw as "draft" | "public" | "private" | "open-source" | "archived")
      : undefined;

  const items = await listWorkLibraryItems({ userId: session.userId, status, query });
  return apiSuccess({ items });
}
