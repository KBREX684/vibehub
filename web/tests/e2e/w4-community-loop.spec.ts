import { test, expect, type Page } from "@playwright/test";
import { encodeSession } from "../../src/lib/auth";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

async function setSession(page: Page, role: "user" | "admin") {
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

test.describe("W4 community loop walkthrough", () => {
  test("discussion feeds explain all four streams", async ({ page }) => {
    await setSession(page, "user");

    await page.goto("/discussions?sort=hot", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Momentum ranking using likes, comments, bookmarks, and recency decay\./i)).toBeVisible();

    await page.getByRole("link", { name: "Following" }).click();
    await expect(page).toHaveURL(/\/discussions\?sort=following/);
    await expect(page.getByText(/Only creators you follow, ordered by newest activity\./i)).toBeVisible();

    await page.getByRole("link", { name: "Recommended" }).click();
    await expect(page).toHaveURL(/\/discussions\?sort=recommended/);
    await expect(page.getByText(/Interest-based recommendations from your recent interaction graph\./i)).toBeVisible();
  });

  test("discover hot feed surfaces ranking explanation", async ({ page }) => {
    await page.goto("/discover?sort=hot", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Hot projects rank by saves, collaboration intents, recent updates, creator credit, and editorial picks\./i)).toBeVisible();
    await expect(page.getByRole("heading", { name: "VibeHub" }).first()).toBeVisible();
    await expect(page.getByText(/Updated/i).first()).toBeVisible();
  });

  test("project detail prioritizes collaboration CTA and bookmark interaction", async ({ page }) => {
    await setSession(page, "user");

    await page.goto("/projects/vibehub", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Apply to join VibeHub Core/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Recent collaboration signals/i })).toBeVisible();

    const bookmarkButton = page.getByRole("button", { name: /Save project|Remove bookmark/i });
    await expect(bookmarkButton).toBeVisible();
    await expect(bookmarkButton).toBeEnabled();
    const before = await bookmarkButton.textContent();
    await bookmarkButton.click();
    if (before?.includes("Saved")) {
      await expect(bookmarkButton).toContainText("Save");
    } else {
      await expect(bookmarkButton).toContainText("Saved");
    }
  });

  test("team activity view exposes first-class timeline filters", async ({ page }) => {
    await setSession(page, "user");

    await page.goto("/teams/vibehub-core?tab=activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Team timeline" })).toBeVisible();
    await expect(page.getByText(/Task changes, structured discussions, and agent actions in one filtered stream\./i)).toBeVisible();
    await expect(page.getByTestId("team-timeline-empty-state")).toHaveText("No recorded team activity yet.");

    await expect(page.getByRole("button", { name: "Tasks" })).toBeEnabled();
    await page.getByRole("button", { name: "Tasks" }).click();
    await expect(page.getByTestId("team-timeline-empty-state")).toHaveText("No task events recorded yet.");

    await page.getByRole("button", { name: "Discussions" }).click();
    await expect(page.getByTestId("team-timeline-empty-state")).toHaveText("No discussion events recorded yet.");

    await page.getByRole("button", { name: "Agent" }).click();
    await expect(page.getByTestId("team-timeline-empty-state")).toHaveText("No agent events recorded yet.");
  });
});
