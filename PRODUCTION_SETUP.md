# AaronOS production setup

## Environment

Use Node.js 24 and install from the lockfile with `npm ci`. Set these variables in the deployment environment:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project publishable key |
| `AARONOS_LOCAL_MODE` | Leave unset or set to `false` |
| `GITHUB_TOKEN` | Optional server-side token for upstream GitHub requests |
| `GITHUB_OWNER_USER_ID` | Supabase user UUID authorized to see the token-backed GitHub contribution calendar |

Set public Next.js variables before building. Keep GitHub credentials server-side. AaronOS uses the signed-in user's Supabase session, not a service-role key.

## Supabase authentication and schema

1. Create a staging project and enable email authentication. Set the Authentication Site URL to the HTTPS base URL of that deployment. Keep allowed redirect URLs restricted to URLs you control.
2. Use the application signup screen with a permitted address to create the owner account. For a private instance, disable public signup after provisioning. Verify sign-in and logout in the staging deployment.
3. Review the SQL in `supabase/migrations`. Apply the files in order on a fresh project: `001_quests.sql`, `002_quest_occurrences.sql`, `003_tracker_entries.sql`, `004_tracker_xp.sql`, `005_backup.sql`, then `006_personal_progress.sql`. On an existing project, use its migration history to select only unapplied files. Take a backup before migrating.
4. With explicit deployment approval, use your Supabase CLI migration workflow from the project directory, or have the project administrator execute the ordered SQL in a staging database. Before targeting production, verify authorization with two test users, then test timer completion, XP reversal, and backup export/restore on disposable staging records.

See [Supabase auth URL configuration](https://supabase.com/docs/guides/auth/redirect-urls) and [database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

## Storage and backups

Current application data and JSON backup/restore use PostgreSQL. No storage bucket is required. Private progress photos are a separate feature. If implemented, use a private bucket with explicit owner-scoped object policies, and verify signed URLs expire. JSON exports exclude identity accounts, secrets, and storage objects.

## Deployment and installation

Use a Next.js hosting target that supports server rendering, the proxy and route handlers. Build with `npm run build` and start with `npm run start`. Serve the complete origin over HTTPS, including `/sw.js`, `/manifest.webmanifest`, the icon routes and the offline document. Test using the actual production URL before sharing it.

- **iPhone:** Open the HTTPS URL in Safari, choose Share → Add to Home Screen, enable Open as Web App when shown, then tap Add. [Apple installation instructions](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)
- **Desktop:** Use the browser's Install or Apps menu from the HTTPS URL.
- **Offline:** The service worker stores only the offline document and public icons. Sign-in, application data, and writes require a connection. There is no offline synchronization or push delivery.

The GitHub calendar uses the authenticated GraphQL contribution collection and is restricted to the configured Supabase owner outside local development. Saved coding practice remains the source of LeetCode difficulty counts. Run `npm test`, `npm run lint`, `npm run build`, and `npm run test:e2e` before production deployment. For the PWA check, start the production build in a separate terminal with `npm run start -- --hostname 127.0.0.1 --port 3115`, then run `npm run test:pwa`.
