import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Jom ID: expose the Vercel env to the browser bundle so the shared
  // .taufikhamid.com cookie is only used in production
  // (see lib/supabase/cookie-options.ts).
  env: {
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? "",
  },
  images: {
    unoptimized: true,
  },
  // Baseline security headers for every route. Deliberately NOT set:
  //  - a full Content-Security-Policy: the app uses inline scripts/styles,
  //    map tiles, Supabase and web push, and a CSP can't be validated
  //    safely without a browser test pass, so only frame-ancestors is set.
  //  - Permissions-Policy: geolocation (maps) and web push must keep working.
  // No page is meant to be embedded in an iframe by another site.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
  // /dashboard was folded into the Home screen (app/page.tsx) — its "next
  // trip" card is now shown there when a Home/Work/recent route is active.
  // Redirect any bookmarked/external links rather than 404ing. This app is
  // a normal Vercel-hosted Next.js app (not a static export — see the
  // removed GitHub Pages deployment), so a server-side redirect works here.
  async redirects() {
    return [
      // Old *.vercel.app address -> the custom domain.
      {
        source: "/:path*",
        has: [{ type: "host", value: "jomkomute.vercel.app" }],
        destination: "https://jomkomute.taufikhamid.com/:path*",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/",
        permanent: true,
      },
      // Renamed once the page grew past just first/last train times
      // (live crowdsourced status, followed lines, per-station report
      // breakdown) — redirect any bookmarked/external links.
      {
        source: "/operating-hours",
        destination: "/line-status",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
