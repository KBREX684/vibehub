import { getEmbedTeamCard } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";
import { corsHeaders, corsPreflightResponse } from "@/lib/cors";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}

export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const card = await getEmbedTeamCard(slug);
  if (!card) {
    return apiError({ code: "TEAM_NOT_FOUND", message: `Team "${slug}" not found` }, 404);
  }
  const res = apiSuccess(card);
  const headers = corsHeaders(request);
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}
