import { test, expect } from "@playwright/test";

test("home page loads and links to discover", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /where the future/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /explore projects/i })).toHaveAttribute("href", "/discover");
});

test("demo login sets session cookie and lands on redirect path", async ({ page, context }) => {
  await page.goto("/api/v1/auth/demo-login?role=user&redirect=/discover");
  await expect(page).toHaveURL(/\/discover$/);
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "vibehub_session");
  expect(session?.value).toBeTruthy();
});
