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
