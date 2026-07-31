import Link from "next/link";

export function EmptyState() {
  return (
    <div className="animate-page-in flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="text-sm font-medium text-foreground">No saved routes yet</p>
      <p className="max-w-sm text-sm text-foreground/60">
        Save the commute you take regularly — station, line, and usual departure time — and JomKomute will show you
        how crowded it typically gets.
      </p>
      <Link
        href="/new"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        Add your first route
      </Link>
    </div>
  );
}
