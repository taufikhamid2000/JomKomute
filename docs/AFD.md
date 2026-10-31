# JomKomute — App Flow (AFD)

> Drafted from the codebase routes and components.

## Route map
- **Public:** `/login`, `/signup`, `/api-docs`
- **Behind the auth gate:** `/` (home map), `/today`, `/new`, `/route`, `/routes`, `/report`, `/line-status`, `/settings`, `/about`
- **API:** `/api/pings/counts`, `/api/pings/hourly`, `/api/pings/[pingKey]`, `/api/line-history`, `/api/push/{subscribe,unsubscribe,check}`
- **Redirects:** `/dashboard` to `/`, `/operating-hours` to `/line-status`

Nav (`components/shell.tsx`): Today, My routes, Line status, Settings, About.

## Flow 1 — Entry
```
Any page, no session ──► AuthGate ──► /login
Login ──► Supabase sign-in ──► home
Sign up ──► home
Try the demo ──► anonymous sign-in ──► home
Already signed in via Jom ID ──► skips login
```

## Flow 2 — Plan a route
```
Home "Where to?" sheet (or Home/Work) ──► pick destination ──► route-finder (fewest transfers, GTFS)
 ──► route detail / backup route ──► optionally save as a route
```

## Flow 3 — Save and manage a commute
```
/new ──► station, line, departure time, days ──► saved to localStorage
/routes ──► list, crowd forecast bars ──► /route detail
Exceptions: skip a day, recurring WFH day, nearby event ("Change plan")
```
Saved routes are not stored on the server.

## Flow 3b — Today's verdict
```
Home sheet "Today's verdict" / nav "Today" ──► /today ──► defaults to the next saved commute (chips to pick another)
   route-finder alternatives (up to 3) × rider reports per line (lib/verdict.ts)
   usual route clear or only crowded ──► "Go as usual" (crowded: tip a clean alternative)
   usual route delayed/breakdown/accident, another route clear ──► "Take <line> instead"
   every route disrupted ──► "Consider working from home" (one tap applies the WFH skip to every saved route that day)
```

## Flow 4 — Report an issue
```
Home FAB / report page ──► report modal
   choose category (delay | accident | breakdown | crowded | other) + optional note (<=280 chars)
   location: current GPS, or pick/tap a station (can be remote)
   route-scoped report also records the line
 ──► insert into jomkomute.user_reports ──► marker on map (nearby same-category reports cluster)
Owner can delete their own report (owner secret)
```

## Flow 5 — Vote on a report
Open report ──► "still happening?" confirm / dispute ──► one vote per (report, voter). When disputes minus confirms reaches 3 the report drops from the visible view. Reports expire after 24 hours.

## Flow 6 — Line status and alerts
`/line-status` ──► first/last train per line, status "normal service" or "N reports of X in the last 24h", expand to stations and reports, history chart ──► follow a line ──► "Notify me" subscribes to Web Push.
Daily cron `/api/push/check` pushes on normal/reported transitions to followers; an in-app fallback covers the gaps.

## Flow 7 — Settings
Theme, accent colour, language (en/ms).

## Error handling
`TODO: confirm` (no `error.tsx` found in `app/`). Toasts via `components/toast-provider.tsx`.
