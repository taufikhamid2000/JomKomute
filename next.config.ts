import type { NextConfig } from "next";

// Two deployment targets now share this config:
//   - GitHub Pages (static export, no server) — the original setup.
//     Nothing there can depend on cookies(), headers(), Server Actions,
//     or API routes, so the GH Pages workflow sets STATIC_EXPORT=true to
//     opt into `output: "export"` and the /JomKomute basePath it needs.
//   - Vercel (real server) — added so app/api/pings/* (the first real
//     backend slice, see server/schema.sql) can run. Vercel does not set
//     STATIC_EXPORT, so it gets the default server build with API routes
//     intact and no basePath (it serves from its own domain root).
// Keeping both means a push to main still updates GitHub Pages exactly
// as before, in parallel with the new Vercel deployment.
const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(isStaticExport
    ? {
        output: "export" as const,
        basePath: "/JomKomute",
        assetPrefix: "/JomKomute",
        trailingSlash: true,
      }
    : {}),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
