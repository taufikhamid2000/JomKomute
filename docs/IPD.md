# JomKomute — Implementation Plan (IPD)

> A living roadmap. Update it when work ships or priorities change. Status is inferred from the repo; `TODO: confirm` priorities with the owner.

## Status: prototype, live on Vercel

## Done
- [x] Map-first home with report button, Home/Work quick access
- [x] GTFS-generated stations and lines, fewest-transfer route finder, backup route
- [x] Saved routes and exceptions (localStorage), placeholder crowd forecast
- [x] Crowdsourced reports: categories, station/GPS location, voting, auto-hide, clustering, delete own
- [x] Line status page, first/last train, history chart, followable lines
- [x] Web Push with daily cron, in-app fallback
- [x] Planned-trip ping API
- [x] Jom ID shared session, demo login, EN/MS dictionaries, themes
- [x] SEO: About + JSON-LD, robots, sitemap, manifest, OG image
- [x] Migrations CI (changed files only), column-level grants
- [x] Docs (PRD, TRD, AFD, DBD, BSD, IPD)

## Next (suggested order) `TODO: confirm`
1. **Add tests** (none in repo) and a CI build/lint workflow.
2. **Capture the `planned_trip_pings` move** to the `jomkomute` schema in a migration.
3. **Refresh or remove stale `server/*` design stubs** (still mention static export).
4. **Real crowding data** to replace the placeholder forecast.
5. **Server-side saved routes** tied to the Jom ID account.
6. **More frequent push checks** (Vercel Pro or external scheduler).
7. **Report moderation / abuse controls.**
8. **Error boundaries** (`error.tsx`) and an accessibility audit.

## Backlog / ideas
`TODO: confirm`

## Definition of done
- `npm run build` passes (type check), `npm run lint` clean of new warnings.
- New UI strings added to both `en.ts` and `ms.ts`.
- Do not hand-edit generated `lib/stations.ts`; rerun the script.
- New tables: idempotent migration in the `jomkomute` schema, RLS/grants, no unnecessary anon access.
- Docs updated if the change makes them wrong.
- Commit straight to `main`.
