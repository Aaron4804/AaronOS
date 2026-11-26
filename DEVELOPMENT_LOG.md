# AaronOS development log

## Mobile workspace, progression and PWA

- Kept the existing shell and repositories. Added a compact interactive calendar, journal writing flow, project and goal links, module summaries, chart selection, and daily dashboard widgets.
- Added migration 006 for owner-scoped achievement history and reusable meal macro snapshots. Badge IDs are stable for an owner and a code, and badges survive XP reversal. Existing clients and backups use the existing tracker table and functions.
- Rotating workouts use comma-separated labels from a plan's start date. Add the same sequence and date to workout plans named by their slot; Rest and Off skip that day. Nutrition selects training targets on planned or completed workout days and falls back to base targets when overrides are absent.
- The PWA caches only the public offline page and public PNG icons, with network-only authenticated navigation and API requests. Development mode does not register the production service worker. Setup and device installation are documented in `PRODUCTION_SETUP.md`.
- Browser screenshots informed the calendar weekday labels, muted neighboring month dates and removal of unrelated tracker tabs from the dedicated journal/calendar/goal views. Browser tests check event edits, journal persistence, and repeat logging from a macro template. The independent production browser test checks the PWA manifest, PNG responses, service worker control, cache contents and offline navigation.
- Verification passed: 26 unit and isolated PostgreSQL integration tests, 14 Playwright desktop/mobile workflow checks, ESLint, standalone TypeScript, and production build. The production Playwright PWA scenario passed its assertions. Hosted Supabase, live GitHub GraphQL, and a physical iPhone were outside local verification.

## Workspace redesign

- Introduced a shared dark workspace shell with grouped, collapsible navigation, a mobile drawer, command search, and account controls. The dedicated Quests route uses a modal editor and a category filter. The dashboard foregrounds level progress and groups daily metrics.
- Nutrition now opens the diary. Meal sections provide dated totals, target bars, water intake and one-step entry. Work opens on the timer and manual sessions. Fitness opens on the planned session and recent history, with in-session exercise cards, editable sets, previous performance and rest countdown.
- The presentation continues to use the existing quest and tracker repositories, timer completion, and XP calculations. No migration or database schema change is required for this redesign.
- The redesign browser scenario records Dashboard, Quests, Fitness, active workout, Nutrition, and Work at both viewport sizes. Screenshot review led to a shorter heatmap, removal of the duplicate fitness start control, and placing the workout timer before the set editor. The recurring-quest test also exercises the mobile navigation drawer.

## Daily-use pass

- Added version 1 full JSON backups and typed replacement confirmation in Settings. The file includes records, recurring quest credits, reversed XP, settings and active timers. Browser writes roll back on a synchronous write failure; Supabase replacement is an owner-scoped SQL transaction. Cross-account ID collisions abort instead of overwriting foreign records. This backs up app records, independent of authentication accounts, secrets and any future external file storage.
- Apply `005_backup.sql` after migrations 001–004 on an approved project. Isolated tests include exact backup replacement, duplicate rollback and an attempted cross-owner restore.
- Added workout comparisons and exercise progression, recent period reviews, nutrition adherence over logged days, rolling weights, a rule-based coach and unified activity history. Settings exposes card ordering, module visibility and category reminders. Achievement status is derived from current data.
- GitHub returned EACCES from the restricted development network and HTTP 200 from an authorized public network probe. The route now bounds retry, deduplicates in-flight fetches, respects cooldowns, and preserves stale results and their last successful timestamp for its process lifetime. `GITHUB_TOKEN` remains optional and server-only.
- LeetCode account stats continue to use the manual coding tracker and profile link. A supported public submissions interface was not established.
- Added Playwright and four workflows run at desktop and mobile viewports. All eight browser runs passed, along with 24 unit and isolated integration tests. Run `npm.cmd run test:e2e` with Microsoft Edge installed. Browser artifacts are ignored. Visual review showed the metric grid dominated the first screen, so the Command Center now starts with eight cards and provides an explicit expansion control.

## Recurrence and tracker expansion

