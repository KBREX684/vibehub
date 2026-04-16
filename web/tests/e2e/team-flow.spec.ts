import { test, expect } from "@playwright/test";
import { encodeSession } from "../../src/lib/auth";
import { getDemoUser } from "../../src/lib/repository";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

/**
 * Uses the seeded `vibehub-core` team (mock + Prisma seed) so we do not depend on
 * free-tier team quotas or slug de-duplication when creating a brand-new team.
 */
test("team task board: create task on seeded team", async ({ page }) => {
  const demo = getDemoUser("admin");
  await page.context().addCookies([
    {
      name: "vibehub_session",
      value: encodeSession(demo),
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  await page.goto("/teams/vibehub-core");
  await expect(page.getByRole("heading", { level: 1, name: "VibeHub Core" })).toBeVisible();

  const title = `E2E task ${Date.now()}`;
  await page.getByRole("button", { name: /new task|cancel/i }).click();
  await page.locator("#team-task-title").fill(title);
  await page.getByTestId("team-task-create-submit").click();
  await expect(page.getByText(title)).toBeVisible();
});
