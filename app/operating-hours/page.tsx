// Plain server component so it can export this route's own metadata —
// app/operating-hours/operating-hours-content.tsx (client: localStorage
// via useDictionary, client-side data fetches) holds the actual page.

import type { Metadata } from "next";
import { OperatingHoursContent } from "./operating-hours-content";

export const metadata: Metadata = {
  title: "Line status",
  description:
    "First and last train times for every KTM/LRT/MRT line from official GTFS timetables, plus live crowdsourced status reports.",
  alternates: { canonical: "/operating-hours" },
  openGraph: {
    url: "/operating-hours",
    title: "Line status · JomKomute",
    description: "First/last train times and live status for every Klang Valley rail line.",
  },
};

export default function OperatingHoursPage() {
  return <OperatingHoursContent />;
}
