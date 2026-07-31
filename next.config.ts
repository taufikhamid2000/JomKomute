import type { NextConfig } from "next";

// Static export for GitHub Pages — no server at runtime, so nothing here
// can depend on cookies(), headers(), Server Actions, or API routes.
// basePath/assetPrefix match the project-repo URL shape GitHub Pages uses
// (https://<user>.github.io/jomkomute/); trailingSlash avoids any
// ambiguity between GH Pages serving `/new` as a file vs `/new/index.html`.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/jomkomute",
  assetPrefix: "/jomkomute",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
