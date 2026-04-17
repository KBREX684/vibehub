import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptStoredSecret, encryptStoredSecret, isEncryptedSecret } from "@/lib/secret-crypto";
import { hasDatabaseUrlConfigured, isMockDataEnabled } from "@/lib/runtime-mode";

type WorkflowStepConfig = Record<string, unknown>;

const SENSITIVE_ACTION_FIELDS: Partial<Record<string, readonly string[]>> = {
  send_slack_message: ["webhookUrl"],
  send_discord_message: ["webhookUrl"],
  send_feishu_message: ["webhookUrl"],
  trigger_github_repository_dispatch: ["token"],
};

function usage(): never {
  console.error("Usage: npm run security:backfill-secrets -- --apply");
  console.error("Default mode is dry-run. Pass --apply to persist changes.");
  process.exit(1);
}

function ensureRecord(value: unknown): WorkflowStepConfig {
  return value && typeof value === "object" && !Array.isArray(value)
    ? ({ ...(value as WorkflowStepConfig) } satisfies WorkflowStepConfig)
    : {};
}

function backfillSensitiveStepConfig(actionType: string, config: unknown): WorkflowStepConfig | null {
  const sensitiveKeys = SENSITIVE_ACTION_FIELDS[actionType];
  if (!sensitiveKeys?.length) return null;
  const next = ensureRecord(config);
  let changed = false;
  for (const key of sensitiveKeys) {
    const value = next[key];
    if (typeof value === "string" && value.trim() && !isEncryptedSecret(value)) {
      next[key] = encryptStoredSecret(value, `automation:${actionType}:${key}`);
      changed = true;
    }
  }
  return changed ? next : null;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || args.has("-h")) usage();
  const apply = args.has("--apply");

  if (isMockDataEnabled()) {
    throw new Error("BACKFILL_REQUIRES_DATABASE_MODE");
  }
  if (!hasDatabaseUrlConfigured()) {
    throw new Error("DATABASE_URL_REQUIRED");
  }

  const webhookRows = await prisma.webhookEndpoint.findMany({
    select: { id: true, secret: true },
  });
  const webhookUpdates = webhookRows
    .filter((row) => row.secret && !isEncryptedSecret(row.secret))
    .map((row) => ({
      id: row.id,
      nextSecret: encryptStoredSecret(row.secret, "webhook-endpoint-secret"),
    }));

  const stepRows = await prisma.automationWorkflowStep.findMany({
    select: { id: true, actionType: true, config: true },
  });
  const stepUpdates = stepRows
    .map((row) => {
      const nextConfig = backfillSensitiveStepConfig(row.actionType, row.config);
      return nextConfig ? { id: row.id, nextConfig } : null;
    })
    .filter((row): row is { id: string; nextConfig: WorkflowStepConfig } => Boolean(row));

  if (apply) {
    for (const row of webhookUpdates) {
      await prisma.webhookEndpoint.update({
        where: { id: row.id },
        data: { secret: row.nextSecret },
      });
    }
    for (const row of stepUpdates) {
      await prisma.automationWorkflowStep.update({
        where: { id: row.id },
        data: { config: row.nextConfig as Prisma.InputJsonValue },
      });
    }
  }

  const sample = webhookUpdates[0]
    ? {
        webhookId: webhookUpdates[0].id,
        encryptedPreview: webhookUpdates[0].nextSecret.slice(0, 24),
        decryptCheck: decryptStoredSecret(webhookUpdates[0].nextSecret, "webhook-endpoint-secret").length > 0,
      }
    : null;

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: apply ? "apply" : "dry-run",
        rewrites: {
          webhookSecrets: webhookUpdates.length,
          automationStepConfigs: stepUpdates.length,
        },
        sample,
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
