import { describe, expect, it } from "vitest";
import { groupNotificationsForDisplay } from "../src/app/notifications/notification-grouping";
import type { InAppNotification } from "../src/lib/types";

describe("groupNotificationsForDisplay", () => {
  it("merges post_liked for same post slug", () => {
    const items: InAppNotification[] = [
      {
        id: "n1",
        kind: "post_liked",
        title: "Like",
        body: "A liked",
        createdAt: "2026-01-02T00:00:00.000Z",
        metadata: { postSlug: "my-post" },
      },
      {
        id: "n2",
        kind: "post_liked",
        title: "Like",
        body: "B liked",
        createdAt: "2026-01-03T00:00:00.000Z",
        metadata: { postSlug: "my-post" },
      },
      {
        id: "n3",
        kind: "team_join_request",
        title: "Join",
        body: "Someone wants in",
        createdAt: "2026-01-01T00:00:00.000Z",
        metadata: { teamSlug: "t1" },
      },
    ];
    const rows = groupNotificationsForDisplay(items);
    const likeRow = rows.find((r) => r.kind === "post_liked");
    expect(likeRow?.ids).toEqual(["n2", "n1"]);
    expect(likeRow?.title).toContain("2 people");
  });
});
