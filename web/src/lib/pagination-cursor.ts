/**
 * P4-3: opaque cursor = base64url(JSON) of stable sort keys (ISO date + id).
 */

export interface CursorPayload {
  /** Primary sort field instant (e.g. post createdAt or project updatedAt) */
  t: string;
  id: string;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(raw: string | null | undefined): CursorPayload | null {
  if (!raw?.trim()) return null;
  try {
    const json = Buffer.from(raw.trim(), "base64url").toString("utf8");
    const o = JSON.parse(json) as { t?: string; id?: string };
    if (typeof o.t === "string" && typeof o.id === "string" && o.t && o.id) {
      return { t: o.t, id: o.id };
    }
  } catch {
    return null;
  }
  return null;
}
