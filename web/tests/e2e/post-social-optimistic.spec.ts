import { test, expect } from "@playwright/test";
import { encodeSession } from "../../src/lib/auth";
import { getDemoUser } from "../../src/lib/repository";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

/**
 * P2-FE-4: optimistic like / save on discussion detail — counts should update without full reload.
 */
test.describe("Post social actions (optimistic)", () => {
  test("like and save update counts on discussion detail", async ({ page }) => {
    const demo = getDemoUser("user");
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
    // Go directly to a seeded discussion detail page (no dependency on paginated listings).
    await page.goto("/discussions/how-i-built-an-agent-ready-project-page");
    await expect(page).toHaveURL(/\/discussions\/how-i-built-an-agent-ready-project-page/);

    const likeBtn = page.getByRole("button", { name: /like/i }).first();
    const saveBtn = page.getByRole("button", { name: /bookmark|save/i }).first();
    await expect(likeBtn).toBeVisible({ timeout: 15_000 });
    await expect(saveBtn).toBeVisible();

    const likeTextBefore = await likeBtn.textContent();
    await likeBtn.click();
    await expect(likeBtn).not.toHaveText(likeTextBefore ?? "", { timeout: 5000 });
    // Wait for like API round-trip before toggling bookmark (both share a `loading` guard).
    await expect(likeBtn).not.toBeDisabled({ timeout: 5000 });

    const saveTextBefore = await saveBtn.textContent();
    await saveBtn.click();
    await expect(saveBtn).not.toHaveText(saveTextBefore ?? "", { timeout: 5000 });
  });
});
