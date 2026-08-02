import type { Metadata } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "JomKomute",
    template: "%s · JomKomute",
  },
  description: "Save your usual LRT/MRT commute and see how crowded it typically gets.",
};

// Runs before paint, so an explicit theme pick applies immediately instead
// of flashing the OS-default theme first — the static HTML has no
// data-theme baked in (nothing server-side to read localStorage from), so
// this is what stands in for that. Inlined rather than imported from
// lib/theme.ts since it must be a same-document <script>, not a module;
// the storage key ("jomkomute.theme") must stay in sync with THEME_STORAGE_KEY there.
const NO_FLASH_THEME_SCRIPT = `
  try {
    var t = localStorage.getItem("jomkomute.theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // The no-flash script below intentionally sets data-theme on this
      // element before hydration, which would otherwise log a (harmless,
      // expected) hydration-mismatch warning — this only suppresses that
      // mismatch check for html's own attributes, not the rest of the tree.
      suppressHydrationWarning
      className={`${firaSans.variable} ${firaCode.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
