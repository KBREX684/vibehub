import { describe, expect, it } from "vitest";
import {
  getSubscriptionPlans,
  getUserSubscription,
  createUserSubscription,
  cancelUserSubscription,
} from "../src/lib/repository";

describe("Subscription Plans", () => {
  it("lists available plans", async () => {
    const plans = await getSubscriptionPlans();
    expect(plans.length).toBeGreaterThanOrEqual(3);
    const tiers = plans.map((p) => p.tier);
    expect(tiers).toContain("free");
    expect(tiers).toContain("pro");
    expect(tiers).toContain("team_pro");
  });

  it("plans have correct pricing hierarchy", async () => {
    const plans = await getSubscriptionPlans();
    const free = plans.find((p) => p.tier === "free")!;
    const pro = plans.find((p) => p.tier === "pro")!;
    const teamPro = plans.find((p) => p.tier === "team_pro")!;
    expect(free.priceMonthly).toBe(0);
    expect(pro.priceMonthly).toBeGreaterThan(0);
    expect(teamPro.priceMonthly).toBeGreaterThan(pro.priceMonthly);
  });

  it("plans have API quotas", async () => {
    const plans = await getSubscriptionPlans();
    const pro = plans.find((p) => p.tier === "pro")!;
    expect(pro.apiQuota).toBeGreaterThan(0);
  });
});

describe("User Subscription", () => {
  it("gets existing subscription for user", async () => {
    const sub = await getUserSubscription("u1");
    expect(sub).not.toBeNull();
    expect(sub!.status).toBe("active");
    expect(sub!.plan).toBeDefined();
  });

  it("returns null for user without subscription", async () => {
    const sub = await getUserSubscription("u3");
    expect(sub).toBeNull();
  });

  it("creates a new subscription", async () => {
    const sub = await createUserSubscription({ userId: "u3", planTier: "pro" });
    expect(sub.userId).toBe("u3");
    expect(sub.plan.tier).toBe("pro");
    expect(sub.status).toBe("active");
  });

  it("throws PLAN_NOT_FOUND for invalid plan", async () => {
    await expect(
      createUserSubscription({ userId: "u3", planTier: "nonexistent" as "pro" })
    ).rejects.toThrow("PLAN_NOT_FOUND");
  });

  it("cancels an active subscription", async () => {
    await createUserSubscription({ userId: "u2", planTier: "pro" });
    await cancelUserSubscription("u2");
    const sub = await getUserSubscription("u2");
    expect(sub).toBeNull();
  });

  it("throws NO_ACTIVE_SUBSCRIPTION when none exists", async () => {
    await expect(cancelUserSubscription("nonexistent-user")).rejects.toThrow("NO_ACTIVE_SUBSCRIPTION");
  });
});
