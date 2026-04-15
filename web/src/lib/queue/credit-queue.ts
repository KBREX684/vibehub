import { logger } from "@/lib/logger";
import type { MockCreditBump } from "@/lib/contribution-credit-increment";
import { getSharedBoss, databaseUrl } from "@/lib/queue/instance";

const QUEUE = "credit-increment";

export async function enqueueCreditIncrement(job: {
  userId: string;
  deltaScore: number;
  field: MockCreditBump;
}): Promise<void> {
  const { incrementContributionCreditField } = await import("@/lib/contribution-credit-increment");
  if (!databaseUrl()) {
    await incrementContributionCreditField({
      userId: job.userId,
      useMockData: false,
      deltaScore: job.deltaScore,
      field: job.field,
      skipQueue: true,
    });
    return;
  }
  const b = await getSharedBoss();
  if (!b) {
    await incrementContributionCreditField({
      userId: job.userId,
      useMockData: false,
      deltaScore: job.deltaScore,
      field: job.field,
      skipQueue: true,
    });
    return;
  }
  await b.send(QUEUE, job);
}

export async function startCreditWorkers(): Promise<void> {
  if (process.env.USE_ASYNC_CREDIT === "false") return;
  const b = await getSharedBoss();
  if (!b) return;
  await b.work(QUEUE, async (jobs) => {
    const { incrementContributionCreditField: bump } = await import("@/lib/contribution-credit-increment");
    for (const j of jobs) {
      const data = j.data as { userId: string; deltaScore: number; field: MockCreditBump };
      try {
        await bump({
          userId: data.userId,
          useMockData: false,
          deltaScore: data.deltaScore,
          field: data.field,
          skipQueue: true,
        });
      } catch (e) {
        logger.error({ err: e, job: data }, "credit increment worker failed");
      }
    }
  });
  logger.info("pg-boss credit worker started");
}
