import Redis from "ioredis";
import { logger } from "@/lib/logger";

let client: Redis | null = null;
let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let initFailed = false;

function redisUrl(): string | null {
  const value = process.env.REDIS_URL?.trim();
  return value || null;
}

export function hasRedisConfigured(): boolean {
  return Boolean(redisUrl());
}

export function isProductionLikeInfra(): boolean {
  return process.env.NODE_ENV === "production" || process.env.ENFORCE_REQUIRED_ENV === "true";
}

function createRedisClient(role: "client" | "publisher" | "subscriber"): Redis {
  const url = redisUrl();
  if (!url) {
    throw new Error("REDIS_URL is not configured");
  }
  const instance = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  instance.on("error", (error) => {
    logger.warn({ role, err: { message: error.message } }, "redis client error");
  });
  return instance;
}

export async function getRedisClient(): Promise<Redis | null> {
  if (!hasRedisConfigured() || initFailed) return null;
  if (client) return client;
  try {
    client = createRedisClient("client");
    return client;
  } catch (error) {
    initFailed = true;
    logger.error({ err: error instanceof Error ? { message: error.message } : { value: String(error) } }, "failed to initialize redis client");
    return null;
  }
}

export async function getRedisPublisher(): Promise<Redis | null> {
  if (!hasRedisConfigured() || initFailed) return null;
  if (publisher) return publisher;
  try {
    publisher = createRedisClient("publisher");
    return publisher;
  } catch (error) {
    initFailed = true;
    logger.error({ err: error instanceof Error ? { message: error.message } : { value: String(error) } }, "failed to initialize redis publisher");
    return null;
  }
}

export async function getRedisSubscriber(): Promise<Redis | null> {
  if (!hasRedisConfigured() || initFailed) return null;
  if (subscriber) return subscriber;
  try {
    subscriber = createRedisClient("subscriber");
    return subscriber;
  } catch (error) {
    initFailed = true;
    logger.error({ err: error instanceof Error ? { message: error.message } : { value: String(error) } }, "failed to initialize redis subscriber");
    return null;
  }
}

export async function getRedisHealth(): Promise<
  { status: "not_configured"; mode: "none" } |
  { status: "ok"; mode: "redis" } |
  { status: "error"; mode: "redis" }
> {
  if (!hasRedisConfigured()) {
    return { status: "not_configured", mode: "none" };
  }
  const redis = await getRedisClient();
  if (!redis) {
    return { status: "error", mode: "redis" };
  }
  try {
    const pong = await redis.ping();
    return pong === "PONG" ? { status: "ok", mode: "redis" } : { status: "error", mode: "redis" };
  } catch {
    return { status: "error", mode: "redis" };
  }
}
