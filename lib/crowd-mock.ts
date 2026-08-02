// Illustrative only — same honesty as the About page's mock card (see
// app/about/page.tsx). There is no real aggregate "people planning this
// trip" signal; that needs a partner with real scale (see the About page).
// This exists so the dashboard can show what that feature would look like
// against your actual saved route, not a hardcoded example station.

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export type CrowdMock = { count: number; busier: boolean };

export function mockCrowdFor(routeId: string, dateIso: string): CrowdMock {
  const seed = hash(`${routeId}|${dateIso}`);
  const count = 60 + (seed % 220);
  return { count, busier: count > 150 };
}
