// Supabase env vars, shared by the browser and proxy (session-refresh)
// clients. The service-role client for app/api/* lives in
// lib/supabase-server.ts and reads its own key.
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when both the Supabase URL and anon key are actually configured. */
export const hasSupabaseEnv = Boolean(envUrl && envAnonKey);

// Harmless placeholders when the env vars aren't set (e.g. a local build
// with no .env.local) so client creation doesn't throw during prerender.
// Real requests against the placeholder URL simply fail at runtime.
export const supabaseUrl = envUrl || "https://placeholder.supabase.co";
export const supabaseAnonKey = envAnonKey || "placeholder-anon-key";

/** Postgres schema all of JomKomute's tables live in. */
export const SUPABASE_DB_SCHEMA = "jomkomute";
