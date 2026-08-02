"use client";

import { useEffect } from "react";
import { addExceptionRecord } from "@/lib/store";
import type { SavedRoute, SkipReason } from "@/lib/types";
import { useDictionary } from "@/lib/use-dictionary";

// Applies to every saved route on `date`, not just the one shown on the
// dashboard — being on leave, WFH, or driving replaces the whole day's
// commute both ways, so the return-trip route (a separate SavedRoute,
// not linked to this one) needs the same skip or it'd keep showing up.
export function ChangePlanModal({
  date,
  routes,
  onClose,
}: {
  date: string;
  routes: SavedRoute[];
  onClose: () => void;
}) {
  const { t } = useDictionary();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function applyReason(reason: SkipReason) {
    for (const route of routes) {
      addExceptionRecord({ routeId: route.id, type: "skip", date, reason });
    }
    onClose();
  }

  const options: { reason: SkipReason; label: string }[] = [
    { reason: "leave", label: t.changePlanModal.onLeave },
    { reason: "wfh", label: t.changePlanModal.wfh },
    { reason: "drive", label: t.changePlanModal.drive },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.changePlanModal.title}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold text-foreground">{t.changePlanModal.title}</h2>
        <p className="mt-1 text-xs text-foreground/60">{t.changePlanModal.description}</p>

        <div className="mt-4 flex flex-col gap-2">
          {options.map((o) => (
            <button
              key={o.reason}
              type="button"
              onClick={() => applyReason(o.reason)}
              className="cursor-pointer rounded-lg border border-border px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
            >
              {o.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full cursor-pointer rounded-lg px-3 py-2 text-sm text-foreground/60 hover:text-foreground"
        >
          {t.changePlanModal.cancel}
        </button>
      </div>
    </div>
  );
}
