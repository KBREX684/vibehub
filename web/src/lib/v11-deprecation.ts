import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export type DeprecatedApiCode =
  | "TEAMS_DEPRECATED"
  | "INTENTS_DEPRECATED"
  | "TEAM_WORKSPACE_DEPRECATED";

export const V11_DEPRECATED_SINCE = "2026-04-19";
export const V11_LEARN_MORE_URL = "/v11";

export function isV11BackendLockdownEnabled() {
  const raw = process.env.V11_BACKEND_LOCKDOWN?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function isDeprecatedApiCode(code: string): code is DeprecatedApiCode {
  return (
    code === "TEAMS_DEPRECATED" ||
    code === "INTENTS_DEPRECATED" ||
    code === "TEAM_WORKSPACE_DEPRECATED"
  );
}

export function getDeprecatedApiMessage(code: DeprecatedApiCode) {
  switch (code) {
    case "TEAMS_DEPRECATED":
      return "团队协作写入能力已归档，当前仅保留只读兼容。";
    case "INTENTS_DEPRECATED":
      return "协作意向写入能力已归档，当前仅保留历史记录只读访问。";
    case "TEAM_WORKSPACE_DEPRECATED":
      return "团队工作区创建能力已归档，当前不再创建新的团队工作区。";
  }
}

export function deprecatedHeaders(extra?: Record<string, string>) {
  return {
    "X-Deprecated": "true",
    "X-Deprecated-Since": V11_DEPRECATED_SINCE,
    Link: `<${V11_LEARN_MORE_URL}>; rel="deprecation"`,
    ...extra,
  };
}

export function buildDeprecatedErrorPayload(code: DeprecatedApiCode, message?: string) {
  return {
    error: {
      code,
      message: message ?? getDeprecatedApiMessage(code),
      deprecatedSince: V11_DEPRECATED_SINCE,
      learnMoreUrl: V11_LEARN_MORE_URL,
    },
    meta: {
      requestId: randomUUID(),
      timestamp: new Date().toISOString(),
    },
  };
}

export function deprecatedResponse(code: DeprecatedApiCode, message?: string) {
  return NextResponse.json(buildDeprecatedErrorPayload(code, message), {
    status: 410,
    headers: deprecatedHeaders(),
  });
}

export function withDeprecatedHeaders(response: NextResponse) {
  const headers = deprecatedHeaders();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}
