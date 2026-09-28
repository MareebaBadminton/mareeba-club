# Move from Supabase to Neon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Supabase with Neon as the store for `unavailable_dates`, so the database wakes itself on the next request instead of needing someone to click "Resume project".

**Architecture:** All database access already happens in one route handler (`src/app/api/unavailable-dates/route.ts`), so the swap is contained. A new server-only module `src/lib/unavailableDatesDb.ts` wraps three SQL queries using Neon's HTTP driver (`@neondatabase/serverless`). The route calls that module instead of `supabase-js`. The browser code (`unavailableDateUtils.ts`, the calendar, `/admin`) is unchanged — it only ever talked to `/api/*`.

**Tech Stack:** Next.js 14 App Router, TypeScript, `@neondatabase/serverless` 1.x, Neon Postgres (free plan), Vercel.

**Spec:** None written. Requirements come from the 2026-09-28 conversation: Supabase free tier paused the project even though a twice-weekly keep-awake ping was succeeding (last success 2026-09-24, found paused 2026-09-28). The admin (a non-developer — see memory) chose Neon because a sleeping Neon database wakes automatically on the next query.

## Global Constraints

- Every route under `src/app/api/` keeps `export const dynamic = 'force-dynamic'`.
- `DATABASE_URL` is server-only. It must **never** carry a `NEXT_PUBLIC_` prefix and must never be imported into a client component — it grants full read/write access.
- Every write (POST, DELETE) re-checks `ADMIN_PASSWORD` server-side **before** touching the database, and auth is checked before input validation (existing order in `route.ts`).
- No localStorage fallback anywhere. Failures surface as errors.
- Dates travel as `'YYYY-MM-DD'` strings end to end. Never let the database driver turn a `DATE` column into a JS `Date` (server runs UTC; the club is Australia/Brisbane).
- API response shapes stay byte-compatible: GET returns `{ unavailableDates: Record<string,string>, count: number }`; POST/DELETE return `{ success: true, date }`; errors return `{ error: string }` with 400/401/500.
- The archived tables (`players`, `sessions`, `bookings`, `payments`) are **not** moved to Neon. They are preserved by downloading a Supabase backup (Part A step 2).
- Commit attribution line: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Lint with `npx eslint src`, never `npm run lint`.

## Review Focus

1. **DATE column coming back as a JS `Date`** — Postgres drivers commonly parse `DATE` into a `Date` at server-local midnight, which would shift or stringify wrongly. Expected: GET always returns exact `'YYYY-MM-DD'` keys. Pinned by the format assertion in Task 1's verify script (query uses `to_char`).
2. **`DATABASE_URL` missing in Vercel** — Expected: GET/POST/DELETE return a 500 whose `error` says `DATABASE_URL is not set on the server`, not a crash at import time that breaks the whole build or page. Pinned in Task 1 (module throws lazily at call time) and checked in Task 1's verify script.
3. **Re-marking an already-cancelled date** — Expected: the reason is updated, no duplicate row, no error. Pinned in Task 1's verify script (upsert twice, assert one row with the new reason).
4. **Blank reason** — Expected: stored as `NULL`, and GET shows the fallback text `This date is unavailable.`. Pinned in Task 1 (null upsert) and Task 2 (curl with `"reason": "   "`).
5. **Cancellations made during the cutover are lost** — Expected: every Supabase row appears in Neon after the switch. Pinned in Task 4 by freezing admin edits, then comparing row counts and the full date list before and after.

---

## Part A: Admin setup (Elyna does this; the executor pauses here until done)

These are dashboard steps for a non-developer — give them to Elyna exactly as written and wait for confirmation.

