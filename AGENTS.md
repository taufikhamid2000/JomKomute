# Project docs

Project docs live in `docs/`: `PRD.md` (product), `TRD.md` (technical), `AFD.md` (app flows), `DBD.md` (design brief), `BSD.md` (backend schema), `IPD.md` (implementation plan / roadmap), `PITCH.md` (pitch to MyRapid PULSE; keep its prototype status table true). Read them before making changes. Update them in the same change whenever a change makes them wrong.

# Token use

The owner watches their usage limits, so keep work lean:
- Work inline by default. Use subagents only when a task splits into independent pieces
  that touch different files (e.g. revamping several pages at once), not for a feature
  spanning a few files, and never for docs updates. If asked to use subagents for a job
  that small, do it inline and say so in one line.
- Spawn subagents with `model: sonnet` and `effort: medium`; use `model: haiku` for
  read-only searching.
- Keep tool output small: query only the database columns and rows you need, and read
  only the part of a file you need.
