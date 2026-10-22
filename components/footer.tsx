// Vercel sets VERCEL_GIT_COMMIT_SHA automatically at build time (read
// server-side only). Off Vercel, a deploy script may set GIT_COMMIT_SHA;
// otherwise this falls back to "dev".
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA;
const version = commitSha ? commitSha.slice(0, 7) : "dev";
const commitUrl = commitSha
  ? `https://github.com/taufikhamid2000/JomKomute/commit/${commitSha}`
  : null;

export function Footer() {
  return (
    <footer className="border-t border-[var(--nav-border)] bg-[var(--nav-bg)] px-6 py-4">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <span className="text-xs text-[var(--nav-fg-muted)]">JomKomute</span>
        <div className="flex items-center gap-3">
          {commitUrl ? (
            <a
              href={commitUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-[var(--nav-fg-muted)] underline-offset-4 transition-colors hover:text-[var(--nav-fg)] hover:underline"
            >
              {version}
            </a>
          ) : (
            <span className="font-mono text-xs text-[var(--nav-fg-muted)]">{version}</span>
          )}
          <a
            href="https://jomid.taufikhamid.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--nav-fg-muted)] underline-offset-4 transition-colors hover:text-[var(--nav-fg)] hover:underline"
          >
            Jom ID
          </a>
        </div>
      </div>
    </footer>
  );
}
