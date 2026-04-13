import { apiSuccess } from "@/lib/response";
import { CONTENT_GUIDELINES_API_PAYLOAD } from "@/lib/content-guidelines";

export async function GET() {
  return apiSuccess(CONTENT_GUIDELINES_API_PAYLOAD);
}
