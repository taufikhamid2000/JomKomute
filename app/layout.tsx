import type { Metadata } from "next";
import { Fira_Sans, Fira_Code } from "next/font/google";
import { AuthGate } from "@/components/auth-gate";
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

const DESCRIPTION =
  "Save your usual KTM/LRT/MRT commute and see how crowded it typically gets — plus live rider-reported delays, accidents, breakdowns, and crowding, Waze-style, for Klang Valley rail.";

// metadataBase resolves every relative URL below (openGraph.images,
// sitemap.ts/opengraph-image.tsx's own og:image, etc.) against the live
// deployment (see README.md's Deploy section) rather than whatever host
// a preview/local build happens to run on.
export const metadata: Metadata = {
  metadataBase: new URL("https://jomkomute.vercel.app"),
  title: {
    default: "JomKomute — Klang Valley rail commute companion",
    template: "%s · JomKomute",
  },
  description: DESCRIPTION,
  applicationName: "JomKomute",
  keywords: [
    "JomKomute",
    "KTM Komuter",
    "LRT Klang Valley",
    "MRT Kuala Lumpur",
    "Rapid Rail",
    "Kuala Lumpur commute",
    "train crowding",
    "rail delay reports",
    "Malaysia public transit",
  ],
  authors: [{ name: "taufikhamid2000", url: "https://github.com/taufikhamid2000" }],
  category: "travel",
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_MY",
    url: "/",
    siteName: "JomKomute",
    title: "JomKomute — Klang Valley rail commute companion",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "JomKomute — Klang Valley rail commute companion",
    description: DESCRIPTION,
  },
  icons: {
    icon: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

// Runs before paint, so an explicit theme/accent pick applies immediately
// instead of flashing the default first — the static HTML has no
// data-theme/data-accent baked in (nothing server-side to read
// localStorage from), so this is what stands in for that. Inlined rather
// than imported from lib/theme.ts + lib/accent.ts since it must be a
// same-document <script>, not a module; the storage keys must stay in
// sync with THEME_STORAGE_KEY / ACCENT_STORAGE_KEY / ACCENT_CUSTOM_*_KEY there.
const NO_FLASH_THEME_SCRIPT = `
  try {
    var t = localStorage.getItem("jomkomute.theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
    var a = localStorage.getItem("jomkomute.accent");
    if (a && a !== "default") {
      document.documentElement.setAttribute("data-accent", a);
    }
    if (a === "custom") {
      var bg = localStorage.getItem("jomkomute.accentCustomBg");
      var fg = localStorage.getItem("jomkomute.accentCustomFg");
      if (bg) document.documentElement.style.setProperty("--nav-bg", bg);
      if (fg) document.documentElement.style.setProperty("--nav-fg", fg);
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
      <body className="min-h-full flex flex-col">
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
