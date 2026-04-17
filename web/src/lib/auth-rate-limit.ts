import { createHash } from "crypto";
import { checkDistributedRateLimit } from "@/lib/distributed-rate-limit";

function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function hashIdentity(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 24);
}

async function checkBucket(bucketKey: string, maxRequests: number, windowMs: number) {
  return checkDistributedRateLimit({ bucketKey, maxRequests, windowMs });
}

export async function enforceAuthActionRateLimit(params: {
  request: Request;
  action: "login" | "register" | "forgot_password";
  identity: string;
}): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const normalizedIdentity = params.identity.trim().toLowerCase();
  const ip = requestIp(params.request);
  const identityHash = hashIdentity(normalizedIdentity);

  const policy =
    params.action === "login"
      ? { identityMax: 10, ipMax: 30, windowMs: 15 * 60 * 1000 }
      : params.action === "register"
        ? { identityMax: 5, ipMax: 10, windowMs: 60 * 60 * 1000 }
        : { identityMax: 5, ipMax: 10, windowMs: 60 * 60 * 1000 };

  const [identityResult, ipResult] = await Promise.all([
    checkBucket(`auth:${params.action}:identity:${identityHash}`, policy.identityMax, policy.windowMs),
    checkBucket(`auth:${params.action}:ip:${ip}`, policy.ipMax, policy.windowMs),
  ]);

  if (!identityResult.ok) {
    return { ok: false, retryAfterSeconds: identityResult.retryAfterSeconds };
  }
  if (!ipResult.ok) {
    return { ok: false, retryAfterSeconds: ipResult.retryAfterSeconds };
  }
  return { ok: true };
}
