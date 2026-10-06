import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

type RateLimitScope = "chain" | "scan" | "decode" | "csr" | "key-match";
type RateLimitSource = "memory" | "redis" | "memory-fallback";

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfter: number;
  source: RateLimitSource;
};

const memoryHits = new Map<string, RateLimitEntry>();
const redisRestUrl = process.env.RATE_LIMIT_REDIS_REST_URL;
const redisRestToken = process.env.RATE_LIMIT_REDIS_REST_TOKEN;
const redisTimeoutMs = Number(process.env.RATE_LIMIT_REDIS_TIMEOUT_MS ?? 1500);
const redisFailOpen = process.env.RATE_LIMIT_REDIS_FAIL_OPEN !== "0";
const keySalt = process.env.RATE_LIMIT_KEY_SALT ?? process.env.SSLCONF_LOG_SALT ?? "sslconf-local";

function scopeLimit(scope: RateLimitScope) {
  const fallback = Number(process.env.RATE_LIMIT_MAX ?? 20);
  if (scope === "scan") return Number(process.env.RATE_LIMIT_SCAN_MAX ?? fallback);
  if (scope === "decode") return Number(process.env.RATE_LIMIT_DECODE_MAX ?? fallback);
  if (scope === "csr") return Number(process.env.RATE_LIMIT_CSR_MAX ?? fallback);
  if (scope === "key-match") return Number(process.env.RATE_LIMIT_KEY_MATCH_MAX ?? fallback);
  return Number(process.env.RATE_LIMIT_CHAIN_MAX ?? fallback);
}

function targetScopeLimit(scope: RateLimitScope) {
  const fallback = Number(process.env.RATE_LIMIT_TARGET_MAX ?? 30);
  if (scope === "scan") return Number(process.env.RATE_LIMIT_TARGET_SCAN_MAX ?? fallback);
  if (scope === "decode") return Number(process.env.RATE_LIMIT_DECODE_MAX ?? fallback);
  if (scope === "csr") return Number(process.env.RATE_LIMIT_CSR_MAX ?? fallback);
  if (scope === "key-match") return Number(process.env.RATE_LIMIT_KEY_MATCH_MAX ?? fallback);
  return Number(process.env.RATE_LIMIT_TARGET_CHAIN_MAX ?? fallback);
}

function cleanupExpired(now: number) {
  if (memoryHits.size < 1000) return;
  memoryHits.forEach((value, key) => {
    if (value.expiresAt <= now) memoryHits.delete(key);
  });
}

export function clientIpFromRequest(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

export function rateLimitHeaders(limit: RateLimitResult) {
  return {
    "x-ratelimit-limit": String(limit.limit),
    "x-ratelimit-remaining": String(limit.remaining),
    "x-ratelimit-reset": String(Math.ceil(limit.resetAt / 1000)),
    "x-ratelimit-source": limit.source,
    ...(limit.allowed ? {} : { "retry-after": String(limit.retryAfter) })
  };
}

function hashedClientKey(ip: string) {
  return createHash("sha256").update(`${keySalt}:${ip}`).digest("hex").slice(0, 32);
}

function hashedTargetKey(host: string, port: number) {
  return createHash("sha256").update(`${keySalt}:${host.toLowerCase()}:${port}`).digest("hex").slice(0, 32);
}

function memoryRateLimit(key: string, max: number, windowSeconds: number, source: RateLimitSource): RateLimitResult {
  const now = Date.now();
  cleanupExpired(now);

  const current = memoryHits.get(key);
  if (!current || current.expiresAt <= now) {
    const expiresAt = now + windowSeconds * 1000;
    memoryHits.set(key, { count: 1, expiresAt });
    return { allowed: true, limit: max, remaining: Math.max(0, max - 1), resetAt: expiresAt, retryAfter: 0, source };
  }

  current.count += 1;
  const retryAfter = Math.ceil((current.expiresAt - now) / 1000);
  const remaining = Math.max(0, max - current.count);
  return {
    allowed: current.count <= max,
    limit: max,
    remaining,
    resetAt: current.expiresAt,
    retryAfter,
    source
  };
}

type RedisPipelineItem = {
  result?: unknown;
  error?: string;
};

async function redisRateLimit(key: string, max: number, windowSeconds: number): Promise<RateLimitResult> {
  if (!redisRestUrl || !redisRestToken) throw new Error("Redis rate limit is not configured.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), redisTimeoutMs);
  try {
    const response = await fetch(`${redisRestUrl.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "authorization": `Bearer ${redisRestToken}`,
        "content-type": "application/json"
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, windowSeconds, "NX"],
        ["TTL", key]
      ])
    });

    if (!response.ok) throw new Error(`Redis rate limit HTTP ${response.status}`);
    const data = await response.json() as RedisPipelineItem[];
    if (data.some((item) => item.error)) throw new Error(data.find((item) => item.error)?.error ?? "Redis rate limit command failed.");

    const count = Number(data[0]?.result ?? 1);
    const ttlRaw = Number(data[2]?.result ?? windowSeconds);
    const ttl = ttlRaw > 0 ? ttlRaw : windowSeconds;
    const retryAfter = Math.max(1, ttl);
    return {
      allowed: count <= max,
      limit: max,
      remaining: Math.max(0, max - count),
      resetAt: Date.now() + ttl * 1000,
      retryAfter,
      source: "redis"
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function assertRateLimit(ip: string, scope: RateLimitScope): Promise<RateLimitResult> {
  const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
  const max = scopeLimit(scope);
  const key = `rate:tls:${scope}:${hashedClientKey(ip)}`;

  return assertRateLimitKey(key, max, windowSeconds, scope);
}

export async function assertTargetRateLimit(host: string, port: number, scope: RateLimitScope): Promise<RateLimitResult> {
  const windowSeconds = Number(process.env.RATE_LIMIT_TARGET_WINDOW_SECONDS ?? process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
  const max = targetScopeLimit(scope);
  const key = `rate:tls:target:${scope}:${hashedTargetKey(host, port)}`;

  return assertRateLimitKey(key, max, windowSeconds, scope);
}

async function assertRateLimitKey(key: string, max: number, windowSeconds: number, scope: RateLimitScope): Promise<RateLimitResult> {

  if (redisRestUrl && redisRestToken) {
    try {
      return await redisRateLimit(key, max, windowSeconds);
    } catch (error) {
      console.warn(JSON.stringify({
        event: "sslconf_rate_limit_redis_error",
        scope,
        error: error instanceof Error ? error.message : "Redis rate limit failed"
      }));
      if (!redisFailOpen) {
        return { allowed: false, limit: max, remaining: 0, resetAt: Date.now() + windowSeconds * 1000, retryAfter: windowSeconds, source: "redis" };
      }
      return memoryRateLimit(key, max, windowSeconds, "memory-fallback");
    }
  }

  return memoryRateLimit(key, max, windowSeconds, "memory");
}
