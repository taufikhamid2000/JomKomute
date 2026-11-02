import "server-only";
import { supabaseServer } from "@/lib/supabase-server";

export type RateLimitResult = { allowed: boolean; retryAfter: number };

// Durable store call: returns the hit result, or throws on any failure.
export type RateStore = (key: string, limit: number, windowSeconds: number) => Promise<RateLimitResult>;

const STORE_TIMEOUT_MS = 1500;

// Client IP from trusted proxy headers. On Vercel the platform sets
// x-forwarded-for (first hop is the real client), so use that first.
export function clientIp(request: { headers: Headers }): string {
  const fwd = request.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  const ip = first || request.headers.get("x-real-ip")?.trim() || "unknown";
  return ip.slice(0, 64);
}

// ---- in-memory fallback (per serverless instance) ----
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

export function memoryLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: Math.ceil(windowMs / 1000) };
  }
  b.count += 1;
  return { allowed: b.count <= limit, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
}

export function resetMemoryLimiter(): void {
  buckets.clear();
}

// ---- Postgres store ----
export const supabaseStore: RateStore = async (key, limit, windowSeconds) => {
  const { data, error } = await supabaseServer()
    .rpc("rate_limit_hit", { p_key: key, p_limit: limit, p_window_seconds: windowSeconds })
    .abortSignal(AbortSignal.timeout(STORE_TIMEOUT_MS));
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row.allowed !== "boolean") throw new Error("unexpected rate_limit_hit response");
  return { allowed: row.allowed, retryAfter: Math.max(1, Number(row.retry_after) || 1) };
};

export async function rateLimitWithStore(
  store: RateStore,
  ip: string,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const key = `${scope}:${ip}`;
  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));
  try {
    return await store(key, limit, windowSeconds);
  } catch (err) {
    console.error("[rate-limit] store failed, using in-memory fallback:", err instanceof Error ? err.message : err);
    return memoryLimit(key, limit, windowMs);
  }
}

export function checkRateLimit(
  request: { headers: Headers },
  scope: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return rateLimitWithStore(supabaseStore, clientIp(request), scope, limit, windowMs);
}
