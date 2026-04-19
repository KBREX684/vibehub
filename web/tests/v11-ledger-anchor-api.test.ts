import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getSessionUserFromCookie: vi.fn(),
}));

vi.mock("@/lib/repositories/billing.repository", () => ({
  getUserTier: vi.fn(),
}));

vi.mock("@/lib/repositories/ledger.repository", () => ({
  anchorWorkspaceLedger: vi.fn(),
}));

import { POST as anchorLedgerRoute } from "../src/app/api/v1/workspaces/[workspaceId]/ledger/anchor/route";
import { getSessionUserFromCookie } from "@/lib/auth";
import { getUserTier } from "@/lib/repositories/billing.repository";
import { anchorWorkspaceLedger } from "@/lib/repositories/ledger.repository";

describe("v11 ledger anchor API route", () => {
  beforeEach(() => {
    vi.mocked(getSessionUserFromCookie).mockReset();
    vi.mocked(getUserTier).mockReset();
    vi.mocked(anchorWorkspaceLedger).mockReset();
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue(null);

    const response = await anchorLedgerRoute(
      new NextRequest("http://localhost/api/v1/workspaces/personal:u1/ledger/anchor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "zhixin" }),
      }),
      { params: Promise.resolve({ workspaceId: "personal:u1" }) }
    );

    expect(response.status).toBe(401);
    expect(anchorWorkspaceLedger).not.toHaveBeenCalled();
  });

  it("requires pro tier", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({ userId: "u1", role: "user", name: "Alice" });
    vi.mocked(getUserTier).mockResolvedValue("free");

    const response = await anchorLedgerRoute(
      new NextRequest("http://localhost/api/v1/workspaces/personal:u1/ledger/anchor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider: "zhixin" }),
      }),
      { params: Promise.resolve({ workspaceId: "personal:u1" }) }
    );

    expect(response.status).toBe(402);
    expect(anchorWorkspaceLedger).not.toHaveBeenCalled();
  });

  it("anchors a workspace ledger bundle", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({ userId: "u1", role: "user", name: "Alice" });
    vi.mocked(getUserTier).mockResolvedValue("pro");
    vi.mocked(anchorWorkspaceLedger).mockResolvedValue({
      provider: "zhixin",
      workspaceId: "personal:u1",
      entryCount: 5,
      bundleHash: "bundle_hash",
      txId: "zhixin_tx_1",
      href: "https://verify.example.com/zhixin_tx_1",
      verifiedAt: "2026-04-19T12:00:00.000Z",
      attestationLinkId: "link_1",
      ledgerEntryId: "ledger_anchor_1",
    });

    const response = await anchorLedgerRoute(
      new NextRequest("http://localhost/api/v1/workspaces/personal:u1/ledger/anchor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "zhixin",
          from: "2026-04-01T00:00:00.000Z",
          to: "2026-04-30T23:59:59.000Z",
        }),
      }),
      { params: Promise.resolve({ workspaceId: "personal:u1" }) }
    );

    expect(response.status).toBe(200);
    expect(anchorWorkspaceLedger).toHaveBeenCalledWith({
      userId: "u1",
      workspaceId: "personal:u1",
      provider: "zhixin",
      from: new Date("2026-04-01T00:00:00.000Z"),
      to: new Date("2026-04-30T23:59:59.000Z"),
    });
  });
});
