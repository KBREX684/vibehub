import { apiSuccess } from "@/lib/response";
import { getSystemHealthSnapshot } from "@/lib/system-health";

export async function GET() {
  const snapshot = await getSystemHealthSnapshot({ service: "vibehub-api" });
  return apiSuccess(snapshot);
}
