import { apiSuccess } from "@/lib/response";

export async function GET() {
  return apiSuccess({
    service: "vibehub-api",
    version: "v1",
    status: "ok",
    useMockData: process.env.USE_MOCK_DATA !== "false",
  });
}
