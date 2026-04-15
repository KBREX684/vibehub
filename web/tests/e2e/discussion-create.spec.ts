import { test, expect } from "@playwright/test";

test.use({ baseURL: "http://localhost:3100" });

test.describe("Discussion creation flow", () => {
  test("user can submit a new discussion for moderation", async ({ page }) => {
    await page.goto("/login?redirect=/discussions/new");
    await page.getByRole("link", { name: /demo user login|演示用户登录/i }).click();
    await page.waitForURL((url) => url.pathname === "/discussions/new");
    await expect(
      page.getByRole("heading", { name: /new discussion|discussions\.new\.title/i })
    ).toBeVisible();

    await page.getByPlaceholder("What do you want to discuss?").fill(`E2E Discussion ${Date.now()}`);
    await page.getByPlaceholder("Share your thoughts, questions, or insights…").fill(
      "This discussion is created by Playwright to validate the P2 high-difficulty E2E expansion."
    );
    await page.getByPlaceholder("e.g. nextjs").fill("playwright");
    await page.locator('button[type="button"]').filter({ has: page.locator("svg") }).first().click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /submit for review/i }).click();

    await expect(page).toHaveURL(/\/discussions\/.+|\/discussions$/);
  });
});
