import { logger, serializeError } from "@/lib/logger";
import { recomputeOpcTrustMetric } from "@/lib/repositories/opc-profile.repository";

export interface RecomputeTrustMetricJobPayload {
  userId: string;
  reason?: string;
}

export async function processRecomputeTrustMetricJob(job: RecomputeTrustMetricJobPayload) {
  try {
    await recomputeOpcTrustMetric(job.userId);
  } catch (error) {
    logger.error(
      { err: serializeError(error), job },
      "trust metric recompute job failed"
    );
    throw error;
  }
}
