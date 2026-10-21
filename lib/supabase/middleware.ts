import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { jomCookieOptions } from "@/lib/supabase/cookie-options";
import {
  SUPABASE_DB_SCHEMA,
  hasSupabaseEnv,
  supabaseAnonKey,
  supabaseUrl,
} from "@/lib/supabase/env";

/**
 * Refreshes the Supabase session cookie on every request.
 *
 * No route protection here: JomKomute gates pages client-side
 * (components/auth-gate.tsx), and that behaviour is intentionally unchanged.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!hasSupabaseEnv) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    // Jom ID: share the session cookie across *.taufikhamid.com.
    cookieOptions: jomCookieOptions(request.headers.get("host")),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
    db: { schema: SUPABASE_DB_SCHEMA },
  });

  // Refresh the session if expired. Don't put code between client creation
  // and getUser() — it keeps the cookie refresh reliable.
  await supabase.auth.getUser();

  return response;
}
