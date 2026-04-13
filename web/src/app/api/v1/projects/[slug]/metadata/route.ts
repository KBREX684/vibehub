import type { NextRequest } from "next/server";
import { getProjectMetadata } from "@/lib/repository";
import { apiError, apiSuccess } from "@/lib/response";

/** A-3: Machine-friendly project metadata for AI agents. No auth required (public data only). */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const metadata = await getProjectMetadata(slug);
    if (!metadata) {
      return apiError({ code: "PROJECT_NOT_FOUND", message: `Project "${slug}" not found` }, 404);
    }
    return apiSuccess({ metadata });
  } catch (err) {
    return apiError(
      { code: "METADATA_FETCH_FAILED", message: err instanceof Error ? err.message : "Unknown error" },
      500
    );
  }
}
