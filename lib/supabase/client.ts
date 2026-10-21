"use client";

import { createBrowserClient } from "@supabase/ssr";
import { jomCookieOptions } from "@/lib/supabase/cookie-options";
import { SUPABASE_DB_SCHEMA, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Browser-side Supabase client (anon key). Uses @supabase/ssr so the
// session lives in cookies (not localStorage) — that's what lets Jom ID
// share one sign-in across every *.taufikhamid.com app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createBrowserClient<any, "jomkomute">> | null = null;

export function supabaseBrowser() {
  if (client) return client;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = createBrowserClient<any, "jomkomute">(supabaseUrl, supabaseAnonKey, {
    // Jom ID: share the session cookie across *.taufikhamid.com.
    cookieOptions: jomCookieOptions(
      typeof window === "undefined" ? undefined : window.location.hostname
    ),
    db: { schema: SUPABASE_DB_SCHEMA },
  });
  return client;
}
