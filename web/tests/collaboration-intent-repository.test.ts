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
      pitch: "我可以补上后端 API 设计和 E2E 稳定性。",
      whyYou: "我长期负责接口治理、类型约束和 CI 质量。",
      howCollab: "先从本周的 API 收口和回归测试开始接手。",
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
      pitch: "我们正在寻找前端协作者共同迭代交互展示。",
      whyYou: "你有可见的界面打磨经验，适合这一轮交付。",
      howCollab: "先接交互原型和页面联调，按快照节奏推进。",
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
        pitch: "我已经准备好参与协作。",
        whyYou: "我能补足当前缺失的实现与联调。",
        howCollab: "先从当前待办和文档整理开始。",
      })
    ).rejects.toThrow("PROJECT_NOT_FOUND");
  });

  it("allows project owner to review via admin queue path when projectOwnerUserId matches", async () => {
    const created = await createCollaborationIntent({
      projectId: "p1",
      applicantId: "u3",
      intentType: "join",
      pitch: "这里是所有者审核队列测试。",
      whyYou: "我能配合验证结构化协作流程。",
      howCollab: "通过审批后先从当前交付链开始协作。",
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
      pitch: "这里是错误 owner 测试。",
      whyYou: "用于验证 owner 匹配约束。",
      howCollab: "不发生真实协作，只验证流程。",
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
