"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthBrandingPanel } from "@/components/auth-branding-panel";
import { DemoButton } from "@/components/demo-button";
import { Logo } from "@/components/logo-mark";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/spinner";
import { supabaseBrowser } from "@/lib/supabase-client";

// Jom ID: accounts are shared across *.taufikhamid.com and created on the
// portal, which sends the user back here signed in (shared cookie). The
// local /signup page still works but isn't linked from here.
const JOM_ID_SIGNUP_URL =
  "https://jomid.taufikhamid.com/signup?next=" +
  encodeURIComponent("https://jomkomute.taufikhamid.com/");

// Signing in also works through the portal: /continue sends the user straight
// back here (to the same "/" the email/password flow lands on) once signed in.
const JOM_ID_CONTINUE_URL = "https://jomid.taufikhamid.com/continue";
const FALLBACK_ORIGIN = "https://jomkomute.taufikhamid.com";
const POST_LOGIN_PATH = "/";

function jomIdHref(origin: string): string {
  return `${JOM_ID_CONTINUE_URL}?next=${encodeURIComponent(origin + POST_LOGIN_PATH)}`;
}

// This app has no server actions (see lib/store.ts's client-only,
// localStorage-backed pattern) so — unlike DuitDuit's useActionState +
// Server Action login — this calls supabase.auth.signInWithPassword()
// directly from the client with plain useState for pending/error.
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const { error: authError } = await supabaseBrowser().auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 md:items-stretch">
      <AuthBrandingPanel />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted px-4">
        <Link href="/" aria-label="JomKomute" className="md:hidden">
          <Logo size={36} wordmarkClassName="text-2xl" />
        </Link>

        <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 animate-page-in">
          <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
          <p className="mb-6 text-sm text-foreground/60">
            Sign in to sync your account across devices.
          </p>

          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-form-error" : undefined}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            />
            <PasswordInput
              name="password"
              placeholder="Password"
              required
              autoComplete="current-password"
              showLabel="Show password"
              hideLabel="Hide password"
              value={password}
              onChange={setPassword}
              ariaInvalid={!!error}
              ariaDescribedBy={error ? "login-form-error" : undefined}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            />
            {error && (
              <p id="login-form-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {pending && <Spinner />}
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-foreground/40">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col gap-3">
          <a
            href={jomIdHref(FALLBACK_ORIGIN)}
            onClick={(e) => {
              // Use the real origin (preview/localhost) when running in a browser.
              e.preventDefault();
              window.location.assign(jomIdHref(window.location.origin));
            }}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Continue with Jom ID
          </a>

            <DemoButton />
          </div>

          <p className="mt-6 text-center text-sm text-foreground/60">
            Don&apos;t have an account?{" "}
            <a href={JOM_ID_SIGNUP_URL} className="font-medium text-primary underline-offset-4 hover:underline">
              Sign up
            </a>
          </p>
        </div>

        {/* AuthBrandingPanel (with the footnote) is hidden below md, so
            repeat it here for mobile. */}
        <p className="text-center text-xs text-foreground/40 md:hidden">
          Your daily commute, minus the surprises.{" "}
          <a
            href="https://taufikhamid.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline hover:text-foreground/60"
          >
            A project by Muhammad Taufik &rarr;
          </a>
        </p>
      </div>
    </div>
  );
}
