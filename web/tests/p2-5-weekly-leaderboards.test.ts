import { describe, expect, it } from "vitest";
import {
  getMaterializedWeeklyLeaderboardSnapshot,
  getWeeklyLeaderboardPublicPayload,
  materializeWeeklyLeaderboardSnapshot,
  parseUtcWeekStartParam,
  startOfUtcWeekContaining,
} from "../src/lib/repository";

describe("P2-5 weekly leaderboards", () => {
  it("parses UTC Monday week param and rejects non-Mondays", () => {
    const monday = parseUtcWeekStartParam("2026-04-06");
    expect(monday).not.toBeNull();
    expect(monday!.toISOString()).toBe("2026-04-06T00:00:00.000Z");
    expect(parseUtcWeekStartParam("2026-04-05")).toBeNull();
  });

  it("computes start of UTC week containing a date", () => {
    const wed = new Date(Date.UTC(2026, 3, 8, 12, 0, 0));
    expect(startOfUtcWeekContaining(wed).toISOString()).toBe("2026-04-06T00:00:00.000Z");
  });

  it("materializes mock weekly snapshots and serves them as public payload", async () => {
    const weekStart = startOfUtcWeekContaining(new Date());
    await materializeWeeklyLeaderboardSnapshot({
      weekStart,
      kind: "discussions_by_weekly_comment_count",
      limit: 10,
      actorId: "u1",
    });

    const stored = await getMaterializedWeeklyLeaderboardSnapshot(
      weekStart,
      "discussions_by_weekly_comment_count"
    );
    expect(stored).not.toBeNull();
    expect(stored!.rows.length).toBeGreaterThan(0);

    const publicPayload = await getWeeklyLeaderboardPublicPayload({
      weekStart,
      kind: "discussions_by_weekly_comment_count",
      limit: 10,
    });
    expect(publicPayload.source).toBe("materialized");
    expect(publicPayload.generatedAt).toBeDefined();
    expect(publicPayload.rows[0]?.rank).toBe(1);
  });
});
