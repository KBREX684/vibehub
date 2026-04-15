import pino from "pino";

type RequestLike = {
  method?: string;
  nextUrl?: { pathname: string; search?: string };
  url?: string;
  headers: Headers;
};

const level = process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug");

export const logger = pino({
  level,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "authorization",
      "cookie",
      "*.authorization",
      "*.cookie",
    ],
    censor: "[REDACTED]",
  },
});

export function getRequestId(request: RequestLike): string {
  return request.headers.get("x-request-id") ?? "unknown-request";
}

export function getRequestLogger(request: RequestLike, bindings?: Record<string, unknown>) {
  const pathname = request.nextUrl?.pathname ?? new URL(request.url ?? "http://localhost").pathname;
  const search = request.nextUrl?.search ?? "";

  return logger.child({
    requestId: getRequestId(request),
    method: request.method,
    path: pathname,
    search: search || undefined,
    ...bindings,
  });
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: String(error) };
}
