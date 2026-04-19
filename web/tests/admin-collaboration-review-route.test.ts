import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError } from "@/lib/response";

vi.mock("@/lib/admin-auth", () => ({
  requireAdminSession: vi.fn(),
}));

vi.mock("@/lib/repository", () => ({
  reviewCollaborationIntent: vi.fn(),
}));

import { POST as reviewAsAdmin } from "../src/app/api/v1/admin/collaboration-intents/[intentId]/review/route";
import { requireAdminSession } from "@/lib/admin-auth";
import { reviewCollaborationIntent } from "@/lib/repository";

describe("admin collaboration review route", () => {
  beforeEach(() => {
    vi.mocked(requireAdminSession).mockReset();
    vi.mocked(reviewCollaborationIntent).mockReset();
  });

  it("rejects non-admin sessions before touching the repository", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      ok: false,
      response: apiError({ code: "FORBIDDEN", message: "Admin role required" }, 403),
    });

    const response = await reviewAsAdmin(
      new Request("http://localhost/api/v1/admin/collaboration-intents/ci_1/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      { params: Promise.resolve({ intentId: "ci_1" }) }
    );

    expect(response.status).toBe(403);
    expect(reviewCollaborationIntent).not.toHaveBeenCalled();
  });

  it("passes admin review without project-owner fallback state", async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({
      ok: true,
      session: { userId: "admin_1", role: "admin", name: "Admin" },
    });
    vi.mocked(reviewCollaborationIntent).mockResolvedValue({ id: "ci_1", status: "approved" } as never);

    const response = await reviewAsAdmin(
      new Request("http://localhost/api/v1/admin/collaboration-intents/ci_1/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      }),
      { params: Promise.resolve({ intentId: "ci_1" }) }
    );

    expect(response.status).toBe(200);
    expect(reviewCollaborationIntent).toHaveBeenCalledWith({
      intentId: "ci_1",
      action: "approve",
      note: undefined,
      adminUserId: "admin_1",
      inviteApplicantToTeamOnApprove: undefined,
    });
  });
});
