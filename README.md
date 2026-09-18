# JomKomute

Save your usual LRT/MRT commute (station, line, departure time, days) and
see how crowded it typically gets — plus mark exceptions like a skipped
day, a recurring WFH day, or a nearby event that'll add crowding.

Prototype stage: everything is stored in the browser (`localStorage`), and
the crowding forecast is a placeholder model, not real ridership data.
Design system carried over from [DuitDuit](https://github.com/taufikhamid2000/duitduit).

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

## Database migrations

`supabase/migrations/*.sql` apply automatically — `.github/workflows/supabase-migrations.yml`
runs `supabase db push` against the project on every push to `main` that
touches that directory, same idea as EF Core running pending migrations on
deploy. No manual step in the Supabase SQL editor. The workflow needs
three repo secrets set once (Settings > Secrets and variables > Actions):
`SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

## Deploy

Live at [jomkomute.vercel.app](https://jomkomute.vercel.app). Deploys
automatically on every push to `main` via Vercel's GitHub integration.

## Working on this repo

Solo project, no collaborators — agents should commit and push straight
to `main` rather than opening feature branches/PRs. `main` deploying
straight to production (see Deploy above) is the intended workflow here,
not a risk to route around.
