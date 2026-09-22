# JomKomute

A Waze-style companion for KTM Komuter, LRT, MRT, and KL Monorail riders in
Malaysia's Klang Valley. Two things working together:

- **Save your commute** — station, line, departure time, days — and see how
  crowded it typically gets, plus mark exceptions like a skipped day, a
  recurring WFH day, or a nearby event that'll add crowding.
- **Live, rider-reported conditions** — delays, accidents, breakdowns, and
  crowding, reported and voted on by other riders on a live map, the same
  way Waze crowdsources road conditions for drivers.

Live at [jomkomute.vercel.app](https://jomkomute.vercel.app).

Prototype stage: saved routes live in the browser (`localStorage`, no
account needed), and the crowding forecast is a placeholder model, not real
ridership data. Design system carried over from
[DuitDuit](https://github.com/taufikhamid2000/duitduit).

## Features

- **Map-first home screen** — a full-screen map with a "Where to?" bottom
  sheet, Home/Work quick access, and a floating report button, closer to
  Waze's own layout than a typical transit-schedule app.
- **Route planning** — fewest-transfer routing across every line, backed by
  real GTFS timetables (see [Station data](#station-data)), with a
  same-line "backup route" alternative.
- **Crowdsourced issue reporting** — report a delay/accident/breakdown/
  crowding either from your current location or by picking (or tapping) a
  specific station, even one you're not standing at. Other riders can vote
  "still happening?" on existing reports, which pulls a report from view
  early if it's been disputed enough — see `supabase/migrations/*_jomkomute_user_report_votes.sql`.
  Nearby same-category reports cluster into one marker with a count badge
  instead of stacking icons (`lib/report-clusters.ts`).
  A route-scoped report also records which line it's on
  (`lib/route-corridor.ts`), so it can be queried exactly, not just by
  radius.
- **Line status** — first/last train times per line (from official GTFS
  static feeds) plus crowdsourced live status ("normal service" vs.
  "N reports of X in the last 24h", expandable to the affected stations
  and each station's individual reports), followable lines, and per-report
  vote/delete actions, at `/line-status` (was `/operating-hours` —
  `next.config.ts` redirects the old path).

## For contributors and AI agents navigating this repo cold

This is a normal Vercel-hosted Next.js App Router project (client-heavy —
most pages are `"use client"`), not a static export. Start here:

| Concept | Where |
|---|---|
| Home screen (map, bottom sheet, report FAB) | `app/page.tsx`, `components/home-map.tsx` |
| Report a new issue | `components/report-modal.tsx` (opened from the FAB — stations are also directly tappable on `HomeMap` itself, see its `pickableStations`/`onPickStation` props) |
| Browse & vote on existing reports | `app/report/page.tsx`, `components/report-map.tsx` |
| Report data model + client | `lib/user-reports-client.ts`, `supabase/migrations/2026091912*_jomkomute_user_reports*.sql` onward |
| Route-scoped reporting geometry | `lib/route-corridor.ts` (a route's own stations, corridor distance checks) |
| Route planning / fewest-transfer search | `lib/route-finder.ts` |
| Station/line data (generated) | `lib/stations.ts`, `lib/lines.ts` — see [Station data](#station-data), don't hand-edit `lib/stations.ts` |
| Line status / operating hours | `app/line-status/page.tsx`, `lib/operating-hours-client.ts`, `lib/line-status.ts`, `lib/followed-lines.ts` |
| Saved routes (localStorage) | `lib/store.ts`, `lib/types.ts`'s `SavedRoute` |
| i18n (English/Malay) | `lib/dictionaries/en.ts` / `ms.ts`, `lib/use-dictionary.ts` — every UI string lives here, not inline |
| Sidebar nav structure | `components/shell.tsx` |
| Site metadata / SEO | `app/layout.tsx` (root `Metadata`), `app/about/page.tsx` (per-page metadata + JSON-LD), `app/{robots,sitemap,manifest,opengraph-image}.ts` |

The `/about` page is the plain-language explainer of what this app does and
why — read it (or its structured data, `app/about/page.tsx`'s `JSON_LD`) for
a one-paragraph summary before diving into code.

## Develop

```bash
npm install
npm run dev
```

## Station data

`lib/stations.ts` is generated, not hand-written — it comes from two
official GTFS static feeds on data.gov.my: Prasarana (category
`rapid-rail-kl`, covering LRT, MRT, KL Monorail, and BRT Sunway) and KTMB
(filtered to just the two Klang Valley Komuter lines — the same feed also
bundles Intercity/ETS long-distance routes, which are dropped). Station
order and expected-arrival times both come from real GTFS scheduled
timetables, not estimates. A handful of real interchanges that don't share
an exact GTFS stop name (e.g. walkway-connected stations) are curated by
hand in `lib/lines.ts`'s `WALKWAY_LINKS`. Regenerate the station data if
either source changes:

```bash
node scripts/generate-stations.mjs
```

Line first/last train times (`/line-status`) come from the same GTFS
feeds via a separate script:

```bash
node scripts/generate-operating-hours.mjs
```

## Database migrations

`supabase/migrations/*.sql` apply automatically on every push to `main`
that touches that directory — same idea as EF Core running pending
migrations on deploy, no manual step in the Supabase SQL editor.

The actual migration-apply logic isn't defined here: this repo's
`.github/workflows/supabase-migrations.yml` is just a trigger that calls
[taufikhamid2000/template](https://github.com/taufikhamid2000/template)'s
shared `supabase-migrate.yml` reusable workflow, so every project with a
`supabase/migrations` directory (duitduit, jomkomute, …) runs the same
logic instead of each keeping its own copy. That workflow applies each
file with `supabase db query -f` rather than `supabase db push`, because
this project's Supabase project (`master_db`) is shared across repos
with separate migration histories that `db push`'s history
reconciliation would step on. Migrations here are written idempotent
(`create table/index if not exists`) so re-running every file on every
push is safe.

Needs two repo secrets set once (Settings > Secrets and variables >
Actions): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`.

## Deploy

Live at [jomkomute.vercel.app](https://jomkomute.vercel.app). Deploys
automatically on every push to `main` via Vercel's GitHub integration.

## Working on this repo

Solo project, no collaborators — agents should commit and push straight
to `main` rather than opening feature branches/PRs. `main` deploying
straight to production (see Deploy above) is the intended workflow here,
not a risk to route around.
