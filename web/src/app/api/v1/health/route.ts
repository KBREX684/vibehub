import { apiSuccess } from "@/lib/response";
import { getSystemHealth } from "@/lib/telemetry";

export async function GET() {
  const health = await getSystemHealth();
  return apiSuccess(health);
}
