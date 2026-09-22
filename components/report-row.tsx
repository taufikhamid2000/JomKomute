"use client";

// One report's detail row: category icon/label/note/time, a "Still
// happening?" Yes/No vote (or this device's own past vote), and — only
// for a report this device made itself (lib/user-reports-client.ts's
// isOwnReport) — a delete button for undoing an accidental report.
// Shared by components/report-map.tsx's cluster popups,
// components/station-popup.tsx's nearby-reports list, and
// app/line-status/line-status-content.tsx's per-station
// breakdown, so all three read/behave the same way instead of each
// re-implementing their own version of "is this still happening" and
// "how do I undo this".

import { useState } from "react";
import type { en } from "@/lib/dictionaries/en";
import type { ReportCategoryMeta } from "@/lib/report-categories";
import {
  deleteOwnReport,
  getMyVoteFor,
  isOwnReport,
  ReportSubmitError,
  submitReportVote,
  type ReportVote,
  type UserReport,
} from "@/lib/user-reports-client";

type ReportPageDictionary = (typeof en)["reportPage"];

function actionErrorMessage(err: unknown, t: ReportPageDictionary, fallback: string): string {
  if (err instanceof ReportSubmitError) {
    if (err.reason === "offline") return t.errorOffline;
    const detail = err.message ? ` (${err.message})` : "";
    return `${err.reason === "server" ? t.errorServer : fallback}${detail}`;
  }
  return fallback;
}

export function ReportRow({
  report,
  meta,
  t,
  onVoted,
  onDeleted,
}: {
  report: UserReport;
  // Category icon/label/color — omit to skip the per-row category
  // header, for a context that already labels the category once for a
  // whole group (components/report-map.tsx's same-category clusters).
  meta?: ReportCategoryMeta;
  t: ReportPageDictionary;
  // Re-fetch hooks — a dispute vote or a delete can both change what's
  // actually visible (see jomkomute.user_reports_visible), so callers
  // refresh their own report list live instead of waiting for the next
  // unrelated refresh.
  onVoted?: () => void;
  onDeleted?: () => void;
}) {
  const [vote, setVote] = useState<ReportVote | null>(() => getMyVoteFor(report.id));
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const own = isOwnReport(report.id);

  async function handleVote(next: ReportVote) {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await submitReportVote(report.id, next);
      setVote(next);
      onVoted?.();
    } catch (err) {
      setErrorMessage(actionErrorMessage(err, t, t.voteError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setErrorMessage(null);
    try {
      await deleteOwnReport(report.id);
      onDeleted?.();
    } catch (err) {
      setErrorMessage(actionErrorMessage(err, t, t.deleteError));
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-t border-border pt-1.5 first:border-t-0 first:pt-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 items-start gap-2">
          {meta && (
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: meta.color, color: "white" }}
            >
              {meta.icon}
            </span>
          )}
          <div className="flex flex-1 flex-col">
            {meta && <span className="text-xs font-medium text-foreground">{meta.label}</span>}
            {report.note && <span className="text-xs text-foreground/60">{report.note}</span>}
            <span className="text-xs text-foreground/40">
              {new Date(report.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
        {own && (
          <button
            type="button"
            disabled={deleting}
            onClick={handleDelete}
            aria-label={t.deleteReport}
            title={t.deleteReport}
            className="shrink-0 cursor-pointer rounded p-1 text-foreground/40 hover:bg-[var(--nav-hover-bg)] hover:text-[var(--destructive)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 6h10M8 6V4.5A1 1 0 0 1 9 3.5h2a1 1 0 0 1 1 1V6M6 6l.6 9.6a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L14 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {vote ? (
          <span className="text-xs text-foreground/50">{vote === "confirm" ? t.youConfirmed : t.youDisputed}</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-foreground/50">{t.stillHappening}</span>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleVote("confirm")}
              className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-[var(--nav-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.confirmVote}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleVote("dispute")}
              className="cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-[var(--nav-hover-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.disputeVote}
            </button>
          </div>
        )}
      </div>

      {errorMessage && <span className="text-xs text-[var(--destructive)]">{errorMessage}</span>}
    </div>
  );
}
