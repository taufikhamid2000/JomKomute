# JomKomute — Product Requirements (PRD)

> Drafted from the codebase. Items marked `TODO: confirm` are inferred or unknown and need the owner's input.

## Summary
JomKomute is a Waze-style companion for KTM Komuter, LRT, MRT, KL Monorail and BRT Sunway riders in the Klang Valley: save your commute, see typical crowding, and see live rider-reported delays, accidents, breakdowns and crowding on a map. Live at https://jomkomute.taufikhamid.com. Part of the Jom app suite (shared login via Jom ID).

## Problem
Transit apps show schedules but not what is happening right now or how crowded a trip usually is. Riders have no shared, crowdsourced channel for disruptions the way drivers have Waze. `TODO: confirm` problem statement wording.

## Target users
- Daily rail commuters in the Klang Valley. `TODO: confirm primary persona`
- Current stage: prototype. Saved routes live in the browser (`localStorage`); the crowding forecast is a placeholder model, not real ridership data (README).

## Goals
1. Map-first home: where to, Home/Work shortcuts, one-tap issue report.
2. Live conditions from riders: report, confirm/dispute, auto-hide disputed reports.
3. Line status: first/last train from GTFS plus crowdsourced "normal / N reports" per line, with followable lines and push alerts.
4. Plan a route with fewest transfers across all lines.
5. Save a commute and see its typical crowding, with exceptions (skip day, WFH, nearby event).

## Non-goals (current)
- Real-time train positions or official operator disruption data. Reports are rider-perceived and unverified (`app/api/line-history/route.ts`).
- Real ridership data. `TODO: confirm` whether planned.
- Paid plans. `TODO: confirm`

## Features (shipped)
| Area | Description | Route |
|---|---|---|
| Home | Full-screen map, "Where to?" sheet, Home/Work quick access, report button | `/` |
| Report issues | Report delay / accident / breakdown / crowded / other from location or a picked station; vote "still happening?"; clustered markers | `/report`, report modal |
| Line status | First/last train per line, live crowdsourced status, followable lines, history chart, push "Notify me" | `/line-status` |
| Route planning | Fewest-transfer routing, same-line backup route | `/new`, `/route` |
| My routes | Saved commutes, crowd forecast, exceptions | `/routes`, `/route` |
| Settings | Appearance (theme, accent), language | `/settings` |
| Public | About (SEO/JSON-LD), login, signup, API docs | `/about`, `/login`, `/signup`, `/api-docs` |
| API | Planned-trip ping counts, line history, push subscribe | `/api/pings/*`, `/api/line-history`, `/api/push/*` |
| PWA | Web manifest, service worker for push | `app/manifest.ts`, `public/sw.js` |

## Key requirements
- **Bilingual:** English and Malay (`lib/dictionaries`).
- **Station data from official GTFS** (data.gov.my), generated, not hand-edited.
- **Anonymous-friendly reporting:** reports and votes work without an account; own reports deletable via a secret.
- **Jom ID:** session shared across `*.taufikhamid.com`; the app gates pages behind a session (real or anonymous demo).

## Success metrics
`TODO: confirm` (suggested: active reporters, reports per day, followed lines, saved routes).

## Open questions
- Replace the placeholder crowding model with real data? `TODO: confirm`
- Move saved routes from `localStorage` to the backend? `TODO: confirm`
- Moderation/abuse handling for anonymous reports? `TODO: confirm`