- Migration 002 adds interval recurrence and an XP award log. A locked quest row and partial unique index serialize active credits per occurrence. Undo marks the award reversed, completion copies the reward, and existing one-time completions are backfilled. Hard deletion removes associated award history. Archive preserves it.
- Migration 003 adds owner-scoped tracker storage and an atomic server-side timer finish function. The local repository uses browser storage. Tracker payloads use JSONB with application validation plus SQL structural and numeric checks. Module relationships are app-level references and do not provide full relational integrity.
- Fitness and nutrition use set and meal records. Meal nutrient values are copied into log entries. Exercise weights are normalized to kg for comparisons. Command Center summaries read the same records as tracker pages.
- Tracker JSON import validates record shape, skips existing IDs and leaves existing settings in place. Export covers tracker records, excluding active timers, quests and award history. The same export can transfer tracker records from local mode into a configured Supabase account.
- Apply migrations in order: `001_quests.sql`, `002_quest_occurrences.sql`, `003_tracker_entries.sql`, `004_tracker_xp.sql`. They have been prepared locally only. Review and test them on an authorized Supabase development project before production use.
- Migration 004 adds owner-readable XP history for eligible workouts, focus sessions, habit logs, solved coding problems and completed milestones. The trigger snapshots rewards and reverses credit on loss of eligibility or deletion. It credits one saved source record at a time, and does not backfill untouched tracker entries. Imported tracker records can earn fresh credits under the target account settings.
- Configure the GitHub username under Settings. The app uses public REST endpoints; set the optional server-only `GITHUB_TOKEN` to use authenticated rate limits. The live lookup returned 503 in development. LeetCode has a manual fallback and profile link.
- Calendar links open saved project milestones, workout plans and diet entries in their own trackers. The Command Center quick-action dialog opens with Ctrl/Cmd+K. Settings supports filtering and ordering tracker cards by exact card labels.
- Pomodoro timing derives focus and break phases from stored timestamps. Local save and the Supabase finish RPC record productive time and remove the timer. The work timer can be linked to a project. Workout rest countdown is page-local.
- Finance CSV import accepts the application's export column order and deduplicates matching records. Tracker JSON backup does not cover quest or award history. SQL migrations require live validation before production rollout.
- Account balances match transaction account names case-insensitively. Renaming an account requires corresponding transaction updates. Recurring expenses use a due-date template with separate actions to prepare a transaction and advance the due date.
- Added `@electric-sql/pglite` as a development-only dependency for in-memory PostgreSQL migration tests. All 22 tests passed with `npm.cmd test`, including full migration replay, two-user isolation, completion retry and reversal, historical meal overrides, and an atomic timer finish. The test emulates Supabase's auth roles and claim function. It uses no remote project.
- Final ESLint and the production build, including TypeScript validation, passed.
- Route checks passed for the Command Center and all eight modules. Removing the segment-level streaming fallback restored HTTP 404 for unknown modules. Client data loading indicators remain. The calendar's internal links use Next.js Link.

## Foundation and one-time quests

- Dashboard data comes from quest records. Completion uses one date per quest, so undo or deletion reverses its current XP contribution. Editing completed quest XP changes its existing credit. An immutable transaction history remains future work.
- Explicit local mode uses browser storage under development only. Production requires a verified Supabase user. Supabase database constraints and RLS enforce basic validation and ownership. Local storage is scoped to the browser origin and is not a backup.
- The first migration is `supabase/migrations/001_quests.sql`. Review it against the target schema, then apply it to a designated Supabase development project with authorization. In Supabase Auth, enable email sign-in and configure the application site URL and allowed redirects. Set the public project URL and publishable key using the names in `.env.example`. Use the publishable key, never a service role key.
- No migrations have been applied remotely. Remote auth and database behavior require verification with a configured project and two separate accounts to exercise owner isolation.
- `npm ci` installed 607 packages from the existing lockfile. Three calculation tests passed. The initial lint run flagged an unescaped apostrophe in the retired dashboard grid, which was then removed.
- Final ESLint and production build passed, including Next.js TypeScript validation. The build registered `src/proxy.ts` and confirmed that the dashboard is rendered on demand.
- HTTP smoke checks passed for the root redirect, local dashboard, login and signup. The production server redirected unauthenticated dashboard traffic to login with the local-mode flag set, confirming the development-only guard. Browser interactions and live Supabase were unverified.

## Run locally

```powershell
npm.cmd ci
$env:AARONOS_LOCAL_MODE = 'true'
npm.cmd run dev -- --hostname 127.0.0.1
```

Open `http://127.0.0.1:3000/dashboard`. Turn local mode off to use Supabase. Run the targeted tests with `node --test tests/quest-stats.test.mjs` on Node 24.
