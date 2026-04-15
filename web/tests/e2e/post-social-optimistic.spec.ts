import { test, expect } from "@playwright/test";

/**
 * P2-FE-4: optimistic like / save on discussion detail — counts should update without full reload.
 */
test.describe("Post social actions (optimistic)", () => {
  test("like and save update counts on discussion detail", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /demo user login|auth\.demo_user_login/i }).click();
    await page.waitForLoadState("networkidle");

    await page.goto("/discussions");
    await page.waitForLoadState("networkidle");

    const firstPostLink = page.locator('a[href^="/discussions/"]').first();
    await expect(firstPostLink).toBeVisible({ timeout: 15_000 });
    await firstPostLink.click();
    await page.waitForURL(/\/discussions\/[^/]+$/);

    const likeBtn = page.getByRole("button", { name: /like/i }).first();
    const saveBtn = page.getByRole("button", { name: /bookmark|save/i }).first();
    await expect(likeBtn).toBeVisible({ timeout: 15_000 });
    await expect(saveBtn).toBeVisible();

    const likeTextBefore = await likeBtn.textContent();
    await likeBtn.click();
    await expect(likeBtn).not.toHaveText(likeTextBefore ?? "", { timeout: 5000 });

    const saveTextBefore = await saveBtn.textContent();
    await saveBtn.click();
    await expect(saveBtn).not.toHaveText(saveTextBefore ?? "", { timeout: 5000 });
  });
});
