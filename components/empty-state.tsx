"use client";

import Link from "next/link";
import { useDictionary } from "@/lib/use-dictionary";

export function EmptyState() {
  const { t } = useDictionary();

  return (
    <div className="animate-page-in flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium text-foreground">{t.routesPage.emptyTitle}</p>
      <p className="max-w-sm text-sm text-foreground/60">{t.routesPage.emptyDescription}</p>
      <Link
        href="/new"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        {t.routesPage.emptyCta}
      </Link>
    </div>
  );
}
