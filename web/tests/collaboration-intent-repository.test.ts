import { describe, expect, it } from "vitest";
import {
  createCollaborationIntent,
  listCollaborationIntentsForModeration,
  listProjectCollaborationIntents,
  reviewCollaborationIntent,
} from "../src/lib/repository";

describe("collaboration intent flow", () => {
  it("new collaboration intent should enter moderation queue as pending", async () => {
    const created = await createCollaborationIntent({
      projectId: "p1",
      applicantId: "u2",
      intentType: "join",
      message: "I can contribute to backend API design and E2E reliability.",
      contact: "bob@vibehub.dev",
    });

    expect(created.status).toBe("pending");

    const queue = await listCollaborationIntentsForModeration({ status: "pending", page: 1, limit: 200 });
    expect(queue.items.some((item) => item.id === created.id)).toBe(true);

    const projectApprovedOnly = await listProjectCollaborationIntents({
      projectId: "p1",
      status: "approved",
      page: 1,
      limit: 200,
    });
    expect(projectApprovedOnly.items.some((item) => item.id === created.id)).toBe(false);
  });

  it("approved collaboration intent should appear in approved project list", async () => {
    const created = await createCollaborationIntent({
      projectId: "p1",
      applicantId: "u3",
      intentType: "recruit",
      message: "Recruiting frontend collaborator for interactive gallery iteration.",
    });

    const reviewed = await reviewCollaborationIntent({
      intentId: created.id,
      action: "approve",
      note: "Compliant and useful",
      adminUserId: "u1",
    });

    expect(reviewed.status).toBe("approved");
    expect(reviewed.reviewedBy).toBe("u1");

    const approvedList = await listProjectCollaborationIntents({
      projectId: "p1",
      status: "approved",
      page: 1,
      limit: 200,
    });
    expect(approvedList.items.some((item) => item.id === created.id)).toBe(true);
  });

  it("should throw PROJECT_NOT_FOUND if project does not exist", async () => {
    await expect(
      createCollaborationIntent({
        projectId: "missing-project",
        applicantId: "u2",
        intentType: "join",
        message: "I am ready to collaborate.",
      })
    ).rejects.toThrow("PROJECT_NOT_FOUND");
  });

  it("allows project owner to review via admin queue path when projectOwnerUserId matches", async () => {
    const created = await createCollaborationIntent({
      projectId: "p1",
      applicantId: "u3",
      intentType: "join",
      message: "Owner-queue review test.",
    });

    const reviewed = await reviewCollaborationIntent({
      intentId: created.id,
      action: "approve",
      adminUserId: "u1",
      projectOwnerUserId: "u1",
    });

    expect(reviewed.status).toBe("approved");
    expect(reviewed.reviewedBy).toBe("u1");
  });

  it("rejects admin queue review when projectOwnerUserId is not the project creator", async () => {
    const created = await createCollaborationIntent({
      projectId: "p2",
      applicantId: "u1",
      intentType: "join",
      message: "Wrong owner test.",
    });

    await expect(
      reviewCollaborationIntent({
        intentId: created.id,
        action: "reject",
        adminUserId: "u1",
        projectOwnerUserId: "u1",
      })
    ).rejects.toThrow("FORBIDDEN_NOT_PROJECT_OWNER");
  });
});