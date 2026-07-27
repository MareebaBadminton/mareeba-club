# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server at http://localhost:3000
- `npm run build` — production build (uses `cross-env NODE_OPTIONS=--openssl-legacy-provider` for legacy OpenSSL compatibility; do not remove). This also runs TypeScript type checking.
- `npm start` — run the production build
- `npx eslint src` — lint. **Do not use `npm run lint`**: the repo has a flat config (`eslint.config.mjs`) which Next 14's `next lint` does not support, so `npm run lint` drops into an interactive setup prompt and lints nothing.

There is no test suite. For pure logic (e.g. `sessionDates.ts`), a throwaway script run with `npx tsx` is the established way to verify without adding a test dependency.

## Deployment

The app deploys to Vercel automatically on `git push` to `main` (1–2 minute build). Required environment variables in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project (also needed in `.env.local` for dev)
- `ADMIN_PASSWORD` — checked by `/api/admin/login` **and re-checked on every write** to `/api/unavailable-dates`; changing this requires a redeploy
- `SUPABASE_SERVICE_ROLE_KEY` — server-side only, used by the `unavailable_dates` write endpoints to bypass RLS. **Must never carry a `NEXT_PUBLIC_` prefix**, which would ship it to every browser.

Note: Supabase pauses free-tier projects after a period of inactivity, and a paused project's hostname stops resolving (`ERR_NAME_NOT_RESOLVED`) — which looks like a code bug but isn't. Check the dashboard first.

## Architecture

Next.js 14 App Router + Supabase. The app tells players whether a badminton session is running; it does **not** handle bookings. Single SPA at `src/app/page.tsx` with two tabs (Home, Session Dates) switched by local state, plus a separate `/admin` route.

Sessions are **fixed in code**: every Friday and Sunday, defined in `SESSION_TIMES` in `src/lib/utils/sessionDates.ts`. Cancellations are the only variable, stored in the `unavailable_dates` table. Adding a session on another weekday, or changing the weekly pattern, requires a code change by design.

### Data flow: client → API route → Supabase

Client components **never** call Supabase directly. They go through `/api/*` route handlers in `src/app/api/`, which use the shared client in `src/lib/supabase.ts`. `src/lib/utils/unavailableDateUtils.ts` is the layer client components use — each function `fetch`es an API route.

Two consequences worth knowing:

1. **All API routes must export `export const dynamic = 'force-dynamic'`.** Without it, Next.js/Vercel caches route handler responses and admins see stale data until the next deploy. This is the single most common bug class in this repo — see `TROUBLESHOOTING.md`. Any new route added under `src/app/api/` needs this line.
2. **No localStorage fallback.** Earlier versions fell back to localStorage when an API call failed; this caused stale data to mask outages. The util functions throw clear errors instead. Don't reintroduce a localStorage cache as a fallback — here it would tell players a cancelled session is running.

### Timezone handling

The app serves Queensland (Australia/Brisbane, UTC+10, no DST) but Vercel runs UTC. **Never use bare `Date` arithmetic or `toLocaleDateString()` without an explicit `timeZone`** — days will shift in production.

- All new date logic belongs in `src/lib/utils/sessionDates.ts`, which represents dates as `'YYYY-MM-DD'` strings and anchors every weekday calculation on **noon UTC** so it can never drift across a day boundary. `'YYYY-MM-DD'` strings also compare correctly with `<` and `===`, which is how past/today checks are done.
- From the older `src/lib/utils/dateUtils.ts`, use **only `getAustralianDateString()`**. `getAustralianDateTime()`, `getAustralianToday()`, and `toAustralianTime()` parse locale strings back into `Date` objects and yield server-local interpretations. Don't build on them.

### Database (Supabase)

Schema lives in `supabase-setup.sql`. Tables: `players`, `sessions`, `bookings`, `payments`, `unavailable_dates`.

**Only `unavailable_dates` is used by the app.** `players`, `bookings`, and `payments` are retained deliberately as historical record from the booking era — nothing reads or writes them. The `book_session_atomic` Postgres function is likewise retained but unused. Don't wire new features to any of them without asking; they are archives, not live data.

`unavailable_dates` RLS is **read-only on purpose**. The anon key ships in the browser bundle, so a public INSERT/DELETE policy would let anyone wipe every cancellation. Writes go through `/api/unavailable-dates` using `SUPABASE_SERVICE_ROLE_KEY` with the admin password verified per request. Do not "fix" this by adding public write policies.

Admins manage cancellations at `/admin` — no Supabase Table Editor, no code change, no deploy. See `DEPLOYMENT_GUIDE.md`.

### Admin auth

`ADMIN_PASSWORD` is checked server-side and never sent to the client. Don't move this check into a client component or hardcode a password — that was the prior critical-severity bug fixed in the December 2025 review.

Note that `/api/admin/login` only gates the **UI**: it returns a success flag and the client reveals the admin panel. The real security boundary is that every write to `/api/unavailable-dates` re-verifies the password server-side. Any new admin write endpoint must do the same; a login call alone protects nothing.

### Path alias

`@/*` → `./src/*` (configured in `tsconfig.json`).

## Reference docs in repo

- `DEPLOYMENT_GUIDE.md` — non-developer admin runbook (deploys, password changes, cancelling sessions, multi-admin git workflow)
- `TROUBLESHOOTING.md` — known bug patterns, especially the API caching and timezone issues
- `CODE_REVIEW.md` — what's been hardened and what was intentionally skipped (input validation, rate limiting, Zod schemas) because of the small trusted user base. Note: Zod has since been removed as a dependency along with the registration form.
- `docs/superpowers/specs/2026-07-27-session-calendar-design.md` — why the booking system was removed and what replaced it
