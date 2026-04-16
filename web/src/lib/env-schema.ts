/**
 * P3-INFRA-2: Comprehensive Zod-based environment variable schema.
 *
 * Three tiers:
 *   1. **Required** — startup fails without them (in enforcement mode).
 *   2. **Conditionally required** — required only when a feature flag is active.
 *   3. **Optional with defaults** — safe fallbacks for development.
 *
 * Usage: imported by `env-check.ts` and called once during `instrumentation.ts`.
 * Never import this at the module top-level of a hot path — the schema is
 * evaluated once at startup and the validated result cached.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Coerce "true"/"false" strings to boolean. */
const boolStr = z
  .enum(["true", "false", ""])
  .optional()
  .transform((v) => v === "true");

/** Positive integer from string (e.g. rate limits, ports). */
const positiveInt = z
  .string()
  .optional()
  .transform((v) => {
    if (!v?.trim()) return undefined;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  });

/** Non-empty trimmed string or undefined. */
const optStr = z
  .string()
  .optional()
  .transform((v) => v?.trim() || undefined);

/* ------------------------------------------------------------------ */
/*  Schema                                                            */
/* ------------------------------------------------------------------ */

export const envSchema = z
  .object({
    /* ---- Core ---- */
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    USE_MOCK_DATA: z.enum(["true", "false", ""]).optional().default(""),
    ENFORCE_REQUIRED_ENV: boolStr.default("false"),

    /* ---- Database ---- */
    DATABASE_URL: optStr,
    PRISMA_LOG_QUERIES: boolStr.default("false"),
    PRISMA_SLOW_QUERY_MS: positiveInt,
    PRISMA_QUERY_TIMEOUT_MS: positiveInt,

    /* ---- Auth / Security ---- */
    SESSION_SECRET: optStr,
    GITHUB_CLIENT_ID: optStr,
    GITHUB_CLIENT_SECRET: optStr,
    NEXT_PUBLIC_BASE_URL: optStr,
    API_KEY_HASH_PEPPER: optStr,
    INTERNAL_SERVICE_SECRET: optStr,
    DISABLE_DEMO_LOGIN: boolStr.default("false"),
    TRUST_IP_HEADERS: boolStr.default("false"),
    CHAT_WS_TOKEN_SECRET: optStr,
    CHAT_TOKEN_TTL_SECONDS: positiveInt,

    /* ---- Rate Limiting ---- */
    API_KEY_RATE_LIMIT_PER_MINUTE: positiveInt,
    API_KEY_RATE_LIMIT_PER_MINUTE_READ_PUBLIC: positiveInt,
    API_KEY_RATE_LIMIT_PER_MINUTE_WRITE: positiveInt,
    WRITE_RATE_LIMIT_PER_MINUTE: positiveInt,
    GET_RATE_LIMIT_PER_MINUTE: positiveInt,
    SEARCH_RATE_LIMIT_PER_MINUTE: positiveInt,
    MCP_USER_TOOL_MAX_PER_MINUTE: positiveInt,

    /* ---- Redis ---- */
    REDIS_URL: optStr,

    /* ---- WebSocket ---- */
    NEXT_PUBLIC_WS_URL: optStr,
    WS_PORT: positiveInt,
    WS_PATH: optStr,
    WS_HEALTH_URL: optStr,

    /* ---- Notifications / SSE ---- */
    NOTIFICATIONS_SSE_POLL_MS: positiveInt,
    NOTIFICATIONS_SSE_MAX_DURATION_MS: positiveInt,
    NOTIFICATIONS_SSE_MAX_ERRORS: positiveInt,
    NOTIFICATION_WEBHOOK_URL: optStr,
    NOTIFICATION_WEBHOOK_SECRET: optStr,

    /* ---- Stripe ---- */
    STRIPE_SECRET_KEY: optStr,
    STRIPE_WEBHOOK_SECRET: optStr,
    STRIPE_PRICE_PRO: optStr,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optStr,

    /* ---- S3 ---- */
    S3_BUCKET: optStr,
    S3_REGION: optStr,
    S3_ENDPOINT: optStr,
    S3_ACCESS_KEY_ID: optStr,
    S3_SECRET_ACCESS_KEY: optStr,
    S3_PUBLIC_BASE_URL: optStr,

    /* ---- SMTP ---- */
    SMTP_HOST: optStr,
    SMTP_PORT: optStr,
    SMTP_SECURE: boolStr.default("false"),
    SMTP_USER: optStr,
    SMTP_PASS: optStr,
    SMTP_FROM: optStr,

    /* ---- GitHub README Sync ---- */
    GITHUB_TOKEN: optStr,

    /* ---- pg-boss / queues ---- */
    USE_WEBHOOK_QUEUE: boolStr.default("true"),
    USE_ASYNC_CREDIT: boolStr.default("false"),

    /* ---- Content moderation ---- */
    CONTENT_SAFETY_BLOCKED: optStr,

    /* ---- Data retention ---- */
    CHAT_RETAIN_DAYS: positiveInt,
    COMMENT_RETAIN_DAYS: positiveInt,

    /* ---- Misc / MCP ---- */
    ALLOW_PRODUCTION_MCP_STDIO: boolStr.default("false"),
    EMBED_CORS_ORIGINS: optStr,
    LOG_LEVEL: optStr,
  })
  .superRefine((data, ctx) => {
    /* Skip enforcement in development / mock-only mode */
    if (!data.ENFORCE_REQUIRED_ENV) return;

    const require = (field: string, value: unknown) => {
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `Required environment variable ${field} is missing or empty`,
        });
      }
    };

    /* Always required in enforcement mode */
    require("SESSION_SECRET", data.SESSION_SECRET);

    /* Database required unless explicitly mock-only */
    if (data.USE_MOCK_DATA !== "true") {
      require("DATABASE_URL", data.DATABASE_URL);
    }

    /* GitHub OAuth required for production login */
    if (data.NODE_ENV === "production") {
      require("GITHUB_CLIENT_ID", data.GITHUB_CLIENT_ID);
      require("GITHUB_CLIENT_SECRET", data.GITHUB_CLIENT_SECRET);
      require("NEXT_PUBLIC_BASE_URL", data.NEXT_PUBLIC_BASE_URL);
    }

    /* API key pepper required when API keys are available */
    if (data.NODE_ENV === "production") {
      require("API_KEY_HASH_PEPPER", data.API_KEY_HASH_PEPPER);
    }

    /* Stripe: if any key is set, all billing vars are required */
    if (data.STRIPE_SECRET_KEY) {
      require("STRIPE_WEBHOOK_SECRET", data.STRIPE_WEBHOOK_SECRET);
      require("STRIPE_PRICE_PRO", data.STRIPE_PRICE_PRO);
    }

    /* S3: if bucket is set, credentials are required */
    if (data.S3_BUCKET) {
      require("S3_ACCESS_KEY_ID", data.S3_ACCESS_KEY_ID);
      require("S3_SECRET_ACCESS_KEY", data.S3_SECRET_ACCESS_KEY);
    }

    /* SMTP: if host is set, auth + from are required */
    if (data.SMTP_HOST) {
      require("SMTP_USER", data.SMTP_USER);
      require("SMTP_PASS", data.SMTP_PASS);
      require("SMTP_FROM", data.SMTP_FROM);
    }
  });

export type ValidatedEnv = z.infer<typeof envSchema>;
