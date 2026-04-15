import { test, expect } from "@playwright/test";

test.describe("Profile settings flow", () => {
  test("user can update headline and website from settings profile", async ({ page }) => {
    const baseUrl = "http://localhost:3100";
    await page.goto(`${baseUrl}/login?redirect=/settings`);
    await page.getByRole("link", { name: /demo user login|auth\.demo_user_login/i }).click();
    await page.waitForURL(/\/settings$/);

    await page.getByRole("link", { name: /profile|settings\.profile/i }).click();
    await expect(page).toHaveURL(/\/settings\/profile/);
    await expect(
      page.getByRole("heading", { name: /profile settings|settings\.profile_heading/i })
    ).toBeVisible();

    const form = page.locator("form").first();
    const headline = form.getByLabel(/headline/i);
    await headline.fill("E2E full-stack builder");

    const website = form.getByLabel(/^website$/i);
    await website.fill("https://e2e-profile.example");

    await form.getByRole("button", { name: /save profile/i }).click();
    await expect(page.getByText(/profile saved\./i)).toBeVisible();
  });
});
