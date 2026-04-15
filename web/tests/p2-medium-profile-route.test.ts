import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { PATCH as patchProfile } from "../src/app/api/v1/me/profile/route";
import { encodeSession } from "../src/lib/auth";
import { getDemoUser } from "../src/lib/repository";

function authedPatchRequest(body: unknown): NextRequest {
  const session = getDemoUser("user");
  const token = encodeSession(session);
  return new NextRequest("http://localhost/api/v1/me/profile", {
    method: "PATCH",
    headers: {
      cookie: `vibehub_session=${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("P2 medium: profile PATCH validation", () => {
  it("rejects too-long headline", async () => {
    const req = authedPatchRequest({ headline: "x".repeat(201) });
    const res = await patchProfile(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("INVALID_HEADLINE");
  });

  it("accepts social links and avatar url", async () => {
    const req = authedPatchRequest({
      headline: "Builder profile",
      bio: "Focused on agent workflows and product delivery.",
      skills: ["Next.js", "Prisma"],
      avatarUrl: "https://avatars.githubusercontent.com/u/1002",
      websiteUrl: "https://example.com",
      githubUrl: "https://github.com/example",
      twitterUrl: "https://x.com/example",
      linkedinUrl: "https://linkedin.com/in/example",
    });
    const res = await patchProfile(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.profile.avatarUrl).toBe("https://avatars.githubusercontent.com/u/1002");
    expect(json.data.profile.websiteUrl).toBe("https://example.com/");
  });

  it("ignores invalid links and keeps previous persisted values", async () => {
    const req = authedPatchRequest({
      avatarUrl: "javascript:alert(1)",
      websiteUrl: "not-a-url",
    });
    const res = await patchProfile(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.profile.avatarUrl).toBe("https://avatars.githubusercontent.com/u/1002");
    expect(json.data.profile.websiteUrl).toBe("https://example.com/");
  });
});
