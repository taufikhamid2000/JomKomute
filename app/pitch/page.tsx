// The MyRapid PULSE pitch, rendered from docs/PITCH.md at build time so the
// doc stays the single source of truth. Public (see components/auth-gate.tsx's
// PUBLIC_PATHS) so it can be shared with people who'll never sign in.
// Linked from the top of /about.

import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { Markdown } from "./markdown";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Pitch: JomKomute",
  description:
    "A commute-companion layer for MyRapid PULSE: save your usual trip once and get one answer each morning: go, leave early, switch line, or stay home.",
  alternates: { canonical: "/pitch" },
  openGraph: {
    url: "/pitch",
    title: "JomKomute: A Commute Companion Pitch",
    description: "Should I take MRT Maluri, LRT Maluri, or work from home today? A pitch for answering that inside PULSE.",
  },
};

export default function PitchPage() {
  const source = readFileSync(path.join(process.cwd(), "docs", "PITCH.md"), "utf8");
  return (
    <AppShell width="reading">
      <article className="animate-page-in flex w-full flex-col gap-4">
        <Markdown source={source} />
      </article>
    </AppShell>
  );
}
