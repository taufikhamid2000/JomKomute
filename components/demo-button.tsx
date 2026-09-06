"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/spinner";
import { supabaseBrowser } from "@/lib/supabase-client";

// "Try the demo — no account needed", matching the login/anonymous-signin
// pattern shared across the portfolio (see duitduit's app/actions/auth.ts
// startDemo()). This app has no server actions (lib/store.ts's comment),
// so — like login-form.tsx / signup-form.tsx — this calls
// supabase.auth.signInAnonymously() directly from the client instead of a
// Server Action. No sample data to seed here; an anonymous session is
// enough to pass the auth gate (components/auth-gate.tsx) and the app's
// existing localStorage-backed routes/exceptions work the same either way.
export function DemoButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);

    const { error: authError } = await supabaseBrowser().auth.signInAnonymously();

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {pending && <Spinner />}
        {pending ? "Starting demo…" : "Try the demo — no account needed"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
