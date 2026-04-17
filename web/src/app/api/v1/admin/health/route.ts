import { apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { getSystemHealthSnapshot } from "@/lib/system-health";

/** v7 P0-10: admin-only system health (same checks as public health + service label). */
export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const snapshot = await getSystemHealthSnapshot({
    service: "vibehub-admin-api",
    includeRecentAlerts: true,
  });
  return apiSuccess(snapshot);
}
