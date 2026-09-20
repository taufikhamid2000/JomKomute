import type { MetadataRoute } from "next";

// Served at /robots.txt. Everything here is either a personal-account
// page (login/signup) or a form with no content to index (new route) —
// disallow those specifically rather than the whole site, so the
// explainer/live-data pages (/, /about, /operating-hours, /report,
// /routes) stay crawlable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/login", "/signup", "/new"],
    },
    sitemap: "https://jomkomute.vercel.app/sitemap.xml",
  };
}
