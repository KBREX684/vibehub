import type { AdminAiInsight } from "@/lib/types";
import { emitSystemAlert } from "@/lib/system-alerts";

type ProviderRiskLevel = NonNullable<AdminAiInsight["riskLevel"]>;
type ProviderPriority = NonNullable<AdminAiInsight["priority"]>;

export interface AdminAiProviderReadiness {
  status: "ready" | "not_configured";
  provider: string;
  model?: string;
}

export interface AdminAiProviderResult extends AdminAiInsight {
  modelProvider?: string;
  modelName?: string;
}

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return null;
}

function sanitizeInsight(payload: unknown): AdminAiInsight | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const suggestion = typeof row.suggestion === "string" ? row.suggestion.trim() : "";
  const riskLevel = row.riskLevel;
  const confidence = typeof row.confidence === "number" ? row.confidence : undefined;
  const priority = row.priority;
  const queue = typeof row.queue === "string" ? row.queue.trim() : undefined;
  const labels = Array.isArray(row.labels)
    ? row.labels.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;

  if (!suggestion) return null;
  if (riskLevel !== "low" && riskLevel !== "medium" && riskLevel !== "high") return null;
  if (priority !== undefined && priority !== "low" && priority !== "normal" && priority !== "high" && priority !== "urgent") {
    return null;
  }

  return {
    suggestion,
    riskLevel: riskLevel as ProviderRiskLevel,
    confidence,
    priority: (priority as ProviderPriority | undefined) ?? "normal",
    queue,
    labels,
  };
}

export function getAdminAiProviderReadiness(): AdminAiProviderReadiness {
  const baseUrl = env("ADMIN_AI_PROVIDER_BASE_URL");
  const apiKey = env("ADMIN_AI_PROVIDER_API_KEY");
  const model = env("ADMIN_AI_MODEL");
  const provider = env("ADMIN_AI_PROVIDER_NAME") || "openai-compatible";

  if (!baseUrl || !apiKey || !model) {
    return {
      status: "not_configured",
      provider,
    };
  }

  return {
    status: "ready",
    provider,
    model,
  };
}

export async function generateAdminAiSuggestionWithProvider(params: {
  task: string;
  targetType: string;
  targetId: string;
  context: string;
}): Promise<AdminAiProviderResult | null> {
  const baseUrl = env("ADMIN_AI_PROVIDER_BASE_URL");
  const apiKey = env("ADMIN_AI_PROVIDER_API_KEY");
  const model = env("ADMIN_AI_MODEL");
  const provider = env("ADMIN_AI_PROVIDER_NAME") || "openai-compatible";

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 512,
        messages: [
          {
            role: "system",
            content:
              "You are VibeHub's admin AI reviewer. Return a single JSON object with keys: suggestion, riskLevel, confidence, priority, queue, labels. riskLevel must be low|medium|high. priority must be low|normal|high|urgent. labels must be an array of short strings. Do not return markdown.",
          },
          {
            role: "user",
            content: `Task: ${params.task}\nTargetType: ${params.targetType}\nTargetId: ${params.targetId}\nContext:\n${params.context}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      await emitSystemAlert({
        kind: "admin_ai.provider_http_error",
        severity: "warning",
        message: `Admin AI provider returned HTTP ${response.status}.`,
        dedupeKey: `admin-ai-provider-http:${provider}`,
        metadata: { provider, model, status: response.status },
      });
      return null;
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    const text =
      typeof content === "string"
        ? content
        : Array.isArray(content)
          ? content
              .map((item) => (typeof item?.text === "string" ? item.text : ""))
              .filter(Boolean)
              .join("\n")
          : "";
    const raw = extractJsonObject(text);
    if (!raw) return null;
    const parsed = sanitizeInsight(JSON.parse(raw));
    if (!parsed) return null;
    return {
      ...parsed,
      modelProvider: provider,
      modelName: model,
    };
  } catch (error) {
    await emitSystemAlert({
      kind: "admin_ai.provider_exception",
      severity: "warning",
      message: "Admin AI provider request failed.",
      dedupeKey: `admin-ai-provider-error:${provider}`,
      metadata: { provider, model, error: error instanceof Error ? error.message : String(error) },
    });
    return null;
  }
}
