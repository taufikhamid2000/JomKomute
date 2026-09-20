// Plain server component so it can export this route's own metadata —
// app/route/route-detail-content.tsx (client: useSearchParams,
// localStorage-backed saved routes) holds the actual page. Excluded from
// robots.txt/sitemap.ts: it's a detail view for one specific saved route
// (?id=, only meaningful in the visiting browser's own localStorage),
// never a landing page worth indexing generically.

import type { Metadata } from "next";
import { RouteDetailContent } from "./route-detail-content";

export const metadata: Metadata = { title: "Route details" };

export default function RouteDetailPage() {
  return <RouteDetailContent />;
}
