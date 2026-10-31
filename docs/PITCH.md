# JomKomute × MyRapid PULSE: A Commute Companion Pitch

Oct 31, 2026 · Taufik Hamid

## Summary

MyRapid PULSE answers "where is my bus?". Riders wake up asking a different question: **"Should I take MRT Maluri, LRT Maluri, or work from home today?"**

This pitch proposes a commute-companion layer for PULSE. Riders save their usual trip once, for example *MRT Maluri, 7:30am, Monday to Friday*. PULSE then tells them, before they leave, what to do today: go now, leave early, switch line, take a quieter car, or stay home.

The ideas are already running as a working prototype, [JomKomute](https://jomkomute.taufikhamid.com). They belong inside PULSE, because Prasarana already owns the trains, the buses, the live data and the riders.

## What PULSE does today

PULSE covers the standard transit-app toolkit well, but nothing in it knows *your* commute. This read is based on the guest view of v1.0.54 (build 207). A signed-in account may show more.

| Area | What's there | What it doesn't do |
| --- | --- | --- |
| Explore | Plan Your Journey search, live Bus Tracker, Rail Map, a location map, Nearby Stations with bus arrival times | Doesn't know where or when you usually travel |
| Explore More | My50, Kembara, Rapid On-Demand, parking, PartnerHub | Each is a separate service, not tied to a daily trip |
| Notifications | A bell icon and a WhatsApp link | No sign of alerts tied to a saved route |
| Shop, Lifestyle | Commerce and lifestyle content | Not about getting to work |
| Profile | My preferences, Help and feedback, Rate MyRapid PULSE | No saved commutes, no departure times, no WFH days |

The Nearby Stations card also showed rough edges during testing, such as a "1038 min walk" to a bus stop and a "9 hrs 44 min" arrival. These are worth flagging, but they're not the point of this pitch.

## The gap: the 7am decision

Riders don't open a transit app to browse. They open it to decide something before leaving home, and today they find out about crowding or delays only after reaching the platform.

That decision looks different depending on where the rider boards:

- **Riders with two lines nearby**, such as at Maluri, choose between lines: MRT, LRT, or work from home.
- **Riders with one line**, such as on the Kelana Jaya line at busy interchanges like Pasar Seni (LRT/MRT) and Abdullah Hukum (LRT/KTM), can't easily switch lines. Their choices are **when** to leave, **where** to board (which car, or one stop back), **how** to travel instead (KTM, MRT, bus, e-hailing), or **whether** to travel at all.

A useful answer has to cover both. "Take the MRT" helps the first rider. "Leave 10 minutes earlier and board the front car" helps the second.

## Proposed features

Five features, starting with a saved commute in Profile, turn PULSE from a lookup tool into a daily companion. Each builds on something PULSE already has.

**How one morning works:** one saved commute is checked against three sources (official service status, rider reports, and the journey planner's alternatives), and the rider gets one of five answers: go now, leave early, switch line, take a quieter car, or stay home. Sending a bridging bus needs the operator.

| # | Feature | What the rider sees | Builds on |
| --- | --- | --- | --- |
| 1 | **Saved commute** | Profile → My commutes: "MRT Maluri, 7:30am, Mon–Fri", plus WFH days and one-off exceptions | Profile, sign-in, My preferences |
| 2 | **Pre-departure alert** | A push 15 minutes before the saved time: "Kelana Jaya line: 3 crowding reports at Pasar Seni. Leave early?" | Notifications, official service announcements |
| 3 | **Today's verdict** | One card on Explore: *Naik MRT*, *Gerak sekarang*, *Tunggu 10 min*, or *WFH je* | Journey planner, Rail Map, live service status |
| 4 | **Rider reports** | One tap for *sesak*, *lewat*, *rosak*, plus "which car is quieter: front, middle, back". Others confirm with "still happening?" | Help and feedback (today a one-way channel) |
| 5 | **Bridging bus on demand** | Riders stuck at a disrupted station tap "need a bridging bus". Operations see where demand is building | Rapid On-Demand, Bus Tracker |

Features 1 and 2 work from day one with official data alone. Features 3 and 4 get better as riders report. Feature 5 is something only an operator can deliver, which is why these ideas belong inside PULSE rather than in a separate app.

## Why inside PULSE, not another app

A separate app can show the same official status in a new UI, but riders don't need another app for that. What a commute companion needs is something only the operator has:

- **Riders.** Crowdsourced reports only work with many riders. PULSE already has them, while an independent app starts at zero.
- **Data.** Live train positions, crowding and disruption notices come from Prasarana. An independent app can only guess or scrape them.
- **Buses.** Only the operator can send a bridging bus. An independent app with a "request bus" button can't deliver one, and would lose riders' trust.
- **Trust.** Riders act on an alert from the operator, which matters most during a disruption.

## The prototype: JomKomute

[JomKomute](https://jomkomute.taufikhamid.com) is a live web prototype covering KTM Komuter, LRT, MRT and KL Monorail in the Klang Valley, in English and Malay. It shows how these features feel in practice, but it isn't a finished product yet.

| Part | Status |
| --- | --- |
| Station and line data from official GTFS timetables (data.gov.my, Prasarana and KTMB) | Working |
| Fewest-transfer route planning with a backup route | Working |
| Rider reports (delay, accident, breakdown, crowding) on a live map, with "still happening?" voting and clustering | Working |
| Line status with first and last trains, plus followable lines | Working |
| Saved commute with WFH days and exceptions | Working, stored on the device only |
| Crowding forecast | Placeholder model, not real ridership |
| Today's verdict (`/today`): go as usual, switch line, or WFH for a saved commute | Working, from rider reports only (no official status feed) |
| Pre-departure alert | Not built yet. Shown in the concept video only |
| Which-car reports and bridging bus request | Not built yet |

Two short concept videos (vertical, in Malay) show the rider's side: "Kenapa komuter pagi sentiasa penuh?" and "MRT, LRT… atau WFH je hari ni?". Both are illustrations, not real data.

**Open question:** the prototype has no pilot users or usage data yet. A small pilot (next section) would give this pitch real numbers.

## Suggested pilot

Start with one line and two stations. A small, concrete result is more convincing than a city-wide plan. The durations below are proposals, not commitments.

1. **Build the core (about 2 weeks).** Add the pre-departure alert to JomKomute (the Today's verdict screen is already built), using official status and rider reports.
2. **Run a pilot on the Kelana Jaya line (about 4 weeks).** Recruit 30–50 regular riders who board at Pasar Seni or Abdullah Hukum, and have them save their commute.
3. **Measure.** Count how often riders act on an alert (leave early, switch, WFH), how many reports are made per day, and how riders rate the usefulness of each morning's verdict.
4. **Share results with Prasarana.** Bring the numbers, rider quotes and a demo, and propose which features PULSE could adopt first. Features 1 and 2 need no new data.

## About

JomKomute is an independent concept. It isn't affiliated with or endorsed by Prasarana or MyRapid. It was designed and built by Taufik Hamid as a portfolio project, and is offered as input for PULSE.

- Prototype: [jomkomute.taufikhamid.com](https://jomkomute.taufikhamid.com)
- Source code (MIT): [github.com/taufikhamid2000/JomKomute](https://github.com/taufikhamid2000/JomKomute)
- Portfolio: [taufikhamid.com](https://taufikhamid.com)
- Contact: [taufikhamid2000@gmail.com](mailto:taufikhamid2000@gmail.com)
