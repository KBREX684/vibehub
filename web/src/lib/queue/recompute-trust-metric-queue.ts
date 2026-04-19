import { logger } from "@/lib/logger";
import { processRecomputeTrustMetricJob, type RecomputeTrustMetricJobPayload } from "@/lib/jobs/recompute-trust-metric";
import { databaseUrl, getSharedBoss } from "@/lib/queue/instance";

const QUEUE = "recompute-trust-metric";

export function isTrustMetricQueueEnabled(): boolean {
  if (process.env.USE_TRUST_METRIC_QUEUE === "false") return false;
  return Boolean(databaseUrl());
}

export async function enqueueTrustMetricRecompute(job: RecomputeTrustMetricJobPayload): Promise<void> {
  if (!isTrustMetricQueueEnabled()) {
    await processRecomputeTrustMetricJob(job);
    return;
  }
  const boss = await getSharedBoss();
  if (!boss) {
    await processRecomputeTrustMetricJob(job);
    return;
  }
  await boss.send(QUEUE, job, { retryLimit: 3 });
}

export async function startTrustMetricWorkers(): Promise<void> {
  if (!isTrustMetricQueueEnabled()) return;
  const boss = await getSharedBoss();
  if (!boss) return;
  await boss.work(QUEUE, async (jobs) => {
    for (const job of jobs) {
      if (job?.data) {
        await processRecomputeTrustMetricJob(job.data as RecomputeTrustMetricJobPayload);
      }
    }
  });
  logger.info("pg-boss trust metric worker started");
}
