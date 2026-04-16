import { apiSuccess } from "@/lib/response";
import { requireAdminSession } from "@/lib/admin-auth";
import { getMetrics } from "@/lib/telemetry";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  const metrics = getMetrics();
  return apiSuccess(metrics);
}
