import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listWorkAgentTasks } from "@/lib/work-console";
import type { WorkAgentTaskStatus, WorkspaceKind } from "@/lib/types";

const VALID_STATUSES = new Set<WorkAgentTaskStatus>(["running", "pending_confirm", "done", "failed"]);
const VALID_SCOPES = new Set<WorkspaceKind>(["personal", "team"]);

export async function GET(request: NextRequest) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const url = new URL(request.url);
  const statusRaw = url.searchParams.get("status") as WorkAgentTaskStatus | null;
  const scopeRaw = url.searchParams.get("scope") as WorkspaceKind | null;
  const items = await listWorkAgentTasks({
    userId: session.userId,
    status: statusRaw && VALID_STATUSES.has(statusRaw) ? statusRaw : undefined,
    scope: scopeRaw && VALID_SCOPES.has(scopeRaw) ? scopeRaw : undefined,
  });
  return apiSuccess({ items });
}
