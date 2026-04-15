import { test, expect } from "@playwright/test";

test.describe("Error UX", () => {
  test("404 page shows recovery action", async ({ page }) => {
    await page.goto("/definitely-missing-page-for-e2e");
    await expect(page.getByRole("heading", { name: /page not found|页面未找到/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to home|返回首页/i })).toBeVisible();
  });
});
