import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // /dashboard was folded into the Home screen (app/page.tsx) — its "next
  // trip" card is now shown there when a Home/Work/recent route is active.
  // Redirect any bookmarked/external links rather than 404ing. This app is
  // a normal Vercel-hosted Next.js app (not a static export — see the
  // removed GitHub Pages deployment), so a server-side redirect works here.
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
