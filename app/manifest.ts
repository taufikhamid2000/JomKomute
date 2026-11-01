import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest — lets a phone browser "Add to Home
// Screen" JomKomute like a standalone app, and gives search engines /
// AI crawlers a machine-readable name+description alongside the HTML
// <meta> tags in app/layout.tsx. Colors match app/globals.css's
// `--band-from` and `--background` (light theme) custom properties.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JomKomute — Klang Valley rail commute companion",
    short_name: "JomKomute",
    description:
      "Save your usual KTM/LRT/MRT commute, see how crowded it typically gets, and get live rider-reported delays, accidents, and breakdowns on your line.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#4338ca",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
