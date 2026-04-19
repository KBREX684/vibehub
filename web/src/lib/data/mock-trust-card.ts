/**
 * Mock Trust Card data for v11 frontend development.
 */

export type OpcCompanyKind = "solo_dev" | "design" | "content" | "ops" | "domain" | "other";

export interface OpcProfile {
  id: string;
  userId: string;
  companyKind: OpcCompanyKind;
  tagline: string | null;
  openToCollab: boolean;
  lookingFor: string[];
  publicCardSlug: string;
}

export interface OpcTrustMetric {
  userId: string;
  ledgerEntryCount: number;
  snapshotCount: number;
  stampedArtifactCount: number;
  publicWorkCount: number;
  avgResponseHours: number | null;
  registrationDays: number;
}

export interface TrustCardData {
  user: {
    slug: string;
    name: string;
    avatarUrl: string | null;
  };
  profile: OpcProfile;
  metrics: OpcTrustMetric;
  publicWorks: Array<{
    slug: string;
    name: string;
    coverUrl: string | null;
  }>;
}

export const MOCK_TRUST_CARDS: TrustCardData[] = [
  {
    user: { slug: "dev-alice", name: "Alice Chen", avatarUrl: null },
    profile: {
      id: "opc_alice",
      userId: "user_alice",
      companyKind: "solo_dev",
      tagline: "前端独立开发者 · AI 留痕倡导者",
      openToCollab: true,
      lookingFor: ["design", "growth"],
      publicCardSlug: "dev-alice",
    },
    metrics: {
      userId: "user_alice",
      ledgerEntryCount: 342,
      snapshotCount: 28,
      stampedArtifactCount: 156,
      publicWorkCount: 12,
      avgResponseHours: 2.4,
      registrationDays: 186,
    },
    publicWorks: [
      { slug: "vibehub-site", name: "VibeHub 官网", coverUrl: null },
      { slug: "prompt-lab", name: "Prompt Lab", coverUrl: null },
      { slug: "signal-board", name: "Signal Board", coverUrl: null },
    ],
  },
  {
    user: { slug: "designer-bob", name: "Bob Wang", avatarUrl: null },
    profile: {
      id: "opc_bob",
      userId: "user_bob",
      companyKind: "design",
      tagline: "独立 UI 设计师 · Figma + AI 工作流",
      openToCollab: false,
      lookingFor: [],
      publicCardSlug: "designer-bob",
    },
    metrics: {
      userId: "user_bob",
      ledgerEntryCount: 89,
      snapshotCount: 15,
      stampedArtifactCount: 42,
      publicWorkCount: 5,
      avgResponseHours: 4.1,
      registrationDays: 67,
    },
    publicWorks: [
      { slug: "dark-ui-kit", name: "Dark UI Kit", coverUrl: null },
    ],
  },
  {
    user: { slug: "empty-user", name: "新用户", avatarUrl: null },
    profile: {
      id: "opc_empty",
      userId: "user_empty",
      companyKind: "solo_dev",
      tagline: null,
      openToCollab: false,
      lookingFor: [],
      publicCardSlug: "empty-user",
    },
    metrics: {
      userId: "user_empty",
      ledgerEntryCount: 0,
      snapshotCount: 0,
      stampedArtifactCount: 0,
      publicWorkCount: 0,
      avgResponseHours: null,
      registrationDays: 0,
    },
    publicWorks: [],
  },
];

export function getMockTrustCard(slug: string): TrustCardData | null {
  return MOCK_TRUST_CARDS.find((c) => c.user.slug === slug) ?? null;
}
