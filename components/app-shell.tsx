"use client";

import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { Shell } from "@/components/shell";
import { useAuthed } from "@/lib/use-auth";
import { useDictionary } from "@/lib/use-dictionary";

// Shared page frame for every content screen: dark band header (alerts bell,
// brand, Live badge, optional title and right-hand controls) with a rounded
// sheet overlapping it, and the mobile bottom tab bar (rendered by Shell,
// which also reserves its bottom padding). The home dashboard, /today,
// /line-status, /routes, /route, /settings, /about and /pitch use it. The
// full-screen map, the planner, /login, /signup, /report and /new do not.
const WIDTHS = {
  sm: "max-w-lg",
  md: "max-w-xl",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  // Reading pages (about, pitch): a text column of about 65 characters.
  reading: "max-w-[65ch]",
} as const;

export type AppShellWidth = keyof typeof WIDTHS;

export function BellIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </svg>
  );
}

export function AppShell({
  children,
  title,
  back,
  headerRight,
  width = "md",
  tabBar = true,
}: {
  children: React.ReactNode;
  /** Page title, shown as the h1 in the band. Omit when the content has its own h1. */
  title?: string;
  /** Link back to a parent screen, shown under the header row. */
  back?: { href: string; label: string };
  /** Extra controls on the right of the header row (e.g. the home view toggle). */
  headerRight?: React.ReactNode;
  width?: AppShellWidth;
  tabBar?: boolean;
}) {
  const { t } = useDictionary();
  const authed = useAuthed();
  const h = t.homeScreen;
  const max = WIDTHS[width];

  return (
    <Shell band tabBar={tabBar}>
      <div className="flex flex-1 flex-col bg-[var(--band)]">
        <header className={`mx-auto w-full ${max} px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-14 text-[var(--band-foreground)]`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link
                href="/line-status"
                aria-label={h.alerts}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <BellIcon />
              </Link>
              <Link
                href="/"
                className="flex min-h-11 items-center gap-1.5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
              >
                <LogoMark size={22} />
                <span className="max-[420px]:sr-only">{t.nav.brand}</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-[11px] font-bold tracking-wide text-emerald-950 uppercase">
                {h.live}
              </span>
              {headerRight}
              {authed === false && (
                <Link
                  href="/login"
                  className="flex min-h-11 items-center rounded-full bg-white/15 px-4 text-sm font-semibold transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t.nav.logIn}
                </Link>
              )}
            </div>
          </div>
          {back && (
            <Link
              href={back.href}
              className="mt-2 -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-medium text-white/90 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4 6 10l6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {back.label}
            </Link>
          )}
          {title && <h1 className="mt-4 text-2xl leading-tight font-bold text-balance">{title}</h1>}
        </header>

        <div className="-mt-8 flex-1 rounded-t-[2rem] bg-background">
          <div className={`mx-auto flex w-full ${max} flex-col gap-6 px-4 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]`}>
            {children}
          </div>
        </div>
      </div>
    </Shell>
  );
}
