import { test, expect } from "@playwright/test";
import { encodeSession } from "../../src/lib/auth";
import { getDemoUser } from "../../src/lib/repository";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

test.describe("Profile settings flow", () => {
  test("user can update headline and website from settings profile", async ({ page }) => {
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
    await page.goto("/settings/profile");
    await expect(
      page.getByRole("heading", { name: /profile settings/i })
    ).toBeVisible();

    const form = page.locator("form").first();
    await form.getByLabel(/headline/i).fill("E2E full-stack builder");
    await form.getByLabel(/^website$/i).fill("https://e2e-profile.example");

    await form.getByRole("button", { name: /save profile/i }).click();
    await expect(page.getByText(/profile saved\./i)).toBeVisible();
  });
});
