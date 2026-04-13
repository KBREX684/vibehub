import { test, expect } from "@playwright/test";

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/v1/health");
  expect(res.ok()).toBeTruthy();
  const json = (await res.json()) as { data?: { status?: string } };
  expect(json.data?.status).toBe("ok");
});
