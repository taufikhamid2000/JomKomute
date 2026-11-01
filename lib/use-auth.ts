"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";

// Same session check as components/auth-gate.tsx (getSession on mount +
// onAuthStateChange). null = not resolved yet, so callers can avoid a
// login/logout flash.
export function useAuthed(): boolean | null {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) setAuthed(!!session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setAuthed(!!session);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return authed;
}
