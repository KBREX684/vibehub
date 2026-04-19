/**
 * PMF event emitter for v11.
 *
 * In mock/dev mode: console.log
 * In production: POST to /api/v1/internal/pmf/event
 */

export type PmfEventKind = "compliance.enabled" | "ledger.exported" | "subscription.upgraded";

export function emitPmfEvent(kind: PmfEventKind, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" || process.env.NODE_ENV === "development") {
    console.log("[pmf]", kind, payload ?? "");
    return;
  }

  fetch("/api/v1/internal/pmf/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, payload }),
  }).catch(() => {
    // Silent fail — PMF events must never block UX
  });
}
