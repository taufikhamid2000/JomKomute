# JomKomute — Design Brief (DBD)

> Drafted from the code. Visual intent beyond what the code shows is marked `TODO: confirm`.

## Product feel
Waze-like, map-first, community-driven; quick and glanceable for someone on a platform or in a carriage. `TODO: confirm tone words`

## Platforms
Responsive web, mobile-first, installable as a PWA (`app/manifest.ts`, standalone display). Desktop gets a sidebar (`components/shell.tsx`).

## Layout pattern
Home is a full-screen Leaflet map with a "Where to?" bottom sheet, Home/Work quick access and a floating report button. Other pages are content views inside the shell.

## Visual system
- Tailwind 4 with CSS variables (`app/globals.css`); light theme primary `#1e40af`, background white (manifest).
- Per-user accent colour (`lib/accent.ts`, `components/custom-accent-picker.tsx`) and theme (`lib/theme.ts`).
- Fonts: Fira Sans, Fira Code.
- Design system carried over from JomDuit (README).
- Report categories have distinct icons/colours (`lib/report-categories.tsx`); clustered markers show a count badge.
- Diagrams and charts: commute diagram, forecast bars, line history chart.

## Content and language
English and Malay, all copy in `lib/dictionaries`. Use rider vocabulary (KTM, LRT, MRT, Komuter, interchange).

## Accessibility
`TODO: confirm` target (suggested WCAG AA). Map-heavy UI needs a non-map path for reports and status (`/report` list, `/line-status`).

## Principles
1. Map first, few taps to report.
2. Say clearly that reports are rider-perceived, not official.
3. Anonymous use stays possible (demo, no-account reporting).
