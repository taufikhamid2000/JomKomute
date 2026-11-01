"use client";

import Link from "next/link";
import { Logo } from "@/components/logo-mark";
import { Shell } from "@/components/shell";
import { useAuthed } from "@/lib/use-auth";
import { useDictionary } from "@/lib/use-dictionary";

// Shared page frame for every content screen: gradient band header (alerts bell,
// logo + wordmark, Live badge, optional title and right-hand controls) with a rounded
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

// Decorative rail-line illustration in the header: a dashed line with three
// stations. Low contrast on purpose (it can sit behind the title, so the
// white-at-12% blend is part of scripts/check-contrast.mjs) and hidden from
// assistive tech.
function TrackDecor() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 120"
      fill="none"
      className="pointer-events-none absolute -right-6 bottom-10 h-28 w-72 select-none"
    >
      <circle cx="262" cy="34" r="74" fill="#ffffff" fillOpacity="0.06" />
      <path d="M0 96 C70 96 90 40 160 40 S250 84 320 56" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
      <circle cx="96" cy="68" r="7" fill="#ffffff" fillOpacity="0.12" />
      <circle cx="176" cy="40" r="7" fill="#ffffff" fillOpacity="0.12" />
      <circle cx="270" cy="70" r="8" fill="#fcd34d" />
      <circle cx="270" cy="70" r="3.2" fill="#4338ca" />
    </svg>
  );
}

export function AppShell({
  children,
  title,
  subtitle,
  back,
  headerRight,
  width = "md",
  tabBar = true,
}: {
  children: React.ReactNode;
  /** Page title, shown as the h1 in the band. Omit when the content has its own h1. */
  title?: string;
  /** One friendly line under the title (e.g. the home greeting's prompt). */
  subtitle?: string;
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
      <div className="band-gradient relative flex flex-1 flex-col overflow-hidden">
        <TrackDecor />
        <header className={`relative mx-auto w-full ${max} px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-14 text-[var(--band-foreground)]`}>
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
            <div className="flex items-center gap-2">
              <Link
                href="/line-status"
                aria-label={h.alerts}
                className="press flex h-11 w-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <BellIcon />
              </Link>
              <Link
                href="/"
                aria-label={t.nav.brand}
                className="press flex min-h-11 items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
              >
                <Logo size={30} onDark wordmarkClassName="text-[17px] max-[380px]:hidden" />
              </Link>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-400 px-2.5 py-1 text-[11px] font-bold tracking-wide text-emerald-950 uppercase">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-950" />
                {h.live}
              </span>
              {headerRight}
              {authed === false && (
                <Link
                  href="/login"
                  className="press flex min-h-11 items-center rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t.nav.logIn}
                </Link>
              )}
            </div>
          </div>
          {back && (
            <Link
              href={back.href}
              className="press mt-2 -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm font-medium text-white/90 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M12 4 6 10l6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {back.label}
            </Link>
          )}
          {title && <h1 className="mt-4 text-2xl leading-tight font-bold text-balance">{title}</h1>}
          {subtitle && <p className="mt-1 text-sm text-white/90">{subtitle}</p>}
        </header>

        <div className="relative -mt-8 flex-1 rounded-t-[2rem] bg-background shadow-[0_-8px_24px_rgba(30,27,75,0.18)]">
          <div className={`mx-auto flex w-full ${max} flex-col gap-6 px-4 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]`}>
            {children}
          </div>
        </div>
      </div>
    </Shell>
  );
}
