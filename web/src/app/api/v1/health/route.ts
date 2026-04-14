import { apiSuccess } from "@/lib/response";
import { getRuntimeDataMode, isMockDataEnabled } from "@/lib/runtime-mode";

export async function GET() {
  return apiSuccess({
    service: "vibehub-api",
    version: "v1",
    status: "ok",
    dataMode: getRuntimeDataMode(),
    useMockData: isMockDataEnabled(),
  });
}
