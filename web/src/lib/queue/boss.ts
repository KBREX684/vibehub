import { isMockDataEnabled } from "@/lib/runtime-mode";
import { logger } from "@/lib/logger";
import { deliverWebhookHttp } from "@/lib/webhook-deliver-http";
import type { WebhookDeliverJob } from "@/lib/webhook-job-types";
import { getSharedBoss, databaseUrl } from "@/lib/queue/instance";

const QUEUE_NAME = "webhook-deliver";

export type { WebhookDeliverJob };

export function isWebhookQueueEnabled(): boolean {
  if (isMockDataEnabled()) return false;
  if (process.env.USE_WEBHOOK_QUEUE === "false") return false;
  return Boolean(databaseUrl());
}

export async function enqueueWebhookDeliver(job: WebhookDeliverJob): Promise<void> {
  const b = await getSharedBoss();
  if (!b) {
    await deliverWebhookHttp(job);
    return;
  }
  await b.send(QUEUE_NAME, job, { retryLimit: 0 });
}

export async function startWebhookWorkers(): Promise<void> {
  if (!isWebhookQueueEnabled()) return;
  const b = await getSharedBoss();
  if (!b) return;
  await b.work(QUEUE_NAME, async (jobs) => {
    for (const j of jobs) {
      if (j?.data) await deliverWebhookHttp(j.data as WebhookDeliverJob);
    }
  });
  logger.info("pg-boss webhook worker started");
}
