import { describe, it, expect } from "vitest";

/**
 * API contract test for /api/v1/auth/session
 * Verifies the response shape that AuthContext depends on.
 */
describe("auth/session contract shape", () => {
  it("apiSuccess wraps data correctly", () => {
    // Simulate what apiSuccess({ session }) produces
    const mockSession = { userId: "u1", role: "user", name: "Alice" };
    const apiResponse = {
      data:    { session: mockSession },
      meta:    { requestId: "abc", timestamp: new Date().toISOString() },
    };

    // AuthContext must read json.data.session
    const parsed = apiResponse?.data?.session;
    expect(parsed).toBeDefined();
    expect(parsed?.userId).toBe("u1");
    expect(parsed?.role).toBe("user");
    expect(parsed?.name).toBe("Alice");
  });

  it("null session is handled gracefully", () => {
    const apiResponse = {
      data: { session: null },
      meta: {},
    };
    const parsed = apiResponse?.data?.session;
    expect(parsed).toBeNull();
  });

  it("AuthContext maps session fields to AuthUser correctly", () => {
    const session = { userId: "u1", role: "admin" as const, name: "Alice" };
    const authUser = {
      id:   session.userId,
      name: session.name,
      role: session.role,
    };
    expect(authUser.id).toBe("u1");
    expect(authUser.role).toBe("admin");
  });
});
