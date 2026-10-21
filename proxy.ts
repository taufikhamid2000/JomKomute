import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { clearLegacyHostCookies } from "@/lib/supabase/legacy-cookies";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Jom ID: expire pre-Jom-ID host-only sb-* cookies (once per browser).
  // MUST stay the very last cookie write on the response — it appends raw
  // Set-Cookie headers, and any later response.cookies.set/delete rewrites
  // the Set-Cookie list and would drop them.
  clearLegacyHostCookies(request, response);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
