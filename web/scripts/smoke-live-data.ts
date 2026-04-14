import { prisma } from "@/lib/db";
import {
  getCreatorBySlug,
  getEnterpriseProfileByUserId,
  getProjectBySlug,
  getTeamBySlug,
  getUserSubscription,
} from "@/lib/repository";
import { hasDatabaseUrlConfigured, isMockDataEnabled } from "@/lib/runtime-mode";

async function main() {
  if (isMockDataEnabled()) {
    throw new Error("LIVE_SMOKE_REQUIRES_DATABASE_MODE");
  }
  if (!hasDatabaseUrlConfigured()) {
    throw new Error("DATABASE_URL_REQUIRED");
  }

  const health = await prisma.user.count();
  if (health < 1) {
    throw new Error("NO_USERS_FOUND");
  }

  const project = await getProjectBySlug("vibehub");
  if (!project) {
    throw new Error("SEED_PROJECT_NOT_FOUND");
  }

  const team = await getTeamBySlug("vibehub-core");
  if (!team) {
    throw new Error("SEED_TEAM_NOT_FOUND");
  }

  const creator = await getCreatorBySlug("alice-ai-builder");
  if (!creator) {
    throw new Error("SEED_CREATOR_NOT_FOUND");
  }

  const subscription = await getUserSubscription(team.ownerUserId);
  if (!subscription || !["free", "pro"].includes(subscription.tier)) {
    throw new Error("SUBSCRIPTION_TIER_INVALID");
  }

  const enterpriseProfile = await getEnterpriseProfileByUserId(team.ownerUserId);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: {
          userCount: health,
          project: project.slug,
          team: team.slug,
          creator: creator.slug,
          subscriptionTier: subscription.tier,
          enterpriseStatus: enterpriseProfile?.status ?? "none",
        },
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
