export function Footer() {
  return (
    <footer className="mt-auto flex shrink-0 items-center justify-between gap-4 border-t border-[var(--nav-border)] bg-[var(--nav-bg)] px-4 py-3 text-xs text-[var(--nav-fg-muted)] md:px-6">
      <span>JomKomute</span>
      <a
        href="https://jomid.taufikhamid.com"
        target="_blank"
        rel="noopener noreferrer"
        className="underline-offset-4 transition-colors hover:text-[var(--nav-fg)] hover:underline"
      >
        Jom ID
      </a>
    </footer>
  );
}
