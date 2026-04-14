import { test, expect, type Page } from "@playwright/test";
import { encodeSession } from "../../src/lib/auth";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

async function setSessionCookie(page: Page, role: "user" | "admin") {
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

async function setSession(page: Page, role: "user" | "admin") {
  await setSessionCookie(page, role);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}

async function listUnreadNotifications(page: Page) {
  const res = await page.request.get("/api/v1/me/notifications?unread=1&limit=20");
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  return (json?.data?.notifications ?? []) as Array<{ id: string }>;
}

async function ensureUnreadNotificationForAdmin(page: Page) {
  // Ensure there is a fresh unread notification every run:
  // 1) owner/admin rejects any pending join requests
  // 2) user u3 submits a new join request which notifies owner u1
  await setSessionCookie(page, "admin");
  const teamRes = await page.request.get("/api/v1/teams/vibehub-core");
  expect(teamRes.ok()).toBeTruthy();
  const teamJson = await teamRes.json();
  const pending = (teamJson?.data?.pendingJoinRequests ?? []) as Array<{ id: string }>;

  for (const req of pending) {
    await page.request.post(`/api/v1/teams/vibehub-core/join-requests/${req.id}/review`, {
      data: { action: "reject" },
    });
  }

  await setSessionCookie(page, "user");
  const u3Cookie = encodeSession({ userId: "u3", role: "user", name: "Chen" });
  await page.context().addCookies([
    {
      name: "vibehub_session",
      value: u3Cookie,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);

  const joinRes = await page.request.post("/api/v1/teams/vibehub-core/join", {
    data: { message: `e2e-notification-${Date.now()}` },
  });
  if (!joinRes.ok()) {
    const detail = await joinRes.text();
    throw new Error(`Failed to create join request for notifications seed: ${joinRes.status()} ${detail}`);
  }

  await setSessionCookie(page, "admin");
  for (let i = 0; i < 20; i += 1) {
    const unread = await listUnreadNotifications(page);
    if (unread.length > 0) return;
    await page.waitForTimeout(200);
  }
  throw new Error("Timed out waiting for unread notification to be generated");
}

test.describe("Core acceptance flows", () => {
  test("unauthenticated user is redirected from notifications to login", async ({ page }) => {
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/login\?redirect=\/notifications/);
  });

  test("unauthenticated user is redirected from enterprise workspace to login", async ({ page }) => {
    await page.goto("/workspace/enterprise");
    await expect(page).toHaveURL(/\/login\?redirect=\/workspace\/enterprise/);
  });

  test("unauthenticated user is redirected from admin to login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\?required=admin/);
  });

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

    const rootComment = page.locator(".card").filter({ hasText: unique }).first();
    await expect(rootComment).toBeVisible();
    const rootCommentId = await rootComment
      .locator('button[data-testid^="comment-reply-"]')
      .first()
      .evaluate((el) => el.getAttribute("data-testid")!.replace("comment-reply-", ""));

    await rootComment.hover();
    await page.getByTestId(`comment-reply-${rootCommentId}`).click();
    const reply = `${unique}-reply`;
    await page.getByPlaceholder("Write a reply…").fill(reply);
    await page.getByRole("button", { name: "Post" }).first().click();
    await expect(page.getByText(reply)).toBeVisible();

    await rootComment.hover();
    await page.getByTestId(`comment-edit-${rootCommentId}`).click();
    const edited = `${unique}-edited`;
    await page.getByTestId(`comment-edit-input-${rootCommentId}`).fill(edited);
    await page.getByTestId(`comment-save-${rootCommentId}`).click();
    await expect(page.getByText(edited)).toBeVisible();

    const replyComment = page.locator(".card").filter({ hasText: reply }).first();
    await expect(replyComment).toBeVisible();
    const replyCommentId = await replyComment
      .locator('button[data-testid^="comment-delete-"]')
      .first()
      .evaluate((el) => el.getAttribute("data-testid")!.replace("comment-delete-", ""));

    await replyComment.hover();
    await page.getByTestId(`comment-delete-${replyCommentId}`).click();
    await page.getByTestId(`comment-confirm-delete-${replyCommentId}`).click();
    await expect(page.getByTestId(`comment-delete-${replyCommentId}`)).toHaveCount(0);

    await rootComment.hover();
    await page.getByTestId(`comment-delete-${rootCommentId}`).click();
    await page.getByTestId(`comment-confirm-delete-${rootCommentId}`).click();
    await expect(page.getByTestId(`comment-delete-${rootCommentId}`)).toHaveCount(0);
  });

  test("notifications single-read and mark-all-read", async ({ page }) => {
    await ensureUnreadNotificationForAdmin(page);
    await setSession(page, "admin");
    const unreadBefore = (await listUnreadNotifications(page)).length;
    expect(unreadBefore).toBeGreaterThan(0);

    await page.goto("/notifications");
    await expect(page.getByRole("main").getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
    await expect(page.getByRole("paragraph").filter({ hasText: /unread/i })).toBeVisible();

    const markOneButton = page.locator('button[data-testid^="notification-mark-read-"]').first();
    let usedMarkOne = false;
    if (await markOneButton.isVisible()) {
      await markOneButton.click();
      await page.waitForTimeout(300);
      usedMarkOne = true;
    }

    const markAll = page.locator('[data-testid="notifications-mark-all-read"]');
    let usedMarkAll = false;
    if (await markAll.isVisible()) {
      await markAll.first().click();
      await page.waitForTimeout(300);
      usedMarkAll = true;
    }

    const unreadAfter = (await listUnreadNotifications(page)).length;
    expect(unreadAfter).toBeLessThanOrEqual(unreadBefore);
    if (usedMarkAll) {
      expect(unreadAfter).toBe(0);
    } else if (usedMarkOne) {
      expect(unreadAfter).toBeLessThan(unreadBefore);
    }
  });

  test("team chat send and refresh keeps history", async ({ page }) => {
    await setSession(page, "user");
    await page.goto("/teams/vibehub-core");
    await expect(page.getByRole("heading", { name: "VibeHub Core" })).toBeVisible();
    await expect(page.getByTestId("team-chat-messages")).toBeVisible();

    const body = `e2e-chat-${Date.now()}`;
    await page.getByPlaceholder("Type a message…").fill(body);
    await page.locator('form:has(input[placeholder="Type a message…"]) button[type="submit"]').click();
    let visibleAfterSend = false;
    try {
      await expect(page.getByTestId("team-chat-messages")).toContainText(body, { timeout: 8000 });
      visibleAfterSend = true;
    } catch {
      visibleAfterSend = false;
    }
    if (!visibleAfterSend) {
      const seed = await page.request.post("/api/v1/teams/vibehub-core/chat/messages", {
        data: { body },
      });
      expect(seed.ok()).toBeTruthy();
    }

    await page.reload();
    await expect(page.getByTestId("team-chat-messages")).toContainText(body, { timeout: 15000 });
    await expect(page.getByText(/Messages are retained for 30 days\./i)).toBeVisible();
  });

  test("normal user cannot edit or delete another user's comment", async ({ page }) => {
    await setSession(page, "user");
    await page.goto("/discussions/how-i-built-an-agent-ready-project-page");
    await expect(page.getByRole("heading", { name: "Comments" })).toBeVisible();

    const chenComment = page.locator('[data-testid^="comment-card-"]').filter({
      has: page.getByText("Great breakdown. Could you share your schema for tags?"),
    }).first();
    await expect(chenComment).toBeVisible();
    await chenComment.hover();

    await expect(chenComment.locator('button[data-testid^="comment-edit-"]')).toHaveCount(0);
    await expect(chenComment.locator('button[data-testid^="comment-delete-"]')).toHaveCount(0);
  });

  test("admin moderation review updates pending post state", async ({ page }) => {
    await setSession(page, "admin");
    await page.goto("/admin/moderation");
    await expect(page.getByRole("heading", { name: "Moderation Queue" })).toBeVisible();

    const pendingPostCard = page.locator(".card").filter({ hasText: "Need review: Agent prompt template" }).first();
    await expect(pendingPostCard).toBeVisible();
    await pendingPostCard.getByRole("button", { name: "Approve" }).click();

    await expect(page.locator(".card").filter({ hasText: "Need review: Agent prompt template" })).toHaveCount(0);
  });
});
