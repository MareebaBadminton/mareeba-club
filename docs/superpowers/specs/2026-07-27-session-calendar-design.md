# Session Calendar — Design

**Date:** 2026-07-27
**Status:** Approved (pending spec review)

## Goal

Replace the booking system with a read-only "is badminton on?" calendar, plus an admin
page for marking dates unavailable.

Players no longer book in advance. They pay by bank transfer or cash and turn up. The only
thing the site needs to tell them is whether a session is running.

## Problem being solved

Cancelled dates are currently hardcoded in `AnnouncementPopup.tsx` (dates at line 38, an
auto-hide cutoff at line 12). Every cancellation requires a code edit, commit, and deploy —
four of the last five commits on `main` are exactly that. Moving cancellations into the
database removes the need to touch code at all.

The `unavailable_dates` table already exists and `GET /api/unavailable-dates` already reads
it. The missing pieces are write access and a UI.

## Scope

In scope:

1. Public month calendar showing sessions and cancellations
2. Admin page to add and remove cancelled dates
3. Removal of the booking system (tabs, components, API routes, utils)
4. Home page copy updates

Out of scope (would need a code change):

- Adding one-off extra sessions on non-Friday/Sunday days
- Changing the regular weekly schedule
- Any payment tracking or reconciliation

## Session model

Sessions are fixed and derived in code, not from the database:

- **Friday** 7:45 PM – 9:45 PM
- **Sunday** 3:00 PM – 5:00 PM

Every Friday and Sunday is a session unless its date appears in `unavailable_dates`.
Cancel-only: admin marks exceptions, never defines the pattern.

## Public site

Two tabs, `Home` and `Session Dates`, with Home as the landing tab.

### Home

Unchanged: logo header, image slideshow, welcome text, address, session times, equipment
information, not-for-profit statement, footer.

Rewritten:

- **Fees** — `$10 cash on the night`, `$8 by bank transfer`
- **Payment instructions** — keep name, BSB, account number, and PayID. Remove the
  "Only make payment after you booked a session" heading, the amount line (now two prices,
  covered by the fees block), and the payment-description/reference lines entirely. No
  reference is needed since payments are no longer matched to players.

Removed:

- "How to Register" four-step block
- "Quick Tips" block — all three tips reference Find your ID, Find Booking, or payment
  references

### Session Dates tab

- Month grid, Monday–Sunday columns
- Fridays and Sundays marked as sessions, with their times shown
- Cancelled dates visually struck out; tapping one reveals the reason
- `< prev | next >` month navigation
- Legend explaining the two states

### Announcement popup

Rewritten to read from the database instead of hardcoded values. No hardcoded dates and no
cutoff date.

Display rules:

- Shows any cancellation falling within the next 14 days, listing each date and its reason
- If there are no cancellations in that window, the popup does not render at all
- Appears on every visit, matching current behaviour (commit `be46482`)
- A cancellation disappears from the popup on its own once its date has passed, judged in
  Brisbane time

## Admin

Replaces the existing `/admin` page, which is dead code — it reads localStorage counts that
are always zero and offers a localStorage→Supabase migration that `CLAUDE.md` records as
abandoned.

New `/admin`:

1. Password prompt, verified via the existing `POST /api/admin/login`
2. The same month calendar, where clicking a Friday or Sunday toggles it off
3. Optional reason text field
4. List of upcoming cancellations, each with a remove button

The password is held in component state after login and sent with each write request.

## Data and API

`unavailable_dates` keeps its current shape: `id`, `date` (unique), `reason`, `created_at`.

### Write authorisation

`unavailable_dates` keeps **read-only** RLS. Public INSERT/DELETE policies are explicitly
rejected: the anon key ships in the browser bundle, so public write policies would let
anyone wipe every cancellation directly, bypassing the app.

Instead, write endpoints use the Supabase **service-role key** server-side and verify the
admin password on every request. This mirrors the existing pattern in
`setup-sessions/route.ts:8-11`.

`SUPABASE_SERVICE_ROLE_KEY` must be set in Vercel. The existing code falls back to the anon
key when it is absent, so it may never have been configured. It must not carry a
`NEXT_PUBLIC_` prefix.

### Endpoints

| Route | Method | Body | Behaviour |
|---|---|---|---|
| `/api/unavailable-dates` | GET | — | Existing. Returns date→reason map. |
| `/api/unavailable-dates` | POST | `date`, `reason`, `password` | Verify password, then insert. |
| `/api/unavailable-dates` | DELETE | `date`, `password` | Verify password, then delete. |

All routes must keep `export const dynamic = 'force-dynamic'`. Without it, Vercel caches
route handler responses and admins see stale data — the most common bug class in this repo.

Writes return a clear error rather than falling back to any local cache.

## Timezone

All date logic goes through `dateUtils.ts` with `Australia/Brisbane`. This matters more here
than in the booking code: "is today a session day" and "has this cancellation passed" both
run on Vercel in UTC, so naive `Date` arithmetic would flip Sunday sessions a day early for
anyone loading the page late evening.

The month-grid builder is new and must construct days from Brisbane-local date strings, not
from `Date` objects in server-local time.

## Removals

Verify each is genuinely unreferenced before deleting, rather than trusting this list.
`HomeSection.tsx`, `Footer.tsx`, and `Logo.tsx` may already be orphaned and need checking.

**Components:** `RegisterForm`, `BookingForm`, `BookingLookup`, `FindPlayerID`,
`ProfileUpdate`, `SessionPlayerList`, `NextSessionPlayers`, `RegistrationReminderModal`,
`PaymentTracker`

**Pages:** `src/app/payments/page.tsx`

**Utils:** `bookingUtils`, `playerUtils`, `paymentUtils`, `storage`, `migrate-to-supabase`,
and `generatePaymentReference()` from `dateUtils.ts:63`

**API routes:** `bookings`, `bookings/next-session`, `players`, `sessions`, `sync-players`,
`setup-sessions`, `send-player-id`, `test-email`

**Dependencies:** `nodemailer` and `@types/nodemailer` (`package.json:13,18`). Confirmed used
only by the `send-player-id` and `test-email` routes, both of which are being removed. Email
sending is not used by the club at all, so no replacement is needed. Any `EMAIL_*` or `SMTP_*`
environment variables in Vercel can also be deleted.

**Kept:** `unavailable-dates`, `admin/login`, `lib/supabase.ts`, the rest of `dateUtils.ts`,
`ImageSlideshow`, `AnnouncementPopup` (rewritten)

### Database

Tables `players`, `bookings`, and `payments` are left untouched, with their rows intact, so
history stays browsable in the Supabase Table Editor and nothing is irreversible. The
`book_session_atomic` function becomes unused but stays in the database.

## Known drift to reconcile

The live database has `Allow public insert on sessions` and `Allow public update on sessions`
policies that do not exist in `supabase-setup.sql` (which defines only SELECT for `sessions`,
line 71). The file no longer reflects reality. Worth fixing so a rebuild from the file
produces the actual database.

## Prerequisites

1. **Restore the paused Supabase project.** Nothing can be tested until then — the project
   hostname does not resolve while paused.
2. **Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel** and redeploy once so it takes effect.

## Verification

No test suite exists in this repo. Verification is manual:

- `npm run build` succeeds with no unresolved imports after removals
- `npm run lint` passes
- Marking a date in `/admin` updates the public calendar on the next page load
- The popup shows a cancellation within 14 days and hides once it passes
- Friday and Sunday classification is correct when checked late evening Brisbane time
- `/admin` write endpoints reject requests with a wrong or missing password
