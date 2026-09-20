// Plain server component so it can export this route's own metadata —
// app/routes/routes-content.tsx (client: localStorage-backed saved
// routes via useSavedRoutes) holds the actual page.

import type { Metadata } from "next";
import { RoutesContent } from "./routes-content";

export const metadata: Metadata = {
  title: "Your routes",
  description: "Every commute you've saved, with a map overview of where each one goes.",
  alternates: { canonical: "/routes" },
};

export default function RoutesPage() {
  return <RoutesContent />;
}
