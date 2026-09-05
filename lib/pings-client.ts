// Client for app/api/pings/* (server/openapi.yaml). Only reachable when
// this app is actually served by a backend (Vercel) — on the GitHub
// Pages static export there's no API to call, so every function here is
// written to fail soft: callers should fall back to lib/crowd-mock.ts's
// mockCrowdFor when a call rejects, exactly as the dashboard does today.

const CLIENT_SECRET_KEY = "jomkomute:ping-client-secret";

// A per-device random secret, generated once and kept in localStorage —
// never sent to the server on its own, only hashed together with
// route/date into a ping_key (see server/schema.sql's header for why:
// this lets a device manage its own ping without the server learning a
// stable cross-day identity).
function getClientSecret(): string {
  if (typeof window === "undefined") return "";
  let secret = window.localStorage.getItem(CLIENT_SECRET_KEY);
  if (!secret) {
    secret = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_SECRET_KEY, secret);
  }
  return secret;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function pingKeyFor(routeId: string, tripDate: string): Promise<string> {
  const secret = getClientSecret();
  return sha256Hex(`${secret}|${routeId}|${tripDate}`);
}

export type PutPingInput = {
  routeId: string;
  station: string;
  lineId?: string;
  tripDate: string; // YYYY-MM-DD
  timeBucket: number; // minutes since midnight
};

export async function putPing(input: PutPingInput): Promise<void> {
  const key = await pingKeyFor(input.routeId, input.tripDate);
  const res = await fetch(`/api/pings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      station: input.station,
      lineId: input.lineId,
      tripDate: input.tripDate,
      timeBucket: input.timeBucket,
    }),
  });
  if (!res.ok) throw new Error(`PUT /api/pings failed: ${res.status}`);
}

export async function deletePing(routeId: string, tripDate: string): Promise<void> {
  const key = await pingKeyFor(routeId, tripDate);
  const res = await fetch(`/api/pings/${key}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /api/pings failed: ${res.status}`);
}

export type PingCounts = { count: number | null; suppressed: boolean };

export async function getPingCounts(
  station: string,
  date: string,
  bucket: number,
  window?: number,
): Promise<PingCounts> {
  const params = new URLSearchParams({ station, date, bucket: String(bucket) });
  if (window !== undefined) params.set("window", String(window));
  const res = await fetch(`/api/pings/counts?${params.toString()}`);
  if (!res.ok) throw new Error(`GET /api/pings/counts failed: ${res.status}`);
  return res.json();
}
