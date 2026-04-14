import { test, expect } from "@playwright/test";
import { encodeSession } from "../../src/lib/auth";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";

async function setSession(page: import("@playwright/test").Page, role: "user" | "admin") {
  const token = encodeSession({
    userId: role === "admin" ? "u1" : "u2",
    role,
    name: role === "admin" ? "Alice" : "Bob",
  });
  await page.context().addCookies([
    {
      name: "vibehub_session",
      value: token,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}

test.describe("Core acceptance flows", () => {
  test("login and logout flow", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /demo user login/i }).click();
    await page.waitForLoadState("networkidle");

    const sessionBefore = await page.request.get("/api/v1/auth/session");
    expect(sessionBefore.ok()).toBeTruthy();
    const jsonBefore = await sessionBefore.json();
    expect(jsonBefore?.data?.session?.userId).toBe("u2");

    await page.request.post("/api/v1/auth/logout");
    await page.goto("/");
    await expect(page.getByRole("link", { name: /sign in|登录/i })).toBeVisible();
  });

  test("admin isolation for normal user", async ({ page }) => {
    await setSession(page, "user");
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
    await expect(page.getByText(/admin dashboard/i)).toHaveCount(0);
  });

  test("enterprise gating for user and access for admin", async ({ page }) => {
    await setSession(page, "user");
    await page.goto("/workspace/enterprise");
    await expect(page).toHaveURL(/\/workspace\/enterprise/);
    await expect(page.getByText("Enterprise Intelligence Workspace")).toBeVisible();
    await expect(page.getByText(/Apply for Enterprise Access/i)).toBeVisible();

    await setSession(page, "admin");
    await page.goto("/workspace/enterprise");
    await expect(page.getByRole("heading", { name: "Enterprise Workspace" })).toBeVisible();
  });

  test("discussion comment CRUD: add reply edit delete", async ({ page }) => {
    await setSession(page, "user");
    await page.goto("/discussions/how-i-built-an-agent-ready-project-page");
    await expect(page.getByRole("heading", { name: "Comments" })).toBeVisible();

    const unique = `e2e-comment-${Date.now()}`;
    await page.getByPlaceholder("Add a comment…").fill(unique);
    await page.getByRole("button", { name: "Post" }).first().click();
    await expect(page.getByText(unique)).toBeVisible();

    const card = page.locator(".card").filter({ hasText: unique }).first();
    await card.hover();
    await card.getByTitle("Reply").click();
    const reply = `${unique}-reply`;
    await page.getByPlaceholder("Write a reply…").fill(reply);
    await page.getByRole("button", { name: "Post" }).first().click();
    await expect(page.getByText(reply)).toBeVisible();

    await card.hover();
    await card.getByTitle("Edit").click();
    const edited = `${unique}-edited`;
    await card.locator("textarea").fill(edited);
    await card.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(edited)).toBeVisible();

    await card.hover();
    await card.getByTitle("Delete").click();
    await card.getByRole("button", { name: /^Delete$/ }).click();
    await expect(card.getByText(edited)).toHaveCount(0);
  });

  test("notifications page access for logged-in user", async ({ page }) => {
    await setSession(page, "admin");
    await page.goto("/notifications");
    await expect(page.getByRole("main").getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
  });

  test("team chat send and refresh keeps history", async ({ page }) => {
    await setSession(page, "user");
    await page.goto("/teams/vibehub-core");
    await expect(page.getByRole("heading", { name: "VibeHub Core" })).toBeVisible();

    const body = `e2e-chat-${Date.now()}`;
    await page.getByPlaceholder("Type a message…").fill(body);
    await page.locator('form:has(input[placeholder="Type a message…"]) button[type="submit"]').click();
    await expect(page.getByText(body)).toBeVisible();

    await page.reload();
    await expect(page.getByText(/Messages are retained for 30 days\./i)).toBeVisible();
  });
});
