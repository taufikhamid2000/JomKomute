// Browser-side Supabase client, for client components that need
// supabase.auth.* (login/signup forms — see app/login, app/signup). Uses
// the public anon key, unlike lib/supabase-server.ts's service-role
// client — safe to import from "use client" files.
"use client";

import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

export function supabaseBrowser() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — see .env.example.",
    );
  }

  client = createClient(url, anonKey);
  return client;
}
