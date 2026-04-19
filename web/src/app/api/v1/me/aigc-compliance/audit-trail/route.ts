import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { listAigcComplianceAuditTrail } from "@/lib/repositories/aigc.repository";
import { renderAigcAuditTrailTxt } from "@/lib/ledger/export-utils";
import { renderAigcComplianceAuditTrailPdf } from "@/lib/aigc/audit-trail-pdf";

export async function GET(request: NextRequest) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  try {
    const url = new URL(request.url);
    const month = url.searchParams.get("month")?.trim() || undefined;
    const format = url.searchParams.get("format")?.trim() || "json";
    if (!["json", "pdf", "txt"].includes(format)) {
      return apiError({ code: "INVALID_FORMAT", message: "format must be json, txt, or pdf" }, 400);
    }
    const result = await listAigcComplianceAuditTrail({
      userId: session.userId,
      month,
    });

    if (format === "txt") {
      return new Response(renderAigcAuditTrailTxt(result.items, { month }), {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "content-disposition": `attachment; filename="aigc-audit-${month ?? "all"}.txt"`,
        },
      });
    }

    if (format === "pdf") {
      const pdfBuffer = await renderAigcComplianceAuditTrailPdf({ items: result.items, month });
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="aigc-audit-${month ?? "all"}.pdf"`,
        },
      });
    }

    return apiSuccess(result);
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to fetch AIGC compliance audit trail";
    return apiError({ code: "AIGC_COMPLIANCE_AUDIT_TRAIL_FAILED", message }, 500);
  }
}
