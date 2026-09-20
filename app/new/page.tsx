// Plain server component so it can export this route's own metadata —
// app/new/new-route-content.tsx (client: form state, useDictionary)
// holds the actual page. Excluded from robots.txt/sitemap.ts (a form,
// nothing to index), but still worth a real <title> for the browser tab
// and bookmarks.

import type { Metadata } from "next";
import { NewRouteContent } from "./new-route-content";

export const metadata: Metadata = { title: "Add a route" };

export default function NewRoutePage() {
  return <NewRouteContent />;
}
