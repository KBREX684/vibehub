import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkWriteRateLimit, getClientIp } from "@/lib/ip-rate-limit";

const webVitalSchema = z.object({
  name: z.enum(["LCP", "CLS", "INP", "FCP", "TTFB", "FID"]),
  value: z.number().finite(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
  id: z.string().max(64),
  navigationType: z.string().max(32).optional(),
});

/** POST /api/v1/telemetry/web-vitals – beacon endpoint for Core Web Vitals. */
export async function POST(request: NextRequest) {
  const rl = checkWriteRateLimit(request);
  if (!rl.ok) {
    return new NextResponse(null, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSeconds) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const result = webVitalSchema.safeParse(body);
  if (!result.success) {
    return new NextResponse(null, { status: 400 });
  }

  const { name, value, rating, id, navigationType } = result.data;
  logger.info(
    { metric: name, value, rating, id, navigationType, ip: getClientIp(request) },
    `web-vital ${name}=${value.toFixed(1)} (${rating})`,
  );

  return new NextResponse(null, { status: 204 });
}
