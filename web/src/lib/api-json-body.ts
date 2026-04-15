import { apiError } from "@/lib/response";
import type { NextResponse } from "next/server";

/**
 * Read and validate that the request body parses as a JSON object (not array / primitive).
 * Used by API routes for consistent INVALID_JSON handling (P1-BE-1).
 */
export async function readJsonObjectBody(
  request: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  try {
    const raw: unknown = await request.json();
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
      return { ok: true, body: raw as Record<string, unknown> };
    }
    return {
      ok: false,
      response: apiError(
        { code: "INVALID_JSON", message: "Request body must be a JSON object" },
        400
      ),
    };
  } catch {
    return {
      ok: false,
      response: apiError(
        { code: "INVALID_JSON", message: "Request body must be valid JSON" },
        400
      ),
    };
  }
}

/** Like `readJsonObjectBody`, but treats empty/missing body as `{}` (for POST routes with no payload). */
export async function readJsonObjectBodyOrEmpty(
  request: Request
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  const text = await request.text();
  if (!text.trim()) {
    return { ok: true, body: {} };
  }
  try {
    const raw: unknown = JSON.parse(text);
    if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
      return { ok: true, body: raw as Record<string, unknown> };
    }
    return {
      ok: false,
      response: apiError(
        { code: "INVALID_JSON", message: "Request body must be a JSON object" },
        400
      ),
    };
  } catch {
    return {
      ok: false,
      response: apiError(
        { code: "INVALID_JSON", message: "Request body must be valid JSON" },
        400
      ),
    };
  }
}