1. **Resume Supabase** so the live site works during the move: Supabase dashboard → the paused project → **Resume project**. (Not "Upgrade to Pro".)
2. **Save the old archive:** on the same Supabase project page, click **Download backups** and save the file somewhere safe (e.g. the club's Google Drive). This keeps the old players/bookings/payments history.
3. **Create a Neon account:** go to https://neon.tech → **Sign up** (signing in with the club's GitHub or Google account is fine). Choose the **Free** plan.
4. **Create the project:** name it `mareeba-club`. Region: **AWS Asia Pacific (Sydney)**. Postgres version: leave the default. Click **Create project**.
5. **Create the table:** in Neon, open **SQL Editor** in the left menu, paste the contents of `neon-setup.sql` (the developer will send it — created in Task 1 Step 1), click **Run**. It should say it succeeded.
6. **Copy the connection string:** in Neon, click **Connect** (top of the project dashboard). Make sure **Connection pooling** is switched **on**. Copy the string that starts with `postgresql://`. Send it to the developer privately (not in a public chat or GitHub). **Do not** add it to Vercel yet — that happens in Task 4.
7. **Check the free-plan terms** on Neon's pricing page, and confirm with the committee that they're acceptable.

Executor: once you have the connection string, add this line to `.env.local` (git-ignored — never commit it):

```
DATABASE_URL=postgresql://...paste here...
```

---

### Task 1: Neon schema and database module

**Files:**
- Create: `neon-setup.sql`
- Create: `src/lib/unavailableDatesDb.ts`
- Create (throwaway, do not commit): `scripts/verify-neon.ts`
- Modify: `package.json`, `package-lock.json` (via npm)

**Interfaces:**
- Consumes: `process.env.DATABASE_URL` (read at call time, not import time)
- Produces:
  - `type UnavailableDate = { date: string; reason: string | null }`
  - `listUnavailableDates(): Promise<UnavailableDate[]>` — sorted ascending, `date` is `'YYYY-MM-DD'`
  - `upsertUnavailableDate(date: string, reason: string | null): Promise<void>`
  - `deleteUnavailableDate(date: string): Promise<void>` — no error if the date isn't there
  - All three throw `Error('DATABASE_URL is not set on the server')` when the variable is missing.

- [ ] **Step 1: Create a branch and write the schema file**

```bash
git checkout -b move-to-neon
```

Create `neon-setup.sql`:

```sql
-- Neon schema for the Mareeba Badminton session calendar.
-- Run once in the Neon SQL Editor when setting up a new database.
--
-- Only cancellations are stored. Regular sessions (every Friday and Sunday)
-- are fixed in code - see SESSION_TIMES in src/lib/utils/sessionDates.ts.
--
-- There is no row-level security here, unlike the old Supabase setup: the
-- browser never connects to this database. Only the server holds DATABASE_URL,
-- and every write re-checks ADMIN_PASSWORD first.

CREATE TABLE IF NOT EXISTS unavailable_dates (
  date DATE PRIMARY KEY,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Send this file's contents to Elyna for Part A step 5 now, if Part A isn't done yet.

- [ ] **Step 2: Install the driver**

```bash
npm install @neondatabase/serverless@^1.1.0
```

Expected: `package.json` dependencies now include `"@neondatabase/serverless": "^1.1.0"`.

- [ ] **Step 3: Write the failing verification script**

Create `scripts/verify-neon.ts` (throwaway — this repo has no test suite; `npx tsx` scripts are the established verification method per CLAUDE.md):

```ts
import assert from 'node:assert/strict'
import {
  listUnavailableDates,
  upsertUnavailableDate,
  deleteUnavailableDate,
} from '../src/lib/unavailableDatesDb'

// Far-future date so this can never collide with a real cancellation.
const TEST_DATE = '2099-12-31'

async function findTestRow() {
  const rows = await listUnavailableDates()
  return rows.filter(r => r.date === TEST_DATE)
}

async function main() {
  await deleteUnavailableDate(TEST_DATE)

  // Insert
  await upsertUnavailableDate(TEST_DATE, 'first reason')
  assert.deepEqual(await findTestRow(), [{ date: TEST_DATE, reason: 'first reason' }])

  // Re-marking updates the reason, never duplicates (Review Focus 3)
  await upsertUnavailableDate(TEST_DATE, 'second reason')
  assert.deepEqual(await findTestRow(), [{ date: TEST_DATE, reason: 'second reason' }])

  // Blank reason is stored as null (Review Focus 4)
  await upsertUnavailableDate(TEST_DATE, null)
  assert.deepEqual(await findTestRow(), [{ date: TEST_DATE, reason: null }])

  // Every date is a plain YYYY-MM-DD string, sorted ascending (Review Focus 1)
  const all = await listUnavailableDates()
  for (const row of all) {
    assert.equal(typeof row.date, 'string', `date should be a string, got ${typeof row.date}`)
    assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/)
  }
  const dates = all.map(r => r.date)
  assert.deepEqual(dates, [...dates].sort())

  // Delete, and deleting again is harmless
  await deleteUnavailableDate(TEST_DATE)
  assert.deepEqual(await findTestRow(), [])
  await deleteUnavailableDate(TEST_DATE)

  // Missing DATABASE_URL gives a clear error at call time (Review Focus 2)
  const saved = process.env.DATABASE_URL
  delete process.env.DATABASE_URL
  await assert.rejects(listUnavailableDates(), /DATABASE_URL is not set on the server/)
  process.env.DATABASE_URL = saved

  console.log('All Neon checks passed')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `npx tsx --env-file=.env.local scripts/verify-neon.ts`
Expected: FAIL — cannot find module `../src/lib/unavailableDatesDb`.

- [ ] **Step 5: Write the module**

Create `src/lib/unavailableDatesDb.ts`:

```ts
import { neon } from '@neondatabase/serverless'

// Server-only. DATABASE_URL grants full read/write access to the database, so
// this module must never be imported from a client component, and the variable
// must never be renamed with a NEXT_PUBLIC_ prefix.

export type UnavailableDate = { date: string; reason: string | null }

// Read the variable per call rather than at import time, so a missing value
// produces a clear 500 from the API route instead of breaking the build.
function getSql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set on the server')
  return neon(url)
}

export async function listUnavailableDates(): Promise<UnavailableDate[]> {
  const sql = getSql()
  // to_char rather than the raw DATE column: the driver can turn a DATE into a
  // JS Date at server-local midnight, and the server runs UTC while the club is
  // in Brisbane. A plain 'YYYY-MM-DD' string can't drift.
  const rows = await sql`
    SELECT to_char(date, 'YYYY-MM-DD') AS date, reason
    FROM unavailable_dates
    ORDER BY date ASC
  `
  return rows as UnavailableDate[]
}

// Upsert, not insert: re-marking an already-cancelled date updates the reason
// rather than failing on the primary key.
export async function upsertUnavailableDate(
  date: string,
  reason: string | null,
): Promise<void> {
  const sql = getSql()
  await sql`
    INSERT INTO unavailable_dates (date, reason)
    VALUES (${date}, ${reason})
    ON CONFLICT (date) DO UPDATE SET reason = EXCLUDED.reason
  `
}

export async function deleteUnavailableDate(date: string): Promise<void> {
  const sql = getSql()
  await sql`DELETE FROM unavailable_dates WHERE date = ${date}`
}
```

- [ ] **Step 6: Run the script to confirm it passes**

Run: `npx tsx --env-file=.env.local scripts/verify-neon.ts`
Expected: `All Neon checks passed`, exit code 0.

- [ ] **Step 7: Commit (not the throwaway script)**

```bash
git add neon-setup.sql src/lib/unavailableDatesDb.ts package.json package-lock.json
git commit -m "Add Neon schema and unavailable-dates database module

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Switch the API route to Neon and remove Supabase from the code

**Files:**
- Modify: `src/app/api/unavailable-dates/route.ts` (whole file — shown in full below)
- Delete: `src/lib/supabase.ts` (only importer is `route.ts`; the `Database` interface in it is unused)
- Modify: `package.json`, `package-lock.json` (uninstall `@supabase/supabase-js`)

**Interfaces:**
- Consumes: `listUnavailableDates`, `upsertUnavailableDate`, `deleteUnavailableDate` from `@/lib/unavailableDatesDb` (Task 1)
- Produces: unchanged HTTP API (see Global Constraints)

- [ ] **Step 1: Replace `src/app/api/unavailable-dates/route.ts` with:**

```ts
import { NextRequest, NextResponse } from 'next/server'
import {
  listUnavailableDates,
  upsertUnavailableDate,
  deleteUnavailableDate,
} from '@/lib/unavailableDatesDb'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'

function getAuthError(password: unknown): string | null {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return 'Admin authentication is not configured'
  if (typeof password !== 'string' || password !== adminPassword) {
    return 'Incorrect password'
  }
  return null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error'
}

// GET /api/unavailable-dates - fetch all unavailable dates
export async function GET() {
  try {
    const unavailableDates = await listUnavailableDates()

    // Convert to a map format for easy lookup: { "2025-12-25": "Christmas Day" }
    const dateMap: Record<string, string> = {}
    unavailableDates.forEach(item => {
      dateMap[item.date] = item.reason || 'This date is unavailable.'
    })

    return NextResponse.json({
      unavailableDates: dateMap,
      count: unavailableDates.length,
    })
  } catch (err) {
    console.error('Error fetching unavailable dates:', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// POST /api/unavailable-dates - mark a date as having no session
export async function POST(request: NextRequest) {
  try {
    const { date, reason, password } = await request.json()

    // Auth before validation, so an unauthenticated caller learns nothing
    // about what the endpoint accepts.
    const authError = getAuthError(password)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
      return NextResponse.json(
        { error: 'A date in YYYY-MM-DD format is required' },
        { status: 400 },
      )
    }

    const trimmed = typeof reason === 'string' ? reason.trim() : ''
    await upsertUnavailableDate(date, trimmed || null)

    return NextResponse.json({ success: true, date })
  } catch (err) {
    console.error('Error marking date unavailable:', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// DELETE /api/unavailable-dates - restore a date to a normal session
export async function DELETE(request: NextRequest) {
  try {
    const { date, password } = await request.json()

    const authError = getAuthError(password)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    if (typeof date !== 'string' || !DATE_PATTERN.test(date)) {
      return NextResponse.json(
        { error: 'A date in YYYY-MM-DD format is required' },
        { status: 400 },
      )
    }

    await deleteUnavailableDate(date)

    return NextResponse.json({ success: true, date })
  } catch (err) {
    console.error('Error restoring date:', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
```

- [ ] **Step 2: Remove the Supabase client and package**

```bash
git rm src/lib/supabase.ts
npm uninstall @supabase/supabase-js
```

Then confirm nothing else references it:

Run: `grep -rn "supabase" src`
Expected: no output.

- [ ] **Step 3: Build and lint**

Run: `npm run build`
Expected: build succeeds with no type errors.

Run: `npx eslint src`
Expected: no errors.

- [ ] **Step 4: Exercise the live API locally against Neon**

Start the dev server in the background: `npm run dev`. Then, with `PW` set to the `ADMIN_PASSWORD` value from `.env.local`:

```bash
PW=$(grep '^ADMIN_PASSWORD=' .env.local | cut -d= -f2-)
BASE=http://localhost:3000/api/unavailable-dates

# Read works and has the right shape
curl -s $BASE
# Expected: {"unavailableDates":{...},"count":N}

# Wrong password is rejected before anything is written
curl -s -X POST $BASE -H 'Content-Type: application/json' \
  -d '{"date":"2099-12-31","reason":"x","password":"wrong"}'
# Expected: {"error":"Incorrect password"}

# Blank reason falls back to the default text (Review Focus 4)
curl -s -X POST $BASE -H 'Content-Type: application/json' \
  -d "{\"date\":\"2099-12-31\",\"reason\":\"   \",\"password\":\"$PW\"}"
# Expected: {"success":true,"date":"2099-12-31"}
curl -s $BASE | grep -o '"2099-12-31":"[^"]*"'
# Expected: "2099-12-31":"This date is unavailable."

# Bad date format is rejected
curl -s -X POST $BASE -H 'Content-Type: application/json' \
  -d "{\"date\":\"31/12/2099\",\"password\":\"$PW\"}"
# Expected: {"error":"A date in YYYY-MM-DD format is required"}

# Restore cleans up
curl -s -X DELETE $BASE -H 'Content-Type: application/json' \
  -d "{\"date\":\"2099-12-31\",\"password\":\"$PW\"}"
# Expected: {"success":true,"date":"2099-12-31"}
curl -s $BASE | grep -c '2099-12-31'
# Expected: 0
```

Also open http://localhost:3000 → **Session Dates** tab and confirm the calendar loads with no red error. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add -A src package.json package-lock.json
git commit -m "Read and write session cancellations from Neon instead of Supabase

Supabase's free tier paused the project even while a twice-weekly
keep-awake ping was succeeding. Neon's free tier wakes automatically
on the next query, so nobody has to resume it by hand.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Remove the keep-awake workflow and update the docs

Neon wakes itself, so the workflow's purpose is gone (and GitHub disables it after 60 quiet days anyway).

**Files:**
- Delete: `.github/workflows/keep-supabase-awake.yml`
- Modify: `CLAUDE.md`, `DEPLOYMENT_GUIDE.md` (env var table ~lines 176–190, troubleshooting ~lines 205–225), `supabase-setup.sql` (header note only), `TROUBLESHOOTING.md` (one note at top), `CODE_REVIEW.md` (one note at top)

- [ ] **Step 1: Delete the workflow**

```bash
git rm .github/workflows/keep-supabase-awake.yml
```

- [ ] **Step 2: Update `CLAUDE.md`**

Make these edits:

- **Deployment → env vars:** replace the three Supabase bullets with:
  - `DATABASE_URL` — Neon Postgres connection string (pooled). Server-side only, used by `src/lib/unavailableDatesDb.ts`. **Must never carry a `NEXT_PUBLIC_` prefix**, which would ship full database write access to every browser. Also needed in `.env.local` for dev.
  - Keep the `ADMIN_PASSWORD` bullet unchanged.
- Replace the Supabase-pausing note with: "Neon's free plan suspends the database after a few minutes idle, but the next request wakes it automatically (the first request may take a second or two longer). No keep-awake job is needed. The project moved from Supabase on 2026-09-28 because Supabase's free tier kept pausing it and required a manual resume."
- **Architecture heading:** "Next.js 14 App Router + Neon Postgres."
- **Data flow:** client → API route → `src/lib/unavailableDatesDb.ts` → Neon. Keep both numbered consequences (force-dynamic; no localStorage fallback).
- **Database section:** schema lives in `neon-setup.sql`; only `unavailable_dates` exists. The old tables (`players`, `sessions`, `bookings`, `payments`, and `book_session_atomic`) exist only in the Supabase backup downloaded on 2026-09-28 and in `supabase-setup.sql` as historical reference. Replace the RLS paragraph with: "The browser never connects to the database; only the server holds `DATABASE_URL`, and every write to `/api/unavailable-dates` re-verifies `ADMIN_PASSWORD` first. Don't add any client-side database access."
- **Admin auth:** leave unchanged — the password check is exactly as before.
- **Timezone:** add one line: "Date columns are read with `to_char(date, 'YYYY-MM-DD')` so the driver never produces a JS `Date`."

- [ ] **Step 3: Update `DEPLOYMENT_GUIDE.md`**

In the environment variables table, replace the three Supabase rows with:

```markdown
| `DATABASE_URL` | Neon database connection (lets the server read and save cancellations) |
```

Replace the `SUPABASE_SERVICE_ROLE_KEY` warning paragraph with:

```markdown
⚠️ **`DATABASE_URL` must NOT start with `NEXT_PUBLIC_`.** Anything with that prefix is sent to
every visitor's browser, and this value gives full access to the database.

Get it from Neon → your project → **Connect** (with **Connection pooling** switched on) → copy
the string starting with `postgresql://`.
```

Replace the "SUPABASE_SERVICE_ROLE_KEY is not set" troubleshooting heading and steps with:

```markdown
### "Can't save a cancellation" / "DATABASE_URL is not set on the server"
1. In Vercel → **Settings** → **Environment Variables**, check `DATABASE_URL` exists
2. If you just added or changed it, redeploy: **Deployments** → latest → **⋯** → **Redeploy**
```

Replace the Supabase-pausing troubleshooting paragraph with:

```markdown
The database is hosted on Neon. On the free plan it goes to sleep when nobody is using it, and
wakes up by itself on the next visit — the first page load may take a second or two longer.
You never need to "resume" it. If the site says "Unable to load session dates" for more than a
few minutes, log in to https://console.neon.tech and check the project for warnings.
```

Change any remaining "Check Supabase dashboard" line to "Check the Neon dashboard (https://console.neon.tech)".

- [ ] **Step 4: Add historical notes**

At the very top of `supabase-setup.sql`:

```sql
-- HISTORICAL - NOT USED. The app moved to Neon on 2026-09-28; the live schema
-- is neon-setup.sql. Kept as a record of the booking-era tables.
```

At the top of `TROUBLESHOOTING.md` and `CODE_REVIEW.md` (below the first heading):

```markdown
> **Note (2026-09-28):** The app now uses Neon instead of Supabase, and the booking system has
> been removed. Supabase-specific sections below are historical. See `CLAUDE.md` for the current setup.
```

- [ ] **Step 5: Check nothing current still points at Supabase**

Run: `grep -rn -i "supabase" CLAUDE.md DEPLOYMENT_GUIDE.md src .github`
Expected: only the historical/move-note lines written above.

- [ ] **Step 6: Commit**

```bash
git add -A .github CLAUDE.md DEPLOYMENT_GUIDE.md supabase-setup.sql TROUBLESHOOTING.md CODE_REVIEW.md
git commit -m "Remove Supabase keep-awake workflow and document the Neon setup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Cutover — copy the data and go live (with Elyna)

This task changes the live site. Confirm with Elyna before starting, and do it at a quiet time (not Friday evening or Sunday afternoon).

**Files:**
- Create (throwaway, do not commit): `scripts/copy-from-supabase.ts`

- [ ] **Step 1: Freeze admin edits**

Ask Elyna to tell the other admins: *"Please don't add or remove any session cancellations for the next hour."* Confirm the Supabase project is resumed (Part A step 1) — run:

```bash
curl -s https://www.mareebabadminton.com.au/api/unavailable-dates
```

Expected: `{"unavailableDates":{...},"count":N}` — write down N.

- [ ] **Step 2: Write the copy script**

Create `scripts/copy-from-supabase.ts`. It reads Supabase over plain HTTP (the anon key has read access; `supabase-js` was removed in Task 2) and writes through the Task 1 module:

```ts
import assert from 'node:assert/strict'
import { listUnavailableDates, upsertUnavailableDate } from '../src/lib/unavailableDatesDb'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  assert.ok(url && key, 'Supabase URL and anon key must be in .env.local')

  const res = await fetch(
    `${url}/rest/v1/unavailable_dates?select=date,reason&order=date.asc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  )
  assert.ok(res.ok, `Supabase read failed: HTTP ${res.status}`)
  const source = (await res.json()) as { date: string; reason: string | null }[]
  console.log(`Read ${source.length} rows from Supabase`)

  for (const row of source) {
    await upsertUnavailableDate(row.date, row.reason)
  }

  // Neon must now contain exactly the Supabase rows (Review Focus 5)
  const copied = await listUnavailableDates()
  assert.deepEqual(copied, source)
  console.log(`Copied and verified ${copied.length} rows`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Run the copy**

Run: `npx tsx --env-file=.env.local scripts/copy-from-supabase.ts`
Expected: `Read N rows from Supabase` then `Copied and verified N rows`, where N matches Step 1.

If the deep-equal fails because Neon has extra rows (e.g. a leftover `2099-12-31` from testing), delete them in the Neon SQL Editor and re-run.

- [ ] **Step 4: Elyna adds `DATABASE_URL` to Vercel**

Give Elyna these steps:

1. Go to https://vercel.com → the mareeba-club project → **Settings** → **Environment Variables**.
2. **Key:** `DATABASE_URL` (exactly this — no `NEXT_PUBLIC_` in front).
3. **Value:** paste the Neon connection string from Part A step 6.
4. Tick **Production**, **Preview** and **Development**. Click **Save**.
5. **Leave the old Supabase variables in place for now** — they're the way back if something goes wrong.

- [ ] **Step 5: Merge and deploy**

```bash
git checkout main
git merge --no-ff move-to-neon -m "Merge move-to-neon: store cancellations in Neon instead of Supabase

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

Wait for the Vercel deploy to finish (1–2 minutes).

- [ ] **Step 6: Verify the live site**

```bash
curl -s https://www.mareebabadminton.com.au/api/unavailable-dates
```

Expected: HTTP 200 with the same `count` N and the same dates as Step 1.

Then have Elyna:
1. Open the site → **Session Dates** — no red error, cancelled dates still show as cancelled.
2. Go to `/admin`, log in, cancel a far-off date (e.g. a Friday in December 2027) with reason "test", check it appears on the calendar, then restore it.

- [ ] **Step 7: Unfreeze and tidy up**

1. Tell the admins they can edit cancellations again.
2. Delete the throwaway scripts: `rm -r scripts` (they were never committed).
3. **One week later**, if all is well, Elyna removes `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` from Vercel → Environment Variables, and the matching lines from `.env.local`. The Supabase project can then be left paused; the downloaded backup is the archive.

**Rollback (if Step 6 fails and can't be fixed quickly):**

```bash
git revert -m 1 HEAD
git push origin main
```

The old Supabase variables are still in Vercel, so the site goes back to reading Supabase (make sure the Supabase project is resumed). Any cancellation made after the cutover would need to be re-entered in `/admin`.
