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

`lib/stations.ts` is generated, not hand-written — it comes from RapidKL's
official GTFS static feed (data.gov.my, category `rapid-rail-kl`), covering
LRT, MRT, KL Monorail, and BRT Sunway with real station order per line.
Regenerate it if the source data changes:

```bash
node scripts/generate-stations.mjs
```

## Deploy

Static-exported (`output: "export"` in `next.config.ts`). The workflow in
`.github/workflows/deploy.yml` builds on every push to `main` and pushes
the output to the `gh-pages` branch; GitHub Pages (Settings → Pages →
Source → **Deploy from a branch** → `gh-pages`, `/root`) just serves
whatever's there.
