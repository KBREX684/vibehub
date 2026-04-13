import type { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { listCollectionTopics } from "@/lib/repository";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, "read:topics:list");
  if (!auth) {
    return apiError({ code: "UNAUTHORIZED", message: "Login or API key with read:topics:list required" }, 401);
  }

  const topics = listCollectionTopics();
  return apiSuccess({ topics });
}
