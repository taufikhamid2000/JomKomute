"use client";

import Link from "next/link";
import { useDictionary } from "@/lib/use-dictionary";

// Small decorative rail-line scene shared by the empty states.
export function EmptyIllustration({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 80" fill="none" className={`h-20 w-40 ${className}`}>
      <circle cx="80" cy="40" r="34" fill="var(--indigo-fg)" fillOpacity="0.10" />
      <path
        d="M10 62 C40 62 50 22 80 22 S120 58 150 38"
        stroke="var(--indigo-fg)"
        strokeOpacity="0.55"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />
      <circle cx="28" cy="60" r="6" fill="var(--teal-fg)" />
      <circle cx="80" cy="22" r="6" fill="var(--amber-fg)" />
      <circle cx="136" cy="44" r="6" fill="var(--rose-fg)" />
      <circle cx="80" cy="22" r="2.4" fill="var(--amber-bg)" />
    </svg>
  );
}

export function EmptyState() {
  const { t } = useDictionary();

  return (
    <div className="animate-page-in flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-surface-tint p-10 text-center">
      <EmptyIllustration />
      <p className="text-base font-semibold text-foreground">{t.routesPage.emptyTitle}</p>
      <p className="max-w-sm text-sm text-foreground/70">{t.routesPage.emptyDescription}</p>
      <Link
        href="/new"
        className="press mt-2 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {t.routesPage.emptyCta}
      </Link>
    </div>
  );
}
