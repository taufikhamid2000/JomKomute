// Inline SVG monogram — no icon-library dependency (see template/DESIGN.md's
// "Auth pages" section). Matches JomKomute's --primary token so it reads
// consistently wherever it's dropped (branding panel, mobile lockup).
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="15" fill="#1e40af" />
      <path
        d="M9 20.5 16 8l7 12.5M12 20.5h8"
        stroke="#f1f5f9"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
