import { describe, expect, it } from "vitest";
import { getContributionCredit, refreshContributionCredit, listContributionLeaderboard } from "../src/lib/repository";

describe("ContributionCredit", () => {
  it("getContributionCredit returns existing credit", async () => {
    const credit = await getContributionCredit("u1");
    expect(credit).not.toBeNull();
    expect(credit!.userId).toBe("u1");
    expect(credit!.score).toBeGreaterThan(0);
  });

  it("getContributionCredit returns null for non-existent user", async () => {
    const credit = await getContributionCredit("nonexistent");
    expect(credit).toBeNull();
  });

  it("refreshContributionCredit computes score from source data", async () => {
    const credit = await refreshContributionCredit("u1");
    expect(credit.userId).toBe("u1");
    expect(typeof credit.score).toBe("number");
    expect(credit.score).toBeGreaterThanOrEqual(0);
    expect(credit.postsAuthored).toBeGreaterThanOrEqual(0);
    expect(credit.commentsAuthored).toBeGreaterThanOrEqual(0);
  });

  it("refreshContributionCredit creates credit for new user", async () => {
    const credit = await refreshContributionCredit("u3");
    expect(credit.userId).toBe("u3");
    expect(typeof credit.score).toBe("number");
  });

  it("listContributionLeaderboard returns sorted results", async () => {
    const leaderboard = await listContributionLeaderboard(10);
    expect(leaderboard.length).toBeGreaterThan(0);
    for (let i = 1; i < leaderboard.length; i++) {
      expect(leaderboard[i - 1].score).toBeGreaterThanOrEqual(leaderboard[i].score);
    }
  });
});
