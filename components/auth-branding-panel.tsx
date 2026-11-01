import Link from "next/link";
import { Logo } from "@/components/logo-mark";

// Split-screen branding panel shared by /login and /signup — see
// template/DESIGN.md's "Auth pages" section. Unlike the rest of the app,
// this panel's copy (including the signature footnote) is deliberately
// hardcoded English, not pulled from lib/dictionaries/* — the footnote
// text is a fixed cross-portfolio signature, not app copy to translate.
export function AuthBrandingPanel() {
  return (
    <div className="relative hidden w-[42%] shrink-0 flex-col justify-between overflow-hidden band-gradient px-10 py-12 text-[var(--band-foreground)] md:flex lg:w-[38%]">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />

      <Link href="/" aria-label="JomKomute" className="relative w-fit">
        <Logo size={40} onDark wordmarkClassName="text-2xl" />
      </Link>

      <div className="relative">
        <p className="text-2xl font-semibold leading-snug text-balance">
          Track your usual commute and know how crowded it&apos;ll be before you leave.
        </p>
        <ul className="mt-6 flex flex-col gap-3 text-sm text-white/90">
          {[
            "Save your regular LRT/MRT routes",
            "See typical crowding before you go",
            "Get a heads-up on service issues",
            "No account needed for the core features",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                <path
                  d="M3 8.5 6.5 12 13 4.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-white/90">
        Your daily commute, minus the surprises.{" "}
        <a
          href="https://taufikhamid.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline hover:text-white"
        >
          A project by Muhammad Taufik &rarr;
        </a>
      </p>
    </div>
  );
}
