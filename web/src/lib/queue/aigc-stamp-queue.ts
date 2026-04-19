import { logger } from "@/lib/logger";
import { getSharedBoss, databaseUrl } from "@/lib/queue/instance";
import { processAigcStampJob, type AigcStampJobPayload } from "@/lib/jobs/aigc-stamp";

const QUEUE = "aigc-stamp";

export function isAigcStampQueueEnabled(): boolean {
  if (process.env.USE_AIGC_STAMP_QUEUE === "false") return false;
  return Boolean(databaseUrl());
}

export async function enqueueAigcStamp(job: AigcStampJobPayload): Promise<void> {
  if (!isAigcStampQueueEnabled()) {
    await processAigcStampJob(job);
    return;
  }
  const boss = await getSharedBoss();
  if (!boss) {
    await processAigcStampJob(job);
    return;
  }
  await boss.send(QUEUE, job, { retryLimit: 3 });
}

export async function startAigcStampWorkers(): Promise<void> {
  if (!isAigcStampQueueEnabled()) return;
  const boss = await getSharedBoss();
  if (!boss) return;
  await boss.work(QUEUE, async (jobs) => {
    for (const job of jobs) {
      if (job?.data) {
        await processAigcStampJob(job.data as AigcStampJobPayload);
      }
    }
  });
  logger.info("pg-boss AIGC stamp worker started");
}
