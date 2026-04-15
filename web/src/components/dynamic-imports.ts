/**
 * P4-FE-1: Lazy-loaded versions of heavy components via next/dynamic.
 *
 * Import from this module instead of the concrete component file when the
 * component is only rendered conditionally (admin pages, modals, etc.).
 * This keeps the main JS bundle small and defers loading until needed.
 */
import dynamic from "next/dynamic";

// ---------------------------------------------------------------------------
// Admin components – only loaded on admin pages
// ---------------------------------------------------------------------------

export const DynamicAdminCollaborationReviewActions = dynamic(
  () =>
    import("./admin-collaboration-review-actions").then((mod) => ({
      default: mod.AdminCollaborationReviewActions,
    })),
  { loading: () => null },
);

export const DynamicAdminDailyFeaturedPanel = dynamic(
  () =>
    import("./admin-daily-featured-panel").then((mod) => ({
      default: mod.AdminDailyFeaturedPanel,
    })),
  { loading: () => null },
);

export const DynamicAdminReviewActions = dynamic(
  () =>
    import("./admin-review-actions").then((mod) => ({
      default: mod.AdminReviewActions,
    })),
  { loading: () => null },
);

export const DynamicAdminWeeklyMaterializeForm = dynamic(
  () =>
    import("./admin-weekly-materialize-form").then((mod) => ({
      default: mod.AdminWeeklyMaterializeForm,
    })),
  { loading: () => null },
);

// ---------------------------------------------------------------------------
// Heavy interactive components
// ---------------------------------------------------------------------------

export const DynamicTeamChatPanel = dynamic(
  () =>
    import("./team-chat-panel").then((mod) => ({
      default: mod.TeamChatPanel,
    })),
  { ssr: false, loading: () => null },
);

export const DynamicTeamTasksPanel = dynamic(
  () =>
    import("./team-tasks-panel").then((mod) => ({
      default: mod.TeamTasksPanel,
    })),
  { loading: () => null },
);

export const DynamicTeamMilestonesPanel = dynamic(
  () =>
    import("./team-milestones-panel").then((mod) => ({
      default: mod.TeamMilestonesPanel,
    })),
  { loading: () => null },
);

export const DynamicCommandPalette = dynamic(
  () =>
    import("./command-palette").then((mod) => ({
      default: mod.CommandPalette,
    })),
  { ssr: false, loading: () => null },
);

export const DynamicPricingCards = dynamic(
  () =>
    import("./pricing-cards").then((mod) => ({
      default: mod.PricingCards,
    })),
  { loading: () => null },
);

export const DynamicEnterpriseVerificationForm = dynamic(
  () =>
    import("./enterprise-verification-form").then((mod) => ({
      default: mod.EnterpriseVerificationForm,
    })),
  { loading: () => null },
);
