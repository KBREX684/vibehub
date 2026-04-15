import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3100";

test("team create -> create task", async ({ page }) => {
  await page.goto(`${BASE}/login?redirect=/teams/new`);
  await page
    .getByRole("link", { name: /demo admin login|auth\.demo_admin_login/i })
    .click();
  await page.waitForURL(/\/teams\/new/);

  const stamp = Date.now();
  const teamName = `High Task Team ${stamp}`;
  await page.getByLabel(/name|名称/i).fill(teamName);
  await page.getByLabel(/slug/i).fill(`p2-high-team-${stamp}`);
  await page.getByRole("button", { name: /创建|create/i }).click();
  await page.waitForURL(/\/teams\/[^/]+$/);

  await expect(page.getByText(teamName)).toBeVisible();
  await page.getByRole("button", { name: /new task|cancel/i }).click();
  await page.getByLabel(/task title/i).fill("Ship P2 high task flow");
  await page.getByRole("button", { name: /create task/i }).click();
  await expect(page.getByText("Ship P2 high task flow")).toBeVisible();
});
