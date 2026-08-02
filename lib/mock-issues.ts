// Illustrative only — see app/issues/page.tsx. There is no live feed yet;
// this is a mock of what ingesting RapidKL's own X/Threads posts about
// service disruptions could surface, so the idea is visible instead of
// living only in conversation. Real version would poll a known account
// via the official (now pay-per-read) X API and/or Threads API, not
// scrape — see the "why" comment in app/issues/page.tsx.

export type MockIssue = {
  id: string;
  lineId: string;
  source: "x" | "threads";
  minutesAgo: number;
  headline: string;
  quote: string;
};

export const MOCK_ISSUES: MockIssue[] = [
  {
    id: "1",
    lineId: "kelana-jaya",
    source: "x",
    minutesAgo: 6,
    headline: "Delays on the Kelana Jaya Line",
    quote: "Service disruption between Kelana Jaya and KLCC due to a trespasser incident. Trains are experiencing delays of up to 15 minutes.",
  },
  {
    id: "2",
    lineId: "kajang",
    source: "threads",
    minutesAgo: 22,
    headline: "Signal fault, Kajang Line",
    quote: "We are currently experiencing a signalling fault near Bandar Tun Razak. Passengers are advised to expect delays.",
  },
  {
    id: "3",
    lineId: "monorail",
    source: "x",
    minutesAgo: 41,
    headline: "Resolved: KL Monorail service restored",
    quote: "Service has resumed normal operations following earlier technical issues. Thank you for your patience.",
  },
];
