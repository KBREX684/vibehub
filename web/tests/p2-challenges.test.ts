import { describe, expect, it } from "vitest";
import {
  createChallenge,
  getChallengeBySlug,
  listChallenges,
  updateChallenge,
  deleteChallenge,
} from "../src/lib/repository";

describe("Challenge CRUD", () => {
  it("creates a challenge", async () => {
    const ch = await createChallenge({
      title: "Test Challenge",
      description: "A challenge for testing purposes.",
      tags: ["test"],
      startDate: new Date(Date.UTC(2026, 5, 1)).toISOString(),
      endDate: new Date(Date.UTC(2026, 5, 7)).toISOString(),
      createdByUserId: "u1",
    });
    expect(ch.title).toBe("Test Challenge");
    expect(ch.status).toBe("draft");
    expect(ch.slug).toContain("test-challenge");
  });

  it("lists challenges", async () => {
    const result = await listChallenges({ page: 1, limit: 10 });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.pagination.total).toBeGreaterThan(0);
  });

  it("filters challenges by status", async () => {
    const result = await listChallenges({ status: "active", page: 1, limit: 10 });
    result.items.forEach((ch) => expect(ch.status).toBe("active"));
  });

  it("gets challenge by slug", async () => {
    const ch = await createChallenge({
      title: "Findable Challenge",
      description: "This challenge can be found by slug.",
      tags: [],
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      createdByUserId: "u1",
    });
    const found = await getChallengeBySlug(ch.slug);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(ch.id);
  });

  it("returns null for non-existent slug", async () => {
    const found = await getChallengeBySlug("nonexistent-challenge");
    expect(found).toBeNull();
  });

  it("updates a challenge", async () => {
    const ch = await createChallenge({
      title: "Updatable Challenge",
      description: "Will be updated.",
      tags: [],
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      createdByUserId: "u1",
    });
    const updated = await updateChallenge({
      challengeSlug: ch.slug,
      title: "Updated Challenge Title",
      status: "active",
    });
    expect(updated.title).toBe("Updated Challenge Title");
    expect(updated.status).toBe("active");
  });

  it("throws CHALLENGE_NOT_FOUND on update of non-existent", async () => {
    await expect(
      updateChallenge({ challengeSlug: "ghost", title: "X" })
    ).rejects.toThrow("CHALLENGE_NOT_FOUND");
  });

  it("deletes a challenge", async () => {
    const ch = await createChallenge({
      title: "Deletable Challenge",
      description: "Will be deleted.",
      tags: [],
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      createdByUserId: "u1",
    });
    await deleteChallenge(ch.slug);
    const found = await getChallengeBySlug(ch.slug);
    expect(found).toBeNull();
  });

  it("throws CHALLENGE_NOT_FOUND on delete of non-existent", async () => {
    await expect(deleteChallenge("ghost")).rejects.toThrow("CHALLENGE_NOT_FOUND");
  });
});
