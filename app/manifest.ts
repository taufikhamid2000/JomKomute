import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest — lets a phone browser "Add to Home
// Screen" JomKomute like a standalone app, and gives search engines /
// AI crawlers a machine-readable name+description alongside the HTML
// <meta> tags in app/layout.tsx. Colors match app/globals.css's
// `--primary` and `--background` (light theme) custom properties.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JomKomute — Klang Valley rail commute companion",
    short_name: "JomKomute",
    description:
      "Save your usual KTM/LRT/MRT commute, see how crowded it typically gets, and get live rider-reported delays, accidents, and breakdowns on your line.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e40af",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
