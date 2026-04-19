import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  authenticateRequest: vi.fn(),
  getSessionUserFromCookie: vi.fn(),
  rateLimitedResponse: vi.fn((retryAfterSeconds: number) => new Response("rate-limited", { status: 429, headers: { "retry-after": String(retryAfterSeconds) } })),
  resolveReadAuth: vi.fn(),
}));

vi.mock("@/lib/repositories/opc-profile.repository", () => ({
  getOpcTrustMetric: vi.fn(),
  getOrCreateOpcProfile: vi.fn(),
  updateOpcProfile: vi.fn(),
  getPersonalWorkspaceOverview: vi.fn(),
  getPublicTrustCardBySlug: vi.fn(),
}));

import { GET as getPersonalWorkspaceRoute } from "../src/app/api/v1/me/workspaces/personal/route";
import { GET as getOpcProfileRoute, PATCH as patchOpcProfileRoute } from "../src/app/api/v1/me/opc-profile/route";
import { GET as getTrustCardRoute } from "../src/app/api/v1/u/[slug]/trust-card/route";
import {
  authenticateRequest,
  getSessionUserFromCookie,
  resolveReadAuth,
} from "@/lib/auth";
import {
  getOpcTrustMetric,
  getOrCreateOpcProfile,
  getPersonalWorkspaceOverview,
  getPublicTrustCardBySlug,
  updateOpcProfile,
} from "@/lib/repositories/opc-profile.repository";

describe("v11 opc profile API routes", () => {
  beforeEach(() => {
    vi.mocked(authenticateRequest).mockReset();
    vi.mocked(getSessionUserFromCookie).mockReset();
    vi.mocked(resolveReadAuth).mockReset();
    vi.mocked(getOpcTrustMetric).mockReset();
    vi.mocked(getOrCreateOpcProfile).mockReset();
    vi.mocked(updateOpcProfile).mockReset();
    vi.mocked(getPersonalWorkspaceOverview).mockReset();
    vi.mocked(getPublicTrustCardBySlug).mockReset();
  });

  it("returns the personal workspace overview for the current user", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({ userId: "u1", role: "user", name: "Alice" });
    vi.mocked(getPersonalWorkspaceOverview).mockResolvedValue({
      workspaceId: "personal:u1",
      title: "个人工作区",
      metrics: { monthlyLedgerCount: 12, aigcStampCoveragePct: 80 },
    });

    const response = await getPersonalWorkspaceRoute();

    expect(response.status).toBe(200);
    expect(getPersonalWorkspaceOverview).toHaveBeenCalledWith("u1");
  });

  it("returns opc profile and trust metrics for the current user", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      kind: "ok",
      user: { userId: "u1", role: "user", name: "Alice" },
    } as never);
    vi.mocked(getOrCreateOpcProfile).mockResolvedValue({
      id: "opc_1",
      userId: "u1",
      headline: "可信交付工程师",
      publicCard: true,
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
    });
    vi.mocked(getOpcTrustMetric).mockResolvedValue({
      id: "metric_1",
      userId: "u1",
      ledgerEntryCount: 10,
      snapshotCount: 2,
      stampedArtifactCount: 3,
      publicWorkCount: 1,
      avgResponseHours: 6,
      registrationDays: 30,
      updatedAt: "2026-04-19T00:00:00.000Z",
    });

    const response = await getOpcProfileRoute(new NextRequest("http://localhost/api/v1/me/opc-profile"));

    expect(response.status).toBe(200);
    expect(getOrCreateOpcProfile).toHaveBeenCalledWith("u1");
    expect(getOpcTrustMetric).toHaveBeenCalledWith("u1");
  });

  it("updates opc profile fields", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      kind: "ok",
      user: { userId: "u1", role: "user", name: "Alice" },
    } as never);
    vi.mocked(updateOpcProfile).mockResolvedValue({
      id: "opc_1",
      userId: "u1",
      headline: "可信交付工程师",
      summary: "专注 AI 交付留痕",
      publicCard: true,
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T01:00:00.000Z",
    });
    vi.mocked(getOpcTrustMetric).mockResolvedValue({
      id: "metric_1",
      userId: "u1",
      ledgerEntryCount: 12,
      snapshotCount: 3,
      stampedArtifactCount: 4,
      publicWorkCount: 1,
      avgResponseHours: 5,
      registrationDays: 30,
      updatedAt: "2026-04-19T01:00:00.000Z",
    });

    const response = await patchOpcProfileRoute(
      new NextRequest("http://localhost/api/v1/me/opc-profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          headline: "可信交付工程师",
          summary: "专注 AI 交付留痕",
          publicCard: true,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(updateOpcProfile).toHaveBeenCalledWith({
      userId: "u1",
      headline: "可信交付工程师",
      summary: "专注 AI 交付留痕",
      serviceScope: undefined,
      city: undefined,
      websiteUrl: undefined,
      proofUrl: undefined,
      publicCard: true,
    });
  });

  it("returns a public trust card by creator slug", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({ kind: "unauthorized" } as never);
    vi.mocked(resolveReadAuth).mockReturnValue({ ok: true, user: null } as never);
    vi.mocked(getPublicTrustCardBySlug).mockResolvedValue({
      slug: "alice-ai-builder",
      creatorName: "Alice",
      headline: "可信交付工程师",
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

    const response = await getTrustCardRoute(
      new NextRequest("http://localhost/api/v1/u/alice-ai-builder/trust-card"),
      { params: Promise.resolve({ slug: "alice-ai-builder" }) }
    );

    expect(response.status).toBe(200);
    expect(getPublicTrustCardBySlug).toHaveBeenCalledWith("alice-ai-builder");
  });
});
