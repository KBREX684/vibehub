import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as createTeamRoute } from "../src/app/api/v1/teams/route";
import { POST as submitIntentRoute } from "../src/app/api/v1/projects/[slug]/collaboration-intents/route";
import { buildOpenApiDocument } from "../src/lib/openapi-spec";
import { createTeam, submitCollaborationIntent } from "../src/lib/repository";
import { isRepositoryError } from "../src/lib/repository-errors";

describe("v11 P0 deprecation guards", () => {
  const previousLockdown = process.env.V11_BACKEND_LOCKDOWN;

  beforeEach(() => {
    process.env.V11_BACKEND_LOCKDOWN = "true";
  });

  afterEach(() => {
    if (previousLockdown === undefined) {
      delete process.env.V11_BACKEND_LOCKDOWN;
    } else {
      process.env.V11_BACKEND_LOCKDOWN = previousLockdown;
    }
  });

  it("POST /api/v1/teams returns 410 with deprecated payload and headers", async () => {
    const response = await createTeamRoute(
      new Request("http://localhost/api/v1/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Deprecated Team" }),
      })
    );

    expect(response.status).toBe(410);
    expect(response.headers.get("x-deprecated")).toBe("true");
    const json = (await response.json()) as {
      error: { code: string; deprecatedSince?: string; learnMoreUrl?: string };
    };
    expect(json.error.code).toBe("TEAMS_DEPRECATED");
    expect(json.error.deprecatedSince).toBe("2026-04-19");
    expect(json.error.learnMoreUrl).toBe("/v11");
  });

  it("POST /api/v1/projects/:slug/collaboration-intents returns 410", async () => {
    const response = await submitIntentRoute(
      new NextRequest("http://localhost/api/v1/projects/demo/collaboration-intents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intentType: "join",
          pitch: "我负责前端与交付联调",
          whyYou: "我长期做 React 与交付规范",
          howCollab: "先从本周交付与文档规范开始接手",
        }),
      }),
      { params: Promise.resolve({ slug: "demo-project" }) }
    );

    expect(response.status).toBe(410);
    expect(response.headers.get("x-deprecated")).toBe("true");
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe("INTENTS_DEPRECATED");
  });

  it("repository.createTeam throws TEAMS_DEPRECATED under lockdown", async () => {
    await expect(
      createTeam({
        ownerUserId: "u1",
        name: "Blocked Team",
      })
    ).rejects.toSatisfy((error: unknown) => {
      expect(isRepositoryError(error)).toBe(true);
      if (isRepositoryError(error)) {
        expect(error.code).toBe("TEAMS_DEPRECATED");
        expect(error.httpStatus).toBe(410);
      }
      return true;
    });
  });

  it("repository.submitCollaborationIntent throws INTENTS_DEPRECATED under lockdown", async () => {
    await expect(
      submitCollaborationIntent({
        projectId: "p1",
        applicantId: "u2",
        intentType: "join",
        pitch: "我能补上测试与接口联调",
        whyYou: "我熟悉仓库结构和当前工作区流程",
        howCollab: "先接手下一轮交付并补齐文档",
      })
    ).rejects.toSatisfy((error: unknown) => {
      expect(isRepositoryError(error)).toBe(true);
      if (isRepositoryError(error)) {
        expect(error.code).toBe("INTENTS_DEPRECATED");
        expect(error.httpStatus).toBe(410);
      }
      return true;
    });
  });

  it("OpenAPI marks legacy writes as deprecated", () => {
    const doc = buildOpenApiDocument() as {
      paths: Record<string, Record<string, { deprecated?: boolean; responses?: Record<string, unknown> }>>;
    };
    expect(doc.paths["/api/v1/teams"]?.post?.deprecated).toBe(true);
    expect(doc.paths["/api/v1/teams"]?.post?.responses?.["410"]).toBeDefined();
    expect(doc.paths["/api/v1/projects/{slug}/collaboration-intents"]?.post?.deprecated).toBe(true);
  });
});
