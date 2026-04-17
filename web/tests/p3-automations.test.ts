import { describe, expect, it } from "vitest";
import { listTeamDiscussions } from "../src/lib/repository";
import {
  createUserAutomationWorkflow,
  dispatchAutomationWorkflows,
  listUserAutomationRuns,
  listUserAutomationWorkflows,
} from "../src/lib/workflow-automation";

describe("automations (P3-3/P3-5 mock)", () => {
  it("creates a workflow, dispatches on matching event, and records a run", async () => {
    const workflow = await createUserAutomationWorkflow({
      userId: "u1",
      name: "Review Escalation",
      triggerEvent: "team.task_ready_for_review",
      filterJson: { teamSlug: "vibehub-core" },
      steps: [
        {
          actionType: "create_team_discussion",
          config: {
            teamSlug: "{{payload.teamSlug}}",
            title: "Automation: review {{payload.taskTitle}}",
            body: "Task {{payload.taskId}} is ready for review.",
          },
        },
      ],
    });

    const workflows = await listUserAutomationWorkflows("u1");
    expect(workflows.some((item) => item.id === workflow.id)).toBe(true);

    await dispatchAutomationWorkflows("u1", "team.task_ready_for_review", {
      teamSlug: "vibehub-core",
      taskId: "tt_mock_review",
      taskTitle: "Prompt QA",
    });

    const discussions = await listTeamDiscussions({
      teamSlug: "vibehub-core",
      viewerUserId: "u1",
      page: 1,
      limit: 20,
    });
    expect(discussions.items.some((item) => item.title.includes("Prompt QA"))).toBe(true);

    const runs = await listUserAutomationRuns("u1");
    expect(runs.some((run) => run.workflowId === workflow.id && run.status === "succeeded")).toBe(true);
  });

  it("redacts sensitive automation config in user-visible summaries", async () => {
    const workflow = await createUserAutomationWorkflow({
      userId: "u1",
      name: "GitHub Dispatch",
      triggerEvent: "team.task_ready_for_review",
      steps: [
        {
          actionType: "trigger_github_repository_dispatch",
          config: {
            owner: "acme",
            repo: "ops",
            token: "ghp_example_secret_token_1234",
            eventType: "vibehub_event",
          },
        },
      ],
    });

    const workflows = await listUserAutomationWorkflows("u1");
    const created = workflows.find((item) => item.id === workflow.id);
    expect(created).toBeTruthy();
    expect(created?.steps[0]?.config.token).not.toBe("ghp_example_secret_token_1234");
  });
});
