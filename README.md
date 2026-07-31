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

## Deploy

Static-exported (`output: "export"` in `next.config.ts`) and deployed to
GitHub Pages via `.github/workflows/deploy.yml` on every push to `main`.
First-time setup: in the repo's Settings → Pages, set **Source** to
**GitHub Actions**.
