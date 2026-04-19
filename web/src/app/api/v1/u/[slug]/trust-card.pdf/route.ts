import type { NextRequest } from "next/server";
import { authenticateRequest, rateLimitedResponse, resolveReadAuth } from "@/lib/auth";
import { getPublicTrustCardBySlug } from "@/lib/repositories/opc-profile.repository";
import { apiError } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { renderTrustCardPdf } from "@/lib/ledger/trust-card-pdf";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticateRequest(request, "read:creators:detail");
  const gate = resolveReadAuth(auth, true);
  if (!gate.ok) {
    if (gate.status === 429) {
      return rateLimitedResponse(gate.retryAfterSeconds ?? 60);
    }
    return apiError({ code: "UNAUTHORIZED", message: "API key with read:creators:detail required" }, 401);
  }

  try {
    const { slug } = await params;
    const card = await getPublicTrustCardBySlug(slug);
    const pdfBuffer = await renderTrustCardPdf({ card });
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="trust-card-${slug}.pdf"`,
      },
    });
  } catch (error) {
    return (
      apiErrorFromRepositoryCatch(error) ??
      apiError(
        {
          code: "TRUST_CARD_PDF_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      )
    );
  }
}
