# AaronOS

AaronOS is a personal workspace for quests, fitness, nutrition, work, planning, finances and reflection. The Next.js application supports local browser storage for development and Supabase authentication and persistence for hosted use.

## Local development

Use Node.js 24 and install dependencies with `npm ci`. In PowerShell:

```powershell
$env:AARONOS_LOCAL_MODE = 'true'
npm.cmd run dev -- --hostname 127.0.0.1
```

Open [the Command Center](http://127.0.0.1:3000/dashboard). Local mode is development-only and stores records in the current browser. Use the full backup export in Settings before clearing browser data.

## Verification

```text
npm run lint
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
```

Browser tests use Microsoft Edge. The unit suite includes migration replay against an isolated PostgreSQL database. See the [production setup guide](PRODUCTION_SETUP.md) for environment variables, Supabase migration order and PWA checks. Offline support is limited to the public fallback page.

See the [implementation plan](IMPLEMENTATION_PLAN.md) for remaining work and the [development log](DEVELOPMENT_LOG.md) for implementation and verification notes.
