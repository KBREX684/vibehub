import { describe, expect, it } from "vitest";
import { encodeSession } from "../src/lib/auth";
import { decodeSessionEdge } from "../src/lib/session-edge";

describe("decodeSessionEdge (P0-BE-3)", () => {
  it("matches encodeSession output for admin session", async () => {
    const raw = encodeSession({
      userId: "u-admin",
      role: "admin",
      name: "Admin",
      sessionVersion: 2,
    });
    const edge = await decodeSessionEdge(raw);
    expect(edge).not.toBeNull();
    expect(edge!.userId).toBe("u-admin");
    expect(edge!.role).toBe("admin");
    expect(edge!.sessionVersion).toBe(2);
  });

  it("returns null for tampered payload", async () => {
    const raw = encodeSession({ userId: "u1", role: "user", name: "A" });
    const [payload, sig] = raw.split(".");
    const tampered = `${payload}xxx.${sig}`;
    expect(await decodeSessionEdge(tampered)).toBeNull();
  });
});
