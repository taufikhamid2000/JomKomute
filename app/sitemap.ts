import type { MetadataRoute } from "next";

const BASE_URL = "https://jomkomute.vercel.app";

// Served at /sitemap.xml. Only the pages that are actually useful to
// land on from a search result or an AI agent browsing cold — leaves
// out /login, /signup (personal-account pages, matches robots.ts) and
// /route (a detail view reached via ?id=, never a destination on its
// own — see app/route/page.tsx's own comment on why it's not in the
// sidebar nav either).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/operating-hours`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/report`, lastModified: now, changeFrequency: "hourly", priority: 0.7 },
    { url: `${BASE_URL}/routes`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/settings`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
