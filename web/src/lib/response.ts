import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

function sanitizeErrorPayload(payload: ErrorPayload, status: number): ErrorPayload {
  if (status >= 500 && process.env.NODE_ENV === "production") {
    return {
      code: payload.code,
      message: payload.message,
    };
  }
  return payload;
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      data,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function apiError(payload: ErrorPayload, status = 400, headers?: Record<string, string>) {
  return NextResponse.json(
    {
      error: sanitizeErrorPayload(payload, status),
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    { status, headers }
  );
}
