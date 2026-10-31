// Plain server component so it can export this route's own metadata —
// app/today/today-content.tsx (client: localStorage-backed saved routes,
// client-side report fetch) holds the actual page.

import type { Metadata } from "next";
import { TodayContent } from "./today-content";

export const metadata: Metadata = {
  title: "Today's verdict",
  description: "One answer for your saved commute each morning: go as usual, switch lines, or work from home, based on live rider reports.",
  alternates: { canonical: "/today" },
};

export default function TodayPage() {
  return <TodayContent />;
}
