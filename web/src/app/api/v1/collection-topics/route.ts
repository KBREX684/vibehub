import { apiSuccess } from "@/lib/response";
import { listCollectionTopics } from "@/lib/repository";

export async function GET() {
  const topics = listCollectionTopics();
  return apiSuccess({ topics });
}
