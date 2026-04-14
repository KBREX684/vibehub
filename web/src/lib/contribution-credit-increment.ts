import { prisma } from "@/lib/db";
import {
  mockContributionCredits,
} from "@/lib/data/mock-data";

/** Weights match `refreshContributionCredit` in repository. */
const W = {
  taskDone: 10,
  milestoneCompleted: 25,
  postApproved: 15,
  comment: 5,
  projectCreated: 20,
  intentApproved: 10,
  joinRequest: 3,
} as const;

function bumpMockScore(userId: string, deltaScore: number, field: MockCreditBump): void {
  let row = mockContributionCredits.find((c) => c.userId === userId);
  if (!row) {
    row = {
      userId,
      score: 0,
      tasksCompleted: 0,
      milestonesHit: 0,
      joinRequestsMade: 0,
      postsAuthored: 0,
      commentsAuthored: 0,
      projectsCreated: 0,
      intentsApproved: 0,
      updatedAt: new Date().toISOString(),
    };
    mockContributionCredits.push(row);
  }
  row.score += deltaScore;
  if (field === "tasksCompleted") row.tasksCompleted += 1;
  else if (field === "milestonesHit") row.milestonesHit += 1;
  else if (field === "joinRequestsMade") row.joinRequestsMade += 1;
  else if (field === "postsAuthored") row.postsAuthored += 1;
  else if (field === "commentsAuthored") row.commentsAuthored += 1;
  else if (field === "projectsCreated") row.projectsCreated += 1;
  else if (field === "intentsApproved") row.intentsApproved += 1;
  row.updatedAt = new Date().toISOString();
}

type MockCreditBump =
  | "tasksCompleted"
  | "milestonesHit"
  | "postsAuthored"
  | "commentsAuthored"
  | "projectsCreated"
  | "intentsApproved"
  | "joinRequestsMade";

async function prismaBump(
  userId: string,
  deltaScore: number,
  field: MockCreditBump
): Promise<void> {
  await prisma.contributionCredit.upsert({
    where: { userId },
    create: {
      userId,
      score: deltaScore,
      tasksCompleted: field === "tasksCompleted" ? 1 : 0,
      milestonesHit: field === "milestonesHit" ? 1 : 0,
      joinRequestsMade: field === "joinRequestsMade" ? 1 : 0,
      postsAuthored: field === "postsAuthored" ? 1 : 0,
      commentsAuthored: field === "commentsAuthored" ? 1 : 0,
      projectsCreated: field === "projectsCreated" ? 1 : 0,
      intentsApproved: field === "intentsApproved" ? 1 : 0,
    },
    update: {
      score: { increment: deltaScore },
      [field]: { increment: 1 },
    },
  });
}

export async function incrementContributionCreditField(params: {
  userId: string;
  /** When true, use in-memory mock credits (USE_MOCK_DATA). */
  useMockData: boolean;
  deltaScore: number;
  field: MockCreditBump;
}): Promise<void> {
  if (params.useMockData) {
    bumpMockScore(params.userId, params.deltaScore, params.field);
    return;
  }
  await prismaBump(params.userId, params.deltaScore, params.field);
}

export const contributionWeights = W;
