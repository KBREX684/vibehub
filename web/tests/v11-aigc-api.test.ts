import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  authenticateRequest: vi.fn(),
  getSessionUserFromCookie: vi.fn(),
  rateLimitedResponse: vi.fn((retryAfterSeconds: number) => new Response("rate-limited", { status: 429, headers: { "retry-after": String(retryAfterSeconds) } })),
}));

vi.mock("@/lib/repositories/aigc.repository", () => ({
  getComplianceSettings: vi.fn(),
  updateComplianceSettings: vi.fn(),
  listAigcComplianceAuditTrail: vi.fn(),
  stampArtifactForUser: vi.fn(),
}));

import { GET as getComplianceSettingsRoute, PATCH as patchComplianceSettingsRoute } from "../src/app/api/v1/me/compliance-settings/route";
import { GET as getAuditTrailRoute } from "../src/app/api/v1/me/aigc-compliance/audit-trail/route";
import { POST as postArtifactStampRoute } from "../src/app/api/v1/artifacts/[artifactId]/aigc-stamp/route";
import { authenticateRequest, getSessionUserFromCookie } from "@/lib/auth";
import {
  getComplianceSettings,
  listAigcComplianceAuditTrail,
  stampArtifactForUser,
  updateComplianceSettings,
} from "@/lib/repositories/aigc.repository";

describe("v11 AIGC compliance API routes", () => {
  beforeEach(() => {
    vi.mocked(authenticateRequest).mockReset();
    vi.mocked(getSessionUserFromCookie).mockReset();
    vi.mocked(getComplianceSettings).mockReset();
    vi.mocked(updateComplianceSettings).mockReset();
    vi.mocked(listAigcComplianceAuditTrail).mockReset();
    vi.mocked(stampArtifactForUser).mockReset();
  });

  it("returns personal compliance settings for the current user", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({ userId: "u1", role: "user", name: "Alice" });
    vi.mocked(getComplianceSettings).mockResolvedValue({
      workspaceId: "personal:u1",
      aigcAutoStamp: true,
      aigcProvider: "local",
      ledgerEnabled: true,
    });

    const response = await getComplianceSettingsRoute();

    expect(response.status).toBe(200);
    expect(getComplianceSettings).toHaveBeenCalledWith("u1");
  });

  it("updates personal compliance settings", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      kind: "ok",
      user: { userId: "u1", role: "user", name: "Alice" },
    } as never);
    vi.mocked(updateComplianceSettings).mockResolvedValue({
      workspaceId: "personal:u1",
      aigcAutoStamp: false,
      aigcProvider: "aliyun",
      ledgerEnabled: false,
    });

    const response = await patchComplianceSettingsRoute(
      new NextRequest("http://localhost/api/v1/me/compliance-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          aigcAutoStamp: false,
          aigcProvider: "aliyun",
          ledgerEnabled: false,
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(updateComplianceSettings).toHaveBeenCalledWith({
      userId: "u1",
      aigcAutoStamp: false,
      aigcProvider: "aliyun",
      ledgerEnabled: false,
    });
  });

  it("lists the AIGC compliance audit trail", async () => {
    vi.mocked(getSessionUserFromCookie).mockResolvedValue({ userId: "u1", role: "user", name: "Alice" });
    vi.mocked(listAigcComplianceAuditTrail).mockResolvedValue({ items: [] });

    const response = await getAuditTrailRoute(
      new NextRequest("http://localhost/api/v1/me/aigc-compliance/audit-trail?month=2026-04")
    );

    expect(response.status).toBe(200);
    expect(listAigcComplianceAuditTrail).toHaveBeenCalledWith({
      userId: "u1",
      month: "2026-04",
    });
  });

  it("manually applies an AIGC stamp to an artifact", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue({
      kind: "ok",
      user: { userId: "u1", role: "user", name: "Alice" },
    } as never);
    vi.mocked(stampArtifactForUser).mockResolvedValue({
      artifact: { id: "wa_1" },
      stamp: { id: "stamp_1" },
    } as never);

    const response = await postArtifactStampRoute(
      new NextRequest("http://localhost/api/v1/artifacts/wa_1/aigc-stamp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force: true }),
      }),
      { params: Promise.resolve({ artifactId: "wa_1" }) }
    );

    expect(response.status).toBe(200);
    expect(stampArtifactForUser).toHaveBeenCalledWith({
      userId: "u1",
      artifactId: "wa_1",
      force: true,
    });
  });
});
