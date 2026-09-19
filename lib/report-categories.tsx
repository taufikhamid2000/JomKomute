// Shared category metadata for app/report/page.tsx — one source of
// truth for the icon picker and the map markers, same "hand-rolled
// inline SVG, no icon library" convention as app/issues/page.tsx's
// XIcon/ThreadsIcon. Colors are plain hex (not CSS vars) because these
// also get baked into Leaflet divIcon HTML strings, which render
// outside React and don't participate in the app's dark-mode var
// cascade — each color is chosen to read clearly on both light and dark
// map tiles instead.

import type { ReportCategory } from "@/lib/user-reports-client";

export type ReportCategoryMeta = {
  id: ReportCategory;
  label: string;
  color: string;
  icon: React.ReactNode;
  // Same glyph as `icon`, serialized to a standalone SVG string for use
  // inside a Leaflet divIcon (which renders as raw HTML, not React).
  svg: string;
};

function delaySvg(color: string) {
  return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8" stroke="${color}" stroke-width="1.6"/><path d="M10 5.5V10l3 2" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function accidentSvg(color: string) {
  return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 2.5 18 17H2L10 2.5Z" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4" stroke="${color}" stroke-width="1.6" stroke-linecap="round"/><circle cx="10" cy="14.3" r="0.9" fill="${color}"/></svg>`;
}

function breakdownSvg(color: string) {
  return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 13.5h12M5.5 13.5V11a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2.5" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="15" r="1.3" stroke="${color}" stroke-width="1.4"/><circle cx="13.5" cy="15" r="1.3" stroke="${color}" stroke-width="1.4"/><path d="M8 9 9.3 6h2.4l2 3" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function crowdedSvg(color: string) {
  return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6.5" cy="6.5" r="2" stroke="${color}" stroke-width="1.5"/><circle cx="13.5" cy="6.5" r="2" stroke="${color}" stroke-width="1.5"/><path d="M2.5 16c.4-3 2-4.5 4-4.5s3.6 1.5 4 4.5M9.5 16c.4-3 2-4.5 4-4.5s3.6 1.5 4 4.5" stroke="${color}" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}

function otherSvg(color: string) {
  return `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="8" stroke="${color}" stroke-width="1.6"/><path d="M10 14v.01M10 11c0-1.8 2-1.6 2-3.4A2 2 0 0 0 10 5.7a2 2 0 0 0-2 1.9" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const BUILDERS: Record<ReportCategory, (color: string) => string> = {
  delay: delaySvg,
  accident: accidentSvg,
  breakdown: breakdownSvg,
  crowded: crowdedSvg,
  other: otherSvg,
};

const COLORS: Record<ReportCategory, string> = {
  delay: "#d97706",
  accident: "#dc2626",
  breakdown: "#7c3aed",
  crowded: "#2563eb",
  other: "#475569",
};

export const REPORT_CATEGORY_IDS: ReportCategory[] = ["delay", "accident", "breakdown", "crowded", "other"];

export function reportCategoryMeta(labels: Record<ReportCategory, string>): ReportCategoryMeta[] {
  return REPORT_CATEGORY_IDS.map((id) => {
    const color = COLORS[id];
    const svg = BUILDERS[id](color);
    return {
      id,
      label: labels[id],
      color,
      // eslint-disable-next-line react/no-danger -- same trusted, locally-defined SVG string used for the map marker
      icon: <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />,
      svg,
    };
  });
}

// Wraps a category's svg string in the pin-shaped marker background used
// on the map (see components/report-map.tsx's divIcon) — kept here so
// the marker and the picker button never drift out of sync visually.
export function reportMarkerHtml(color: string, svg: string): string {
  return `<div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:${color};box-shadow:0 1px 4px rgba(0,0,0,0.35);border:2px solid white;">${svg.replace(
    /stroke="[^"]*"/g,
    'stroke="white"',
  ).replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="white"')}</div>`;
}
