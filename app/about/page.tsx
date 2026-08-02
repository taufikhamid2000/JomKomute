"use client";

import Link from "next/link";
import { CommuteDiagram } from "@/components/commute-diagram";
import { Shell } from "@/components/shell";
import { useDictionary } from "@/lib/use-dictionary";

// Small line icons echoing the diagram's own visual language (the
// detour icon reuses the same solid-arc-over/dashed-arc-under shape as
// the hero animation) rather than generic stock-icon shapes.
function DaysIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8H17" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 2.5V5.5M13 2.5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DetourIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 10H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7 10C7 10 8 5 10 5C12 5 13 10 13 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M7 10C7 10 8 15 10 15C12 15 13 10 13 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 2.5"
      />
    </svg>
  );
}

function FlexIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="14" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6V10L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AboutPage() {
  const { t } = useDictionary();

  const features = [
    { icon: <DaysIcon />, title: t.about.feature1Title, body: t.about.feature1Body },
    { icon: <DetourIcon />, title: t.about.feature2Title, body: t.about.feature2Body },
    { icon: <FlexIcon />, title: t.about.feature3Title, body: t.about.feature3Body },
    { icon: <ClockIcon />, title: t.about.feature4Title, body: t.about.feature4Body },
  ];

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-2xl flex-col gap-10 p-4 md:p-8">
        <section className="flex flex-col items-center gap-4 pt-4 text-center">
          <span className="text-xs font-semibold tracking-wide text-primary uppercase">{t.about.kicker}</span>
          <h1 className="text-2xl leading-tight font-semibold text-balance text-foreground sm:text-3xl">
            {t.about.headline}
          </h1>
          <p className="max-w-lg text-sm text-foreground/60">{t.about.subheadline}</p>
        </section>

        <div className="rounded-2xl border border-border bg-background p-6">
          <CommuteDiagram />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col gap-2 rounded-2xl border border-border p-4">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
              >
                {f.icon}
              </div>
              <h2 className="text-sm font-semibold text-foreground">{f.title}</h2>
              <p className="text-sm text-foreground/60">{f.body}</p>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-4 rounded-2xl border border-dashed border-border p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-xs font-semibold tracking-wide text-primary uppercase">{t.about.futureKicker}</span>
            <h2 className="text-lg leading-snug font-semibold text-balance text-foreground">{t.about.futureHeadline}</h2>
            <p className="max-w-md text-sm text-foreground/60">{t.about.futureBody}</p>
          </div>

          <div className="relative mx-auto w-full max-w-sm rounded-2xl border border-border bg-background p-5">
            <span
              className="absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
              style={{ backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
            >
              {t.about.futureBadge}
            </span>

            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">{t.about.futureStation}</span>
              <span className="text-xs text-foreground/60">{t.about.futureTime}</span>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ backgroundColor: "var(--primary)" }}
                />
                <span className="relative inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
              </span>
              <span className="text-3xl font-semibold text-foreground">{t.about.futureCount}</span>
              <span className="text-sm text-foreground/60">{t.about.futureCountLabel}</span>
            </div>

            <p
              className="mt-4 rounded-lg px-3 py-2 text-xs text-foreground"
              style={{ backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" }}
            >
              {t.about.futureSuggestion}
            </p>
          </div>
        </section>

        <Link
          href="/new"
          className="mx-auto w-fit rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t.about.cta}
        </Link>
      </div>
    </Shell>
  );
}
