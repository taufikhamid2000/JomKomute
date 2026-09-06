"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";

// This app has no middleware/server actions (static-friendly, client-only
// auth — see lib/supabase-client.ts and lib/store.ts's comments), so the
// login gate is enforced here instead of in middleware.ts: every page is
// wrapped in this client component (see app/layout.tsx) which checks for a
// Supabase session (real or anonymous, from "Try the demo" — see
// components/demo-button.tsx) on mount and redirects to /login if there
// isn't one. /login and /signup are excluded so the gate doesn't loop.
const PUBLIC_PATHS = ["/login", "/signup"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    let cancelled = false;
    const supabase = supabaseBrowser();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session && !publicPath) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isPublicPath(window.location.pathname)) {
        router.replace("/login");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicPath, router]);

  // Avoid flashing gated content before the session check resolves — the
  // public auth pages render immediately since there's nothing to protect.
  if (!publicPath && !ready) return null;

  return <>{children}</>;
}
