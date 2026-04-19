import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getSessionUserFromCookie: vi.fn(),
}));

vi.mock("@/lib/repositories/ledger.repository", () => ({
  listByUser: vi.fn(),
  verifyBundle: vi.fn(),
  verifyStoredEntry: vi.fn(),
}));

vi.mock("@/lib/ledger/public-rate-limit", () => ({
  checkLedgerPublicVerifyRateLimit: vi.fn(),
}));

import { GET as listMyLedger } from "../src/app/api/v1/me/ledger/route";
import { GET as verifyLedgerEntry } from "../src/app/api/v1/ledger/[ledgerEntryId]/verify/route";
import { POST as verifyLedgerBundle } from "../src/app/api/v1/ledger/verify-bundle/route";
import { getSessionUserFromCookie } from "@/lib/auth";
import { checkLedgerPublicVerifyRateLimit } from "@/lib/ledger/public-rate-limit";
import { listByUser, verifyBundle, verifyStoredEntry } from "@/lib/repositories/ledger.repository";

describe("v11 ledger API routes", () => {
  beforeEach(() => {
    vi.mocked(getSessionUserFromCookie).mockReset();
    vi.mocked(checkLedgerPublicVerifyRateLimit).mockReset();
    vi.mocked(listByUser).mockReset();
    vi.mocked(verifyBundle).mockReset();
    vi.mocked(verifyStoredEntry).mockReset();
    vi.mocked(checkLedgerPublicVerifyRateLimit).mockResolvedValue({ ok: true, backend: "memory_fallback" });
  });

  it("rejects unauthenticated /api/v1/me/ledger", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue(null);

    const response = await listMyLedger(new NextRequest("http://localhost/api/v1/me/ledger"));

    expect(response.status).toBe(401);
    expect(listByUser).not.toHaveBeenCalled();
  });

  it("lists current-user ledger entries with parsed query params", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({
      userId: "u1",
      role: "user",
      name: "Alice",
    });
    vi.mocked(listByUser).mockResolvedValue({
      items: [],
      cursor: "next_cursor",
    });

    const response = await listMyLedger(
      new NextRequest(
        "http://localhost/api/v1/me/ledger?workspaceId=personal:u1&actor=ab_1&kind=workspace.snapshot.created&limit=10&from=2026-04-01T00:00:00.000Z"
      )
    );

    expect(response.status).toBe(200);
    expect(listByUser).toHaveBeenCalledWith({
      userId: "u1",
      workspaceId: "personal:u1",
      from: new Date("2026-04-01T00:00:00.000Z"),
      to: undefined,
      actor: "ab_1",
      kind: "workspace.snapshot.created",
      cursor: undefined,
      limit: 10,
    });
  });

  it("validates a ledger bundle with rate limiting", async () => {
    vi.mocked(verifyBundle).mockResolvedValue({
      ok: true,
      brokenAt: null,
      totalChecked: 1,
      signedBy: "vibehub-signer-v1",
      publicKey: "pubkey",
    });

    const response = await verifyLedgerBundle(
      new NextRequest("http://localhost/api/v1/ledger/verify-bundle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          signedBy: "vibehub-signer-v1",
          publicKey: "pubkey",
          entries: [
            {
              id: "entry_1",
              workspaceId: "personal:u1",
              actorType: "user",
              actorId: "u1",
              actionKind: "workspace.snapshot.created",
              payload: {},
              payloadHash: "hash",
              signature: "sig",
              signedAt: "2026-04-19T00:00:00.000Z",
              anchorChain: "vibehub",
            },
          ],
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(verifyBundle).toHaveBeenCalledTimes(1);
  });

  it("returns 429 when public verification is rate limited", async () => {
    vi.mocked(checkLedgerPublicVerifyRateLimit).mockResolvedValue({
      ok: false,
      retryAfterSeconds: 12,
      backend: "memory_fallback",
    });

    const response = await verifyLedgerEntry(
      new NextRequest("http://localhost/api/v1/ledger/entry_1/verify"),
      { params: Promise.resolve({ ledgerEntryId: "entry_1" }) }
    );

    expect(response.status).toBe(429);
    expect(verifyStoredEntry).not.toHaveBeenCalled();
  });

  it("verifies one stored entry", async () => {
    vi.mocked(verifyStoredEntry).mockResolvedValue({
      ok: true,
      totalChecked: 1,
      signedBy: "vibehub-signer-v1",
      publicKey: "pubkey",
      entryId: "entry_1",
    } as never);

    const response = await verifyLedgerEntry(
      new NextRequest("http://localhost/api/v1/ledger/entry_1/verify"),
      { params: Promise.resolve({ ledgerEntryId: "entry_1" }) }
    );

    expect(response.status).toBe(200);
    expect(verifyStoredEntry).toHaveBeenCalledWith("entry_1");
  });
});
