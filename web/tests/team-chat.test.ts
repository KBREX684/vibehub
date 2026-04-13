import { describe, it, expect, beforeEach } from "vitest";
import {
  createTeamChatMessage,
  listTeamChatMessages,
  pruneOldTeamChatMessages,
  chatRetentionCutoff,
} from "../src/lib/repository";
import { mockTeamChatMessages } from "../src/lib/data/mock-data";

describe("Team Chat Repository (mock mode)", () => {
  beforeEach(() => {
    // Reset mock state between tests
    mockTeamChatMessages.length = 0;
    mockTeamChatMessages.push(
      {
        id: "tcm_seed_1",
        teamId: "team1",
        authorId: "u1",
        body: "Hello team!",
        createdAt: new Date().toISOString(),
      },
      {
        id: "tcm_seed_2",
        teamId: "team1",
        authorId: "u2",
        body: "Hey there!",
        createdAt: new Date().toISOString(),
      }
    );
  });

  it("createTeamChatMessage: creates a message for a known team", async () => {
    const msg = await createTeamChatMessage({
      teamSlug: "vibehub-core",
      authorId: "u1",
      body: "New message from u1",
    });
    expect(msg.body).toBe("New message from u1");
    expect(msg.authorId).toBe("u1");
    expect(msg.teamSlug).toBe("vibehub-core");
  });

  it("createTeamChatMessage: throws TEAM_NOT_FOUND for unknown slug", async () => {
    await expect(
      createTeamChatMessage({ teamSlug: "no-such-team", authorId: "u1", body: "test" })
    ).rejects.toThrow("TEAM_NOT_FOUND");
  });

  it("createTeamChatMessage: throws INVALID_BODY for empty message", async () => {
    await expect(
      createTeamChatMessage({ teamSlug: "vibehub-core", authorId: "u1", body: "   " })
    ).rejects.toThrow("INVALID_BODY");
  });

  it("listTeamChatMessages: returns messages within retention window", async () => {
    const msgs = await listTeamChatMessages({ teamSlug: "vibehub-core" });
    expect(Array.isArray(msgs)).toBe(true);
    // Seed messages are new, so within window
    expect(msgs.length).toBeGreaterThanOrEqual(2);
  });

  it("listTeamChatMessages: excludes messages older than 7 days", async () => {
    const old = new Date();
    old.setUTCDate(old.getUTCDate() - 8);
    mockTeamChatMessages.push({
      id: "tcm_old",
      teamId: "team1",
      authorId: "u1",
      body: "Old message",
      createdAt: old.toISOString(),
    });
    const msgs = await listTeamChatMessages({ teamSlug: "vibehub-core" });
    expect(msgs.find((m) => m.id === "tcm_old")).toBeUndefined();
  });

  it("pruneOldTeamChatMessages: removes messages older than 7 days", async () => {
    const old = new Date();
    old.setUTCDate(old.getUTCDate() - 8);
    mockTeamChatMessages.push({
      id: "tcm_prune",
      teamId: "team1",
      authorId: "u1",
      body: "Should be pruned",
      createdAt: old.toISOString(),
    });

    const before = mockTeamChatMessages.length;
    const deleted = await pruneOldTeamChatMessages();
    expect(deleted).toBe(1);
    expect(mockTeamChatMessages.length).toBe(before - 1);
    expect(mockTeamChatMessages.find((m) => m.id === "tcm_prune")).toBeUndefined();
  });

  it("chatRetentionCutoff: is approximately 7 days ago", () => {
    const cutoff = chatRetentionCutoff();
    const nowMs = Date.now();
    const diff = nowMs - cutoff.getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(diff).toBeGreaterThanOrEqual(sevenDaysMs - 1000);
    expect(diff).toBeLessThanOrEqual(sevenDaysMs + 1000);
  });
});
