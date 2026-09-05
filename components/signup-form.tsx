"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthBrandingPanel } from "@/components/auth-branding-panel";
import { LogoMark } from "@/components/logo-mark";
import { PasswordInput } from "@/components/password-input";
import { Spinner } from "@/components/spinner";
import { supabaseBrowser } from "@/lib/supabase-client";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const { error: authError } = await supabaseBrowser().auth.signUp({
      email,
      password,
    });

    setPending(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setMessage("Check your email to confirm your account before logging in.");
  }

  return (
    <div className="flex flex-1 md:items-stretch">
      <AuthBrandingPanel />

      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted px-4">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <LogoMark size={28} />
          <span className="text-lg font-semibold text-foreground">JomKomute</span>
        </Link>

        <div className="w-full max-w-sm rounded-2xl border border-border bg-background p-8 animate-page-in">
          <h1 className="text-xl font-semibold text-foreground">Create an account</h1>
          <p className="mb-6 text-sm text-foreground/60">
            Optional — the core features work fine without one.
          </p>

          {message ? (
            <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground">{message}</p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-3">
              <input
                name="email"
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "signup-form-error" : undefined}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              />
              <PasswordInput
                name="password"
                placeholder="Password"
                required
                autoComplete="new-password"
                showLabel="Show password"
                hideLabel="Hide password"
                value={password}
                onChange={setPassword}
                ariaInvalid={!!error}
                ariaDescribedBy={error ? "signup-form-error" : undefined}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              />
              {error && (
                <p id="signup-form-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {pending && <Spinner />}
                {pending ? "Signing up…" : "Sign up"}
              </button>
            </form>
          )}

          {!message && (
            <p className="mt-6 text-center text-sm text-foreground/60">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
