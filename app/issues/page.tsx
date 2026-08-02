"use client";

import { lineById } from "@/lib/lines";
import { MOCK_ISSUES } from "@/lib/mock-issues";
import { Shell } from "@/components/shell";
import { useDictionary } from "@/lib/use-dictionary";

// X and Threads marks, kept as plain strokes/fills so they sit quietly
// next to the line-color dot instead of competing with it.
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M15.3 2H18l-6 6.9L19 18h-5.6l-4.4-5.7L3.9 18H1.2l6.4-7.4L1 2h5.7l4 5.3L15.3 2Zm-1 14.4h1.5L6.8 3.5H5.2l9.1 12.9Z" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2C5.6 2 3 5 3 10s2.6 8 7 8c3.2 0 5.3-1.4 6.4-3.6M13.5 8.2c-.4-1-1.4-1.7-2.9-1.7-2 0-3.4 1.4-3.4 3.5s1.4 3.5 3.4 3.5c2.3 0 3.4-1.4 3.6-3.1.2-1.7-.6-3-2.2-3.3-1.8-.4-3.4.3-3.8 1.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function IssuesPage() {
  const { t } = useDictionary();

  return (
    <Shell>
      <div className="animate-page-in mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">{t.issuesPage.title}</h1>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase"
              style={{ backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)", color: "var(--destructive)" }}
            >
              {t.issuesPage.conceptBadge}
            </span>
          </div>
          <p className="max-w-lg text-sm text-foreground/60">{t.issuesPage.description}</p>
        </div>

        {MOCK_ISSUES.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground/50">
            {t.issuesPage.empty}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {MOCK_ISSUES.map((issue) => {
              const line = lineById(issue.lineId);
              return (
                <div key={issue.id} className="animate-row-in flex flex-col gap-2 rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: line?.color ?? "var(--foreground)" }}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-foreground">{line?.name ?? issue.lineId}</span>
                  </div>

                  <p className="text-sm font-medium text-foreground">{issue.headline}</p>
                  <p className="text-sm text-foreground/60">&ldquo;{issue.quote}&rdquo;</p>

                  <div className="mt-1 flex items-center gap-1.5 text-xs text-foreground/40">
                    {issue.source === "x" ? <XIcon /> : <ThreadsIcon />}
                    <span>{t.issuesPage.seenOn(issue.source === "x" ? "X" : "Threads")}</span>
                    <span aria-hidden="true">·</span>
                    <span>{t.issuesPage.minutesAgo(issue.minutesAgo)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
