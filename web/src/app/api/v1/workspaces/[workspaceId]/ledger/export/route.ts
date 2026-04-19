import type { NextRequest } from "next/server";
import { getSessionUserFromCookie } from "@/lib/auth";
import { apiError } from "@/lib/response";
import { apiErrorFromRepositoryCatch } from "@/lib/repository-errors";
import { exportJsonBundle } from "@/lib/repositories/ledger.repository";
import { renderLedgerBundleTxt } from "@/lib/ledger/export-utils";
import { renderLedgerBundlePdf } from "@/lib/ledger/pdf-renderer";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

function parseDate(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(request: NextRequest, { params }: Props) {
  const session = await getSessionUserFromCookie();
  if (!session) {
    return apiError({ code: "UNAUTHORIZED", message: "Login required" }, 401);
  }

  const format = request.nextUrl.searchParams.get("format") ?? "json";
  if (!["json", "txt", "pdf"].includes(format)) {
    return apiError({ code: "INVALID_FORMAT", message: "format must be json, txt, or pdf" }, 400);
  }

  try {
    const { workspaceId } = await params;
    const bundle = await exportJsonBundle({
      userId: session.userId,
      workspaceId,
      from: parseDate(request.nextUrl.searchParams.get("from")),
      to: parseDate(request.nextUrl.searchParams.get("to")),
    });
    const filenameBase = `ledger-${workspaceId}`;

    if (format === "txt") {
      return new Response(renderLedgerBundleTxt(bundle, { workspaceId }), {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "content-disposition": `attachment; filename="${filenameBase}.txt"`,
        },
      });
    }

    if (format === "pdf") {
      const pdfBuffer = await renderLedgerBundlePdf({ bundle, workspaceId });
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${filenameBase}.pdf"`,
        },
      });
    }

    return new Response(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filenameBase}.json"`,
      },
    });
  } catch (error) {
    const repositoryErrorResponse = apiErrorFromRepositoryCatch(error);
    if (repositoryErrorResponse) return repositoryErrorResponse;
    const message = error instanceof Error ? error.message : "Failed to export ledger bundle";
    return apiError({ code: "LEDGER_EXPORT_FAILED", message }, 500);
  }
}
