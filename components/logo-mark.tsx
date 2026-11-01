import { useId } from "react";

// JomKomute mark: a rounded badge holding a "J" drawn as a rail line that
// starts at an amber station and hooks round to a white one. Original
// artwork, not derived from any operator's branding. Keep in sync with
// app/icon.svg (the favicon) and app/pwa-icon/[size]/route.tsx.
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId();
  const gradient = `jk-bg-${id.replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={gradient} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="0.6" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gradient})`} />
      <path
        d="M38 15v20c0 8-4.6 12.5-11 12.5-4.6 0-8-2.2-9.8-5.8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="38" cy="15" r="6.4" fill="#fcd34d" />
      <circle cx="38" cy="15" r="2.6" fill="#4338ca" />
      <circle cx="17.2" cy="41.7" r="4.2" fill="#ffffff" stroke="#4338ca" strokeWidth="2.4" />
    </svg>
  );
}

// Two-tone wordmark: "Jom" + "Komute". `onDark` is for the gradient band and
// the auth panel (white + amber); otherwise it follows the theme tokens.
export function Wordmark({ onDark = false, className = "" }: { onDark?: boolean; className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>
      <span className={onDark ? "text-white" : "text-foreground"}>Jom</span>
      <span className={onDark ? "text-[var(--band-accent)]" : "text-[var(--brand-wordmark)]"}>Komute</span>
    </span>
  );
}

export function Logo({ size = 28, onDark = false, className = "", wordmarkClassName = "text-base" }: { size?: number; onDark?: boolean; className?: string; wordmarkClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      <Wordmark onDark={onDark} className={wordmarkClassName} />
    </span>
  );
}
