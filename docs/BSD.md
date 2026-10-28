# JomKomute — Backend Schema (BSD)

> Derived from `supabase/migrations/`. Authoritative state lives in the database. `server/schema.sql`, `issues-schema.sql`, `ridership-schema.sql` are older design stubs, not the source of truth.

## Where it lives
Supabase project `master_db`, **shared with other Jom apps**; login is the shared **Jom ID** session. JomKomute tables are in the `jomkomute` schema (`db: { schema: "jomkomute" }`). Early migrations created `public.jomkomute_*` tables; `20260922120000` moved them to `jomkomute` and `20261021190000` dropped the leftover `public` copies. Cross-app FKs are not allowed; only `auth.users` is shared.

## Tables
| Table | Key columns | Access |
|---|---|---|
| `user_reports` | id, lat, lng, category (`delay`/`accident`/`breakdown`/`crowded`/`other`), note (<=280), reporter_lat/lng, line_id, owner_secret, `user_id` (default `auth.uid()`, FK `auth.users` on delete set null), created_at | anon+authenticated: column-limited select/insert; select policy only last 24h; insert policy validates category and coordinates |
| `user_report_votes` | id, report_id (FK cascade), voter_key, vote (`confirm`/`dispute`), user_id, created_at; unique (report_id, voter_key) | anon+authenticated select/insert/update (column grants) |
| `user_reports_visible` (view) | report columns without secrets | select for anon+authenticated; hides reports where disputes minus confirms >= 3 |
| `line_operating_hours` | line_id pk, line_name, weekday/weekend first and last, holiday_note | public read; seeded for 10 lines |
| `planned_trip_pings` | ping_key unique, station, line_id, trip_date, time_bucket (15-min), created_at | no client grants; service role via `/api/pings/*`. `TODO: confirm` its move to the `jomkomute` schema is not in these migrations (only a `public` create and a later revoke) |
| `push_subscriptions` | endpoint unique, p256dh, auth, line_ids text[] | no client grants; service role only |
| `line_status_notified` | line_id pk, level, updated_at | no client grants; service role only |

## Functions
| Function | Purpose |
|---|---|
| `delete_own_report(report_id, secret)` | security definer; deletes a report whose `owner_secret` matches; executable by anon and authenticated |
| `jomid_joined_jomkomute()` | tells Jom ID whether this user has reported or voted; not client-callable |

## Conventions
- Enums via check constraints. Timestamps `timestamptz`; trip dates are `date`.
- Idempotent SQL (`if not exists`, `drop policy if exists`).
- Column-level grants instead of broad table grants (`20261021200000`).
- Migrations are applied by CI only for files changed in a push (`supabase db query --linked -f`); never `db push`.
- Saved routes and exceptions are **not** in the database (browser `localStorage`).

## Gotchas
- Replaying all migrations on a fresh DB recreates `public` tables before the move; order matters.
- Line status and history are computed from `user_reports` (service role in `/api/line-history`, aggregate counts only).
- Reports are anonymous and unmoderated; `user_id` is recorded when signed in.
