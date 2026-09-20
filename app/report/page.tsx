// Plain server component so it can export this route's own metadata —
// app/report/report-content.tsx (client: useSearchParams, localStorage
// via useDictionary) holds the actual page.

import type { Metadata } from "next";
import { ReportContent } from "./report-content";

export const metadata: Metadata = {
  title: "Live reports",
  description:
    "Browse delays, accidents, breakdowns, and crowding reported by other riders in the last 24 hours on KTM/LRT/MRT, and vote on whether they're still happening.",
  alternates: { canonical: "/report" },
  openGraph: {
    url: "/report",
    title: "Live reports · JomKomute",
    description: "See what other riders have reported on KTM/LRT/MRT in the last 24 hours, updated live.",
  },
};

export default function ReportPage() {
  return <ReportContent />;
}
