import { apiSuccess } from "@/lib/response";
import { getCollaborationIntentConversionMetrics } from "@/lib/repository";

export async function GET() {
  const metrics = await getCollaborationIntentConversionMetrics();
  return apiSuccess(metrics);
}
