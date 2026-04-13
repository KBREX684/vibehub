import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/openapi-spec";

/** Public OpenAPI 3.0 document for `/api/v1` (P4-4). */
export async function GET() {
  const doc = buildOpenApiDocument();
  return NextResponse.json(doc, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
