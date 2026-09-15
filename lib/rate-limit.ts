// Rate limiting that scales: backed by Upstash Redis (sliding window) once the
// app has UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN set, otherwise a
// per-process in-memory bucket. The in-memory table is NOT shared across
// serverless instances, so enable Upstash before deploying to multiple hosts.
// On Upstash errors we fail open so an outage doesn't take down all writes.

import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const useUpstash = Boolean(upstashUrl && upstashToken);

// Reuse one Redis client + limiter per (limit, window) shape.
const upstashLimiters = new Map<string, Ratelimit>();
function getUpstashLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis({ url: upstashUrl, token: upstashToken }),
      limiter: Ratelimit.slidingWindow(limit, `${windowMs / 1000} s` as Duration),
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

async function upstashCheck(
  limiter: Ratelimit,
  key: string
): Promise<{ ok: boolean; retryAfterMs?: number }> {
  try {
    const { success, reset } = await limiter.limit(key);
    if (success) return { ok: true };
    return { ok: false, retryAfterMs: Math.max(0, reset - Date.now()) };
  } catch {
    return { ok: true };
  }
}

type Bucket = { start: number; count: number };
const hitBuckets = new Map<string, Bucket>();
const BUCKET_TTL_MS = 3600_000;
let lastClean = 0;

function cleanupBuckets(now: number) {
  if (now - lastClean < 60_000) return;
  lastClean = now;
  for (const [k, b] of hitBuckets) {
    if (now - b.start > BUCKET_TTL_MS) hitBuckets.delete(k);
  }
}

function memoryCheck(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  cleanupBuckets(now);
  const existing = hitBuckets.get(key);
  if (!existing || now - existing.start >= windowMs) {
    hitBuckets.set(key, { start: now, count: 1 });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: existing.start + windowMs - now };
  }
  existing.count += 1;
  return { ok: true };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ ok: boolean; retryAfterMs?: number }> {
  if (useUpstash) return upstashCheck(getUpstashLimiter(limit, windowMs), key);
  return memoryCheck(key, limit, windowMs);
}

/** Best-effort requester IP (reverse proxies set x-forwarded-for). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Shortcut: gate a route on the requester's IP within a window. */
export function rateLimitByIp(
  req: Request,
  limit: number,
  windowMs: number,
  scope: string
): Promise<{ ok: boolean; retryAfterMs?: number }> {
  return rateLimit(`${scope}:ip:${clientIp(req)}`, limit, windowMs);
}