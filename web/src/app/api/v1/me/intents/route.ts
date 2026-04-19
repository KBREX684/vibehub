import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listWorkCollaborationInbox } from "@/lib/work-console";
import type { WorkIntentTab } from "@/lib/types";

const VALID_TABS = new Set<WorkIntentTab>(["received", "sent", "accepted", "declined", "expired"]);

export async function GET(request: NextRequest) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const url = new URL(request.url);
  const tabRaw = (url.searchParams.get("tab") ?? "received") as WorkIntentTab;
  const tab = VALID_TABS.has(tabRaw) ? tabRaw : "received";
  const items = await listWorkCollaborationInbox({ userId: session.userId, tab });
  return apiSuccess({ items });
}
