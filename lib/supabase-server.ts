// Server-only Supabase client for app/api/pings/* (see server/schema.sql
// and server/openapi.yaml for the design this implements). Uses the
// service-role key so route handlers can read/write jomkomute_* tables
// directly — there's no per-user auth in this design (see schema.sql's
// header: no accounts, only a client-generated ping_key), so RLS isn't
// the access-control layer here; the API route logic is.
//
// Never import this from client components — SUPABASE_SERVICE_ROLE_KEY
// must never reach the browser bundle.
import { createClient } from "@supabase/supabase-js";

export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — see .env.example.",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
