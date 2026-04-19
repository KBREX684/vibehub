import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/admin-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/repositories/pmf.repository", () => ({
  recordPmfEvent: vi.fn(),
  getV11PmfDashboard: vi.fn(),
}));

import { POST as recordPmfEventRoute } from "../src/app/api/v1/internal/pmf/event/route";
import { GET as getPmfDashboardRoute } from "../src/app/api/v1/admin/v11-pmf-dashboard/route";
import { requireAdminSession } from "@/lib/admin-auth";
import { getV11PmfDashboard, recordPmfEvent } from "@/lib/repositories/pmf.repository";

describe("v11 PMF API routes", () => {
  beforeEach(() => {
    vi.mocked(requireAdminSession).mockReset();
    vi.mocked(recordPmfEvent).mockReset();
    vi.mocked(getV11PmfDashboard).mockReset();
    process.env.INTERNAL_SERVICE_SECRET = "internal-secret";
  });

  it("rejects internal PMF events without the internal secret", async () => {
    const response = await recordPmfEventRoute(
      new NextRequest("http://localhost/api/v1/internal/pmf/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: "u1", event: "ledger.exported" }),
      })
    );

    expect(response.status).toBe(403);
    expect(recordPmfEvent).not.toHaveBeenCalled();
  });

  it("records PMF events with the internal secret", async () => {
    vi.mocked(recordPmfEvent).mockResolvedValue({
      id: "pmf_1",
      userId: "u1",
      event: "ledger.exported",
      metadata: undefined,
      createdAt: "2026-04-19T12:00:00.000Z",
    } as never);

    const response = await recordPmfEventRoute(
      new NextRequest("http://localhost/api/v1/internal/pmf/event", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-secret": "internal-secret",
        },
        body: JSON.stringify({ userId: "u1", event: "ledger.exported" }),
      })
    );

    expect(response.status).toBe(201);
    expect(recordPmfEvent).toHaveBeenCalledWith({
      userId: "u1",
      event: "ledger.exported",
      metadata: undefined,
      createdAt: undefined,
    });
  });

  it("returns the admin PMF dashboard", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      ok: true,
      session: { userId: "admin_1", role: "admin", name: "Admin" },
    } as never);
    vi.mocked(getV11PmfDashboard).mockResolvedValue({
      windowDays: 30,
      windowStart: "2026-03-20T00:00:00.000Z",
      generatedAt: "2026-04-19T12:00:00.000Z",
      totals: {
        activeUsers: 10,
        complianceEnabledUsers: 7,
        usersWithLedgerExports: 4,
        proUsers: 2,
      },
      rates: {
        complianceEnabledRate: 70,
        monthlyLedgerExportRate: 40,
        proConversionRate: 20,
      },
      eventBreakdown: [{ event: "ledger.exported", count: 4 }],
    });

    const response = await getPmfDashboardRoute(
      new NextRequest("http://localhost/api/v1/admin/v11-pmf-dashboard?windowDays=30")
    );

    expect(response.status).toBe(200);
    expect(getV11PmfDashboard).toHaveBeenCalledWith(30);
  });
});
