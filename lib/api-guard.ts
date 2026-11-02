import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { LINES } from "@/lib/stations";

// Best-effort per-IP limiter. In-memory, so it is per serverless instance:
// it blunts bursts and scripted abuse but is not a global quota.
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;

export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  const first = fwd?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs = 60_000,
): NextResponse | null {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }
  const key = `${scope}:${clientIp(request)}`;
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  b.count += 1;
  if (b.count > limit) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(Math.ceil((b.resetAt - now) / 1000)) } },
    );
  }
  return null;
}

// Reads and parses a JSON body, refusing anything over maxBytes.
export async function readJson(
  request: NextRequest,
  maxBytes: number,
): Promise<{ ok: true; body: unknown } | { ok: false; res: NextResponse }> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) {
    return { ok: false, res: NextResponse.json({ error: "Payload too large" }, { status: 413 }) };
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return { ok: false, res: NextResponse.json({ error: "Invalid body" }, { status: 400 }) };
  }
  if (text.length > maxBytes) {
    return { ok: false, res: NextResponse.json({ error: "Payload too large" }, { status: 413 }) };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, res: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }
}

const LINE_IDS = new Set<string>(LINES.map((l) => l.id));
export const isKnownLineId = (v: unknown): v is string => typeof v === "string" && LINE_IDS.has(v);

// Station names: printable text, bounded length (no control chars).
export const isValidStation = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= 80 && /^[\p{L}\p{N} .'&()/,-]+$/u.test(v);

export const isValidDate = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

// Web Push endpoints must be https on a known push-service host, so the
// server never makes requests to attacker-chosen URLs.
const PUSH_HOSTS = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"];
const PUSH_HOST_SUFFIXES = [".notify.windows.com", ".push.apple.com", ".push.services.mozilla.com"];

export function isAllowedPushEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length === 0 || v.length > 2048) return false;
  let u: URL;
  try {
    u = new URL(v);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password) return false;
  if (u.port && u.port !== "443") return false;
  const h = u.hostname.toLowerCase();
  return PUSH_HOSTS.includes(h) || PUSH_HOST_SUFFIXES.some((s) => h.endsWith(s));
}
