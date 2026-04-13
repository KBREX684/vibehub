import { getEmbedProjectCard } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { corsHeaders, corsPreflightResponse } from "@/lib/cors";
import { NextResponse } from "next/server";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function OPTIONS() {
  return corsPreflightResponse();
}

export async function GET(_request: Request, { params }: Params) {
  const { slug } = await params;
  const card = await getEmbedProjectCard(slug);
  if (!card) {
    return apiError({ code: "PROJECT_NOT_FOUND", message: `Project "${slug}" not found` }, 404);
  }
  const res = apiSuccess(card);
  const headers = corsHeaders();
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}
