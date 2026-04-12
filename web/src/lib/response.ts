import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
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

export function apiError(payload: ErrorPayload, status = 400) {
  return NextResponse.json(
    {
      error: payload,
      meta: {
        requestId: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}
