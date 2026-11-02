import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { LINES } from "@/lib/stations";
import { checkRateLimit } from "@/lib/rate-limit";

export { clientIp } from "@/lib/rate-limit";

// Per-IP fixed-window limiter. Durable (Postgres, jomkomute.rate_limit_hit)
// so it survives cold starts and is shared across instances; if the store
// errors or times out it falls back to a per-instance in-memory limit
// (fail safe: neither open nor hard-down). See lib/rate-limit.ts.
export async function rateLimit(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs = 60_000,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, scope, limit, windowMs);
  if (result.allowed) return null;
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
  );
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
