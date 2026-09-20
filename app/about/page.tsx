// A plain server component (no "use client") so it can export its own
// per-route metadata — app/about/about-content.tsx holds the actual
// page body and stays a client component (it reads the locale from
// localStorage via useDictionary, so it has to be). This is the one
// page worth a dedicated <title>/description over the root layout's
// defaults (app/layout.tsx): it's the explainer someone lands on from a
// search result or a link, not an in-app screen.

import type { Metadata } from "next";
import { AboutContent } from "./about-content";

export const metadata: Metadata = {
  title: "About",
  description:
    "JomKomute is two things working together: riders report delays, accidents, breakdowns, and crowding on a live map as they happen — Waze-style, for public transit — and you save your commute so those reports and a real schedule reach you when it matters.",
  alternates: { canonical: "/about" },
  openGraph: {
    url: "/about",
    title: "About JomKomute",
    description:
      "Riders report delays, accidents, breakdowns, and crowding on a live map, Waze-style, for KTM/LRT/MRT — save your commute and get that reach you when it matters.",
  },
};

// SoftwareApplication structured data — the standard schema.org shape
// for "what is this app, what does it do, is it free" that search
// engines and AI assistants parse to answer questions like "what's
// JomKomute" without having to read/interpret the page's prose. Kept
// here (not in the client content file) since it's page metadata, not
// UI.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "JomKomute",
  applicationCategory: "TravelApplication",
  operatingSystem: "Any (web)",
  url: "https://jomkomute.vercel.app",
  description:
    "Save your usual KTM/LRT/MRT commute, see how crowded it typically gets, and get live rider-reported delays, accidents, and breakdowns on your line — Waze-style crowdsourced reporting for Klang Valley rail transit.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "MYR",
  },
  areaServed: {
    "@type": "Place",
    name: "Klang Valley, Malaysia",
  },
};

export default function AboutPage() {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger -- trusted, locally-defined JSON, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      <AboutContent />
    </>
  );
}
