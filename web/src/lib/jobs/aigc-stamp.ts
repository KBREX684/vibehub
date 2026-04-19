import { runAigcStampPipeline, type AigcStampTrigger } from "@/lib/aigc/pipeline";

export interface AigcStampJobPayload {
  artifactId: string;
  workspaceId: string;
  actorUserId?: string;
  trigger?: AigcStampTrigger;
}

export async function processAigcStampJob(job: AigcStampJobPayload) {
  return runAigcStampPipeline({
    artifactId: job.artifactId,
    actorUserId: job.actorUserId,
    trigger: job.trigger ?? "auto",
  });
}
