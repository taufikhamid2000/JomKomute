// Plain server component so it can export this route's own metadata —
// app/line-status/line-status-content.tsx (client: localStorage via
// useDictionary, client-side data fetches) holds the actual page. Was
// /operating-hours — renamed since it now also holds live crowdsourced
// status, followed lines, and a per-station report breakdown, not just
// first/last train times (see next.config.ts's redirect for the old
// path, and lib/dictionaries/*'s nav.operatingHours label, itself
// already "Line status" and not renamed here to keep both changes
// separable).

import type { Metadata } from "next";
import { LineStatusContent } from "./line-status-content";

export const metadata: Metadata = {
  title: "Line status",
  description:
    "Live crowdsourced status, first and last train times for every KTM/LRT/MRT line from official GTFS timetables, and a per-station report breakdown.",
  alternates: { canonical: "/line-status" },
  openGraph: {
    url: "/line-status",
    title: "Line status · JomKomute",
    description: "First/last train times and live status for every Klang Valley rail line.",
  },
};

export default function LineStatusPage() {
  return <LineStatusContent />;
}
