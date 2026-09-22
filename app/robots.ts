import type { MetadataRoute } from "next";

// Served at /robots.txt. Everything here is either a personal-account
// page (login/signup), a form with no content to index (/new), or a
// detail view for one specific saved route that only exists in the
// visiting browser's own localStorage (/route?id=, see
// app/route/page.tsx) — disallow those specifically rather than the
// whole site, so the explainer/live-data pages (/, /about,
// /line-status, /report, /routes) stay crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/signup", "/new", "/route"],
    },
    sitemap: "https://jomkomute.vercel.app/sitemap.xml",
  };
}
