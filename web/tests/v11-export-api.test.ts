import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getSessionUserFromCookie: vi.fn(),
  authenticateRequest: vi.fn(),
  rateLimitedResponse: vi.fn((retryAfterSeconds: number) => new Response("rate-limited", { status: 429, headers: { "retry-after": String(retryAfterSeconds) } })),
  resolveReadAuth: vi.fn(),
}));

vi.mock("@/lib/repositories/ledger.repository", () => ({
  exportJsonBundle: vi.fn(),
}));

vi.mock("@/lib/repositories/aigc.repository", () => ({
  listAigcComplianceAuditTrail: vi.fn(),
}));

vi.mock("@/lib/repositories/opc-profile.repository", () => ({
  getPublicTrustCardBySlug: vi.fn(),
}));

vi.mock("@/lib/ledger/pdf-renderer", () => ({
  renderLedgerBundlePdf: vi.fn(),
}));

vi.mock("@/lib/aigc/audit-trail-pdf", () => ({
  renderAigcComplianceAuditTrailPdf: vi.fn(),
}));

vi.mock("@/lib/ledger/trust-card-pdf", () => ({
  renderTrustCardPdf: vi.fn(),
}));

import { GET as exportLedgerRoute } from "../src/app/api/v1/workspaces/[workspaceId]/ledger/export/route";
import { GET as getAuditTrailRoute } from "../src/app/api/v1/me/aigc-compliance/audit-trail/route";
import { GET as getTrustCardPdfRoute } from "../src/app/api/v1/u/[slug]/trust-card.pdf/route";
import {
  authenticateRequest,
  getSessionUserFromCookie,
  resolveReadAuth,
} from "@/lib/auth";
import { exportJsonBundle } from "@/lib/repositories/ledger.repository";
import { listAigcComplianceAuditTrail } from "@/lib/repositories/aigc.repository";
import { getPublicTrustCardBySlug } from "@/lib/repositories/opc-profile.repository";
import { renderLedgerBundlePdf } from "@/lib/ledger/pdf-renderer";
import { renderAigcComplianceAuditTrailPdf } from "@/lib/aigc/audit-trail-pdf";
import { renderTrustCardPdf } from "@/lib/ledger/trust-card-pdf";

describe("v11 export API routes", () => {
  beforeEach(() => {
    vi.mocked(getSessionUserFromCookie).mockReset();
    vi.mocked(authenticateRequest).mockReset();
    vi.mocked(resolveReadAuth).mockReset();
    vi.mocked(exportJsonBundle).mockReset();
    vi.mocked(listAigcComplianceAuditTrail).mockReset();
    vi.mocked(getPublicTrustCardBySlug).mockReset();
    vi.mocked(renderLedgerBundlePdf).mockReset();
    vi.mocked(renderAigcComplianceAuditTrailPdf).mockReset();
    vi.mocked(renderTrustCardPdf).mockReset();
  });

  it("exports ledger bundles as txt", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({ userId: "u1", role: "user", name: "Alice" });
    vi.mocked(exportJsonBundle).mockResolvedValue({
      signedBy: "vibehub-signer-v1",
      publicKey: "pubkey",
      entries: [],
    });

    const response = await exportLedgerRoute(
      new NextRequest("http://localhost/api/v1/workspaces/personal:u1/ledger/export?format=txt"),
      { params: Promise.resolve({ workspaceId: "personal:u1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("content-disposition")).toContain('ledger-personal:u1.txt');
    expect(exportJsonBundle).toHaveBeenCalledWith({
      userId: "u1",
      workspaceId: "personal:u1",
      from: undefined,
      to: undefined,
    });
  });

  it("exports ledger bundles as pdf", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({ userId: "u1", role: "user", name: "Alice" });
    vi.mocked(exportJsonBundle).mockResolvedValue({
      signedBy: "vibehub-signer-v1",
      publicKey: "pubkey",
      entries: [],
    });
    vi.mocked(renderLedgerBundlePdf).mockResolvedValue(Buffer.from("%PDF-ledger"));

    const response = await exportLedgerRoute(
      new NextRequest("http://localhost/api/v1/workspaces/personal:u1/ledger/export?format=pdf"),
      { params: Promise.resolve({ workspaceId: "personal:u1" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(renderLedgerBundlePdf).toHaveBeenCalledTimes(1);
  });

  it("exports AIGC audit trail as pdf", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({ userId: "u1", role: "user", name: "Alice" });
    vi.mocked(listAigcComplianceAuditTrail).mockResolvedValue({ items: [] });
    vi.mocked(renderAigcComplianceAuditTrailPdf).mockResolvedValue(Buffer.from("%PDF-aigc"));

    const response = await getAuditTrailRoute(
      new NextRequest("http://localhost/api/v1/me/aigc-compliance/audit-trail?format=pdf&month=2026-04")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(listAigcComplianceAuditTrail).toHaveBeenCalledWith({
      userId: "u1",
      month: "2026-04",
    });
    expect(renderAigcComplianceAuditTrailPdf).toHaveBeenCalledWith({
      items: [],
      month: "2026-04",
    });
  });

  it("exports the public trust card as pdf", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({ kind: "unauthorized" } as never);
    vi.mocked(resolveReadAuth).mockReturnValue({ ok: true, user: null } as never);
    vi.mocked(getPublicTrustCardBySlug).mockResolvedValue({
      slug: "alice-ai-builder",
      creatorName: "Alice",
      publicCard: true,
      metrics: {
        id: "metric_1",
        userId: "u1",
        ledgerEntryCount: 10,
        snapshotCount: 2,
        stampedArtifactCount: 3,
        publicWorkCount: 1,
        avgResponseHours: 6,
        registrationDays: 30,
        updatedAt: "2026-04-19T00:00:00.000Z",
      },
      legalAttestations: [],
      publicProjects: [],
    });
    vi.mocked(renderTrustCardPdf).mockResolvedValue(Buffer.from("%PDF-card"));

    const response = await getTrustCardPdfRoute(
      new NextRequest("http://localhost/api/v1/u/alice-ai-builder/trust-card.pdf"),
      { params: Promise.resolve({ slug: "alice-ai-builder" }) }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(getPublicTrustCardBySlug).toHaveBeenCalledWith("alice-ai-builder");
    expect(renderTrustCardPdf).toHaveBeenCalledTimes(1);
  });
});
