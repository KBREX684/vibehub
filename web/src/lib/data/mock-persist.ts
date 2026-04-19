/**
 * Mock API interceptor for v11 frontend development.
 *
 * Provides `getMockResponse()` that matches URL patterns to mock data.
 * Components use this when `isMockDataEnabled()` returns true.
 */

import { getMockLedgerEntries, type LedgerEntry } from "./mock-ledger";
import { mockAigcStamps, type AigcStamp } from "./mock-aigc-stamps";

// ─── Compliance settings ──────────────────────────────────────────────────────

export interface ComplianceSettings {
  aigcAutoStamp: boolean;
  aigcProvider: "tencent" | "aliyun" | "local";
  ledgerEnabled: boolean;
}

let _complianceSettings: ComplianceSettings = {
  aigcAutoStamp: true,
  aigcProvider: "local",
  ledgerEnabled: true,
};

// ─── URL pattern matching ─────────────────────────────────────────────────────

function matchUrl(pattern: string, url: string): Record<string, string> | null {
  const patternParts = pattern.split("/");
  const urlParts = url.split("?")[0].split("/");
  if (patternParts.length !== urlParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(":")) {
      params[patternParts[i].slice(1)] = urlParts[i];
    } else if (patternParts[i] !== urlParts[i]) {
      return null;
    }
  }
  return params;
}

function getQueryParam(url: string, key: string): string | null {
  const qs = url.split("?")[1];
  if (!qs) return null;
  for (const pair of qs.split("&")) {
    const [k, v] = pair.split("=");
    if (k === key) return decodeURIComponent(v);
  }
  return null;
}

// ─── Response handlers ────────────────────────────────────────────────────────

type MockHandler = (params: Record<string, string>, url: string, body?: unknown) => unknown;

const GET_HANDLERS: [string, MockHandler][] = [
  ["/api/v1/me/ledger", (_p, url) => {
    const entries = getMockLedgerEntries();
    const limit = parseInt(getQueryParam(url, "limit") || "20", 10);
    const cursor = getQueryParam(url, "cursor");
    const from = getQueryParam(url, "from");
    const to = getQueryParam(url, "to");
    const actor = getQueryParam(url, "actor");
    const kind = getQueryParam(url, "kind");

    let filtered = entries;
    if (from) filtered = filtered.filter((e: LedgerEntry) => e.signedAt >= from);
    if (to) filtered = filtered.filter((e: LedgerEntry) => e.signedAt <= to);
    if (actor) {
      const actorType = actor === "user" ? "user" : "agent";
      filtered = filtered.filter((e: LedgerEntry) => e.actorType === actorType);
    }
    if (kind) filtered = filtered.filter((e: LedgerEntry) => e.actionKind === kind);

    let startIdx = 0;
    if (cursor) {
      startIdx = filtered.findIndex((e: LedgerEntry) => e.id === cursor);
      if (startIdx >= 0) startIdx += 1;
      else startIdx = 0;
    }

    const items = filtered.slice(startIdx, startIdx + limit);
    const nextCursor = startIdx + limit < filtered.length ? items[items.length - 1]?.id ?? null : null;
    return { items, cursor: nextCursor };
  }],

  ["/api/v1/workspaces/:id/ledger", (_p, url) => {
    const entries = getMockLedgerEntries();
    const limit = parseInt(getQueryParam(url, "limit") || "50", 10);
    return { items: entries.slice(0, limit), cursor: null };
  }],

  ["/api/v1/ledger/:id/verify", () => {
    return { ok: true, brokenAt: null, totalChecked: 1 };
  }],

  ["/api/v1/me/aigc-compliance/audit-trail", (_p, url) => {
    const month = getQueryParam(url, "month");
    if (month) {
      return { stamps: mockAigcStamps.filter((s: AigcStamp) => s.stampedAt.startsWith(month)) };
    }
    return { stamps: mockAigcStamps };
  }],

  ["/api/v1/me/compliance-settings", () => {
    return { data: _complianceSettings };
  }],
];

const POST_HANDLERS: [string, MockHandler][] = [
  ["/api/v1/ledger/verify-bundle", () => {
    return { ok: true, brokenAt: null, totalChecked: 55 };
  }],

  ["/api/v1/artifacts/:id/aigc-stamp", (params) => {
    return {
      data: {
        id: `stamp_${Date.now()}`,
        artifactId: params.id,
        mode: "text",
        explicitMark: "本内容由 AI 辅助生成",
        stampedAt: new Date().toISOString(),
      },
    };
  }],

  ["/api/v1/workspaces/:id/ledger/anchor", (_params, _url, body) => {
    // Check mock_pro flag
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("mock_pro") !== "1") {
        return {
          status: 403,
          error: { code: "PRO_REQUIRED", message: "锚定到司法链是 Pro 功能" },
        };
      }
    }
    const { entryIds, chain } = (body ?? {}) as { entryIds?: string[]; chain?: string };
    const attested = (entryIds ?? []).map((id: string) => ({
      id: `la_${Date.now()}_${id.slice(0, 4)}`,
      ledgerEntryId: id,
      chain: chain ?? "zhixin",
      txId: `${chain ?? "zhixin"}_${Math.random().toString(36).slice(2, 18)}`,
      proofUrl: `https://example.com/proof/${id}`,
      verifiedAt: new Date().toISOString(),
    }));
    return { data: { attested } };
  }],
];

const PATCH_HANDLERS: [string, MockHandler][] = [
  ["/api/v1/me/compliance-settings", (_p, _url, body) => {
    const updates = body as Partial<ComplianceSettings>;
    _complianceSettings = { ..._complianceSettings, ...updates };
    return { data: _complianceSettings };
  }],
];

// ─── Public API ───────────────────────────────────────────────────────────────

export function getMockResponse(method: string, url: string, body?: unknown): unknown | null {
  const handlers = method === "GET" ? GET_HANDLERS : method === "POST" ? POST_HANDLERS : method === "PATCH" ? PATCH_HANDLERS : [];
  for (const [pattern, handler] of handlers) {
    const params = matchUrl(pattern, url);
    if (params !== null) {
      return handler(params, url, body);
    }
  }
  return null;
}

/**
 * Fetch-like wrapper that returns mock data when available, otherwise
 * returns null (caller should fall back to real fetch).
 */
export async function mockFetch<T>(method: string, url: string, body?: unknown): Promise<{ data: T } | null> {
  const response = getMockResponse(method, url, body);
  if (response !== null) {
    return response as { data: T };
  }
  return null;
}
