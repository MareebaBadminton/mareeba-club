# Session Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the booking system with a read-only session calendar plus an admin page for marking dates unavailable, so cancelling a session never requires a code change.

**Architecture:** Sessions are fixed in code (Friday, Sunday) and cancellations live in the existing `unavailable_dates` table. One `SessionCalendar` component serves both the public tab and the admin page, differing only by an optional `onDayClick` prop. Writes go through `/api/unavailable-dates` using the Supabase service-role key with the admin password verified per request; the table stays read-only to the public anon key.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, Supabase (`@supabase/supabase-js`).

**Spec:** `docs/superpowers/specs/2026-07-27-session-calendar-design.md`

## Global Constraints

- Every route under `src/app/api/` must export `export const dynamic = 'force-dynamic'`. Without it Vercel caches handler responses and admins see stale data. This is the most common bug class in this repo.
- Never use bare `Date` arithmetic or `toLocaleDateString()` without an explicit `timeZone`. The app serves Australia/Brisbane (UTC+10, no DST); Vercel runs UTC.
- Of the existing helpers in `dateUtils.ts`, use **only `getAustralianDateString()`**. `getAustralianDateTime()`, `getAustralianToday()`, and `toAustralianTime()` parse locale strings back into `Date` objects and yield server-local interpretations — do not build new logic on them.
- Client components never call Supabase directly. They go through `/api/*` routes.
- No localStorage fallback. Utils throw clear errors instead.
- Do not add public INSERT/DELETE policies to `unavailable_dates`. The anon key ships in the browser bundle.
- `npm run build` must be run with the existing `cross-env NODE_OPTIONS=--openssl-legacy-provider`; do not remove it.
- Fee copy, exactly: `$10 cash on the night`, `$8 by bank transfer`.
- Session times, exactly: Friday `7:45 PM – 9:45 PM`, Sunday `3:00 PM – 5:00 PM`.
- There is no test runner in this repo and this plan does not add one. Pure date logic is verified with a throwaway `npx tsx` script (no dependency added); everything else is verified via `npm run build`, `npm run lint`, and explicit browser checks.

## Prerequisites (outside the code — do these first)

- [ ] Restore the paused Supabase project. Nothing can be tested until the project hostname resolves again.
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` in Vercel (Supabase dashboard → Project Settings → API → `service_role`). It must **not** have a `NEXT_PUBLIC_` prefix. Redeploy once so it takes effect.
- [ ] Add the same key to `.env.local` for local development.

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/utils/sessionDates.ts` | **New.** Pure date logic: weekday classification, month grid, upcoming cancellations. No React, no fetch. |
| `src/lib/utils/unavailableDateUtils.ts` | **New.** Client-side fetch wrappers for the three API methods. |
| `src/app/api/unavailable-dates/route.ts` | **Modify.** Keep GET, add POST and DELETE. |
| `src/components/SessionCalendar.tsx` | **New.** Presentational month grid. Used by both public and admin. |
| `src/components/SessionDates.tsx` | **New.** Public tab: loads data, owns month state, renders `SessionCalendar`. |
| `src/components/AnnouncementPopup.tsx` | **Rewrite.** Database-driven instead of hardcoded. |
| `src/app/page.tsx` | **Modify.** Two tabs, Home copy updates, remove booking tabs. |
| `src/app/admin/page.tsx` | **Rewrite.** Password gate + calendar toggle + cancellation list. |

---

### Task 1: Session date helpers

Pure functions, no dependencies. This is the highest-risk code in the plan — a timezone slip here shows the wrong session days, which is the one thing the site exists to communicate.

**Files:**
- Create: `src/lib/utils/sessionDates.ts`
- Verify with: `check-dates.ts` at the repo root — throwaway, deleted in Step 3, never committed. It goes at the root (not the scratchpad) so the relative import resolves without path gymnastics.

**Interfaces:**
- Consumes: nothing.
- Produces: `SESSION_TIMES`, `SessionDay`, `DayCell`, `Cancellation`, `getWeekdayName(dateStr): string`, `getSessionDay(dateStr): SessionDay | null`, `addDays(dateStr, days): string`, `formatDisplayDate(dateStr): string`, `getMonthLabel(year, month): string`, `buildMonthGrid(year, month, todayStr, unavailableDates): DayCell[][]`, `getUpcomingCancellations(unavailableDates, todayStr, windowDays?): Cancellation[]`.

- [ ] **Step 1: Create the helper module**

```ts
// src/lib/utils/sessionDates.ts
// Session date helpers for Mareeba Badminton Club.
//
// Every date here is a plain 'YYYY-MM-DD' string, and all weekday maths anchors
// on noon UTC. Brisbane is UTC+10 with no DST, so noon UTC is always the same
// calendar day in Brisbane - that removes any chance of a day-boundary slip when
// this runs on Vercel (UTC) instead of locally.

const AUSTRALIAN_TIMEZONE = 'Australia/Brisbane'

export const SESSION_TIMES = {
  friday: { label: 'Friday', time: '7:45 PM – 9:45 PM' },
  sunday: { label: 'Sunday', time: '3:00 PM – 5:00 PM' },
} as const

export type SessionDay = keyof typeof SESSION_TIMES

export interface DayCell {
  date: string | null // null for leading/trailing padding cells
  dayOfMonth: number | null
  session: SessionDay | null
  isCancelled: boolean
  reason: string | null
  isPast: boolean
  isToday: boolean
}

export interface Cancellation {
  date: string
  reason: string
}

const WEEKDAYS_MONDAY_FIRST = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
]

const pad = (n: number) => String(n).padStart(2, '0')

function atNoonUTC(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00Z`)
}

export function getWeekdayName(dateStr: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    timeZone: AUSTRALIAN_TIMEZONE,
  }).format(atNoonUTC(dateStr))
}

export function getSessionDay(dateStr: string): SessionDay | null {
  const weekday = getWeekdayName(dateStr)
  if (weekday === 'Friday') return 'friday'
  if (weekday === 'Sunday') return 'sunday'
  return null
}

export function addDays(dateStr: string, days: number): string {
  const d = atNoonUTC(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDisplayDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: AUSTRALIAN_TIMEZONE,
  }).format(atNoonUTC(dateStr))
}

export function getMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-AU', {
    month: 'long',
    year: 'numeric',
    timeZone: AUSTRALIAN_TIMEZONE,
  }).format(atNoonUTC(`${year}-${pad(month)}-01`))
}

const emptyCell = (): DayCell => ({
  date: null,
  dayOfMonth: null,
  session: null,
  isCancelled: false,
  reason: null,
  isPast: false,
  isToday: false,
})

/**
 * Build a Monday-first month grid.
 * @param month 1-12 (not zero-based)
 */
export function buildMonthGrid(
  year: number,
  month: number,
  todayStr: string,
  unavailableDates: Record<string, string> = {},
): DayCell[][] {
  // Date.UTC with day 0 of the *next* month gives the last day of this one.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const firstColumn = WEEKDAYS_MONDAY_FIRST.indexOf(
    getWeekdayName(`${year}-${pad(month)}-01`),
  )

  const cells: DayCell[] = []
  for (let i = 0; i < firstColumn; i++) cells.push(emptyCell())

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${pad(month)}-${pad(day)}`
    const reason = unavailableDates[date] ?? null
    cells.push({
      date,
      dayOfMonth: day,
      session: getSessionDay(date),
      isCancelled: reason !== null,
      reason,
      // 'YYYY-MM-DD' strings compare correctly with < and ===
      isPast: date < todayStr,
      isToday: date === todayStr,
    })
  }

  while (cells.length % 7 !== 0) cells.push(emptyCell())

  const weeks: DayCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function getUpcomingCancellations(
  unavailableDates: Record<string, string>,
  todayStr: string,
  windowDays = 14,
): Cancellation[] {
  const limit = addDays(todayStr, windowDays)
  return Object.entries(unavailableDates)
    .filter(([date]) => date >= todayStr && date <= limit)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, reason]) => ({ date, reason }))
}
```

- [ ] **Step 2: Write the verification script**

Write it to `C:\mareeba-club\check-dates.ts`:

```ts
// check-dates.ts - throwaway, deleted at the end of this task
import {
  getSessionDay, addDays, buildMonthGrid, getUpcomingCancellations, getMonthLabel,
} from './src/lib/utils/sessionDates'

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) {
    failures++
    console.log(`FAIL ${label}\n  expected ${e}\n  actual   ${a}`)
  } else {
    console.log(`ok   ${label}`)
  }
}

// 31 Jul 2026 is a Friday (confirmed by the popup copy this replaces)
check('31 Jul 2026 is a friday session', getSessionDay('2026-07-31'), 'friday')
check('2 Aug 2026 is a sunday session', getSessionDay('2026-08-02'), 'sunday')
check('27 Jul 2026 (Mon) is not a session', getSessionDay('2026-07-27'), null)

// Month rollover must not drift
check('addDays across month end', addDays('2026-07-31', 1), '2026-08-01')
check('addDays across year end', addDays('2026-12-31', 1), '2027-01-01')
check('addDays 14 day window', addDays('2026-07-27', 14), '2026-08-10')

// Aug 2026 starts on a Saturday, so 5 padding cells then 1, 2
const aug = buildMonthGrid(2026, 8, '2026-07-27', { '2026-08-21': 'hall booked' })
check('first week is padded to Saturday', aug[0].map(c => c.dayOfMonth),
  [null, null, null, null, null, 1, 2])
check('every week has 7 cells', aug.every(w => w.length === 7), true)
check('21 Aug is flagged cancelled',
  aug.flat().find(c => c.date === '2026-08-21')?.isCancelled, true)
check('7 Aug is a friday session',
  aug.flat().find(c => c.date === '2026-08-07')?.session, 'friday')
check('month label', getMonthLabel(2026, 8), 'August 2026')

// Feb in a leap year, and a month starting on Monday
check('Feb 2028 has 29 days',
  buildMonthGrid(2028, 2, '2026-07-27').flat().filter(c => c.date).length, 29)

// Window filtering
const upcoming = getUpcomingCancellations(
  { '2026-07-20': 'past', '2026-07-31': 'hall booked', '2026-09-01': 'too far' },
  '2026-07-27',
)
check('only in-window cancellations', upcoming, [{ date: '2026-07-31', reason: 'hall booked' }])

console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED`)
process.exit(failures === 0 ? 0 : 1)
```

- [ ] **Step 3: Run it and confirm it reports ALL PASSED**

Run: `npx tsx check-dates.ts` from the repo root. `npx` fetches `tsx` transiently, so nothing is added to `package.json`.

Expected: every line prefixed `ok`, then `ALL PASSED`.

Read the actual output rather than relying on the exit code. If any line says FAIL, fix `sessionDates.ts` — **do not adjust the expected values.** They were derived from the existing popup copy (`31/7/2026 (Fri)`), so they are known-good anchors; changing them to match broken code would defeat the point of the check.

Then delete the script:

```bash
rm check-dates.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/sessionDates.ts
git commit -m "feat: add session date helpers for calendar"
```

---

### Task 2: Write endpoints for unavailable dates

**Files:**
- Modify: `src/app/api/unavailable-dates/route.ts` (keep the existing GET at lines 8-34 unchanged)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `POST /api/unavailable-dates` accepting `{ date, reason, password }`; `DELETE /api/unavailable-dates` accepting `{ date, password }`. Both return `{ success: true, date }` or `{ error: string }`.

- [ ] **Step 1: Add the service-role client and password check above the existing GET**

Keep the existing imports and `export const dynamic = 'force-dynamic'`. Add:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service-role client bypasses RLS, which is what lets admin writes work while
// unavailable_dates stays read-only to the public anon key. Unlike
// setup-sessions/route.ts this deliberately does NOT fall back to the anon key:
// a silent fallback would just produce confusing RLS errors at write time.
function getAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
}

function getAuthError(password: unknown): string | null {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) return 'Admin authentication is not configured'
  if (typeof password !== 'string' || password !== adminPassword) {
    return 'Incorrect password'
  }
  return null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
```

- [ ] **Step 2: Add POST**

```ts
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

    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server' },
        { status: 500 },
      )
    }

    const trimmed = typeof reason === 'string' ? reason.trim() : ''

    // upsert, not insert: `date` is UNIQUE, and re-marking an already-marked
    // date should update the reason rather than fail.
    const { error } = await admin
      .from('unavailable_dates')
      .upsert({ date, reason: trimmed || null }, { onConflict: 'date' })

    if (error) {
      console.error('Error marking date unavailable:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, date })
  } catch (err: any) {
    console.error('Unexpected error marking date unavailable:', err)
    return NextResponse.json(
      { error: err.message || 'Unexpected error' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 3: Add DELETE**

```ts
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

    const admin = getAdminClient()
    if (!admin) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY is not set on the server' },
        { status: 500 },
      )
    }

    const { error } = await admin
      .from('unavailable_dates')
      .delete()
      .eq('date', date)

    if (error) {
      console.error('Error restoring date:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, date })
  } catch (err: any) {
    console.error('Unexpected error restoring date:', err)
    return NextResponse.json(
      { error: err.message || 'Unexpected error' },
      { status: 500 },
    )
  }
}
```

- [ ] **Step 4: Verify auth is actually enforced**

Start the dev server (`npm run dev`), then from a second terminal:

```bash
# Wrong password -> must be 401, and the date must NOT appear in GET afterwards
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/unavailable-dates \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-21","reason":"test","password":"wrong"}'

# No password at all -> must be 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/unavailable-dates \
  -H "Content-Type: application/json" -d '{"date":"2026-08-21"}'

# Correct password -> 200
curl -s -X POST http://localhost:3000/api/unavailable-dates \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-21","reason":"plan test","password":"<ADMIN_PASSWORD>"}'

# Confirm it landed
curl -s http://localhost:3000/api/unavailable-dates

# Clean the test row back out
curl -s -X DELETE http://localhost:3000/api/unavailable-dates \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-08-21","password":"<ADMIN_PASSWORD>"}'
```

Expected: `401`, `401`, then `{"success":true,...}`. The GET must show `2026-08-21` only after the authorised call, and not after the DELETE.

Do not proceed until the two 401s are confirmed. If a wrong password writes successfully, the endpoint is unprotected.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/unavailable-dates/route.ts
git commit -m "feat: add authenticated write endpoints for unavailable dates"
```

---

### Task 3: Client fetch wrappers

**Files:**
- Create: `src/lib/utils/unavailableDateUtils.ts`

**Interfaces:**
- Consumes: the endpoints from Task 2.
- Produces: `fetchUnavailableDates(): Promise<Record<string, string>>`, `markDateUnavailable(date, reason, password): Promise<void>`, `restoreDate(date, password): Promise<void>`.

- [ ] **Step 1: Create the module**

```ts
// src/lib/utils/unavailableDateUtils.ts
// Client-side wrappers for /api/unavailable-dates.
// These throw on failure by design - no localStorage fallback, because a stale
// cache here would tell players a cancelled session is running.

export async function fetchUnavailableDates(): Promise<Record<string, string>> {
  const response = await fetch('/api/unavailable-dates', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Unable to load session dates. Please check your connection and try again.')
  }
  const data = await response.json()
  return data.unavailableDates ?? {}
}

async function write(
  method: 'POST' | 'DELETE',
  body: Record<string, unknown>,
): Promise<void> {
  const response = await fetch('/api/unavailable-dates', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Request failed. Please try again.')
  }
}

export async function markDateUnavailable(
  date: string,
  reason: string,
  password: string,
): Promise<void> {
  await write('POST', { date, reason, password })
}

export async function restoreDate(date: string, password: string): Promise<void> {
  await write('DELETE', { date, password })
}
```

- [ ] **Step 2: Confirm it compiles**

Run: `npm run lint`
Expected: no errors for the new file.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/unavailableDateUtils.ts
git commit -m "feat: add client wrappers for unavailable date API"
```

---

### Task 4: SessionCalendar component

Presentational only — no data fetching, no month state. Both the public tab and the admin page render this, which is why `onDayClick` is optional rather than there being two components.

**Files:**
- Create: `src/components/SessionCalendar.tsx`

**Interfaces:**
- Consumes: `buildMonthGrid`, `getMonthLabel`, `SESSION_TIMES`, `DayCell` from Task 1.
- Produces: default export `SessionCalendar` with props `{ year, month, todayStr, unavailableDates, onMonthChange, onDayClick?, selectedDate? }`.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import {
  buildMonthGrid,
  getMonthLabel,
  SESSION_TIMES,
  type DayCell,
} from '@/lib/utils/sessionDates'

interface SessionCalendarProps {
  year: number
  month: number // 1-12
  todayStr: string
  unavailableDates: Record<string, string>
  onMonthChange: (year: number, month: number) => void
  /** When provided, session days become clickable (admin mode). */
  onDayClick?: (cell: DayCell) => void
  selectedDate?: string | null
}

const COLUMN_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function shiftMonth(year: number, month: number, delta: number) {
  const zeroBased = month - 1 + delta
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  }
}

export default function SessionCalendar({
  year,
  month,
  todayStr,
  unavailableDates,
  onMonthChange,
  onDayClick,
  selectedDate,
}: SessionCalendarProps) {
  const weeks = buildMonthGrid(year, month, todayStr, unavailableDates)

  const go = (delta: number) => {
    const next = shiftMonth(year, month, delta)
    onMonthChange(next.year, next.month)
  }

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => go(-1)}
          className="px-3 py-2 text-sm sm:text-base text-blue-600 hover:bg-blue-50 rounded-md font-medium"
          aria-label="Previous month"
        >
          ‹ Prev
        </button>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
          {getMonthLabel(year, month)}
        </h3>
        <button
          onClick={() => go(1)}
          className="px-3 py-2 text-sm sm:text-base text-blue-600 hover:bg-blue-50 rounded-md font-medium"
          aria-label="Next month"
        >
          Next ›
        </button>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {COLUMN_LABELS.map((label) => (
          <div key={label} className="text-center text-xs sm:text-sm font-semibold text-gray-500 py-1">
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((cell, index) => {
          if (!cell.date) return <div key={`pad-${index}`} />

          const isSession = cell.session !== null
          const clickable = Boolean(onDayClick) && isSession
          const isSelected = selectedDate === cell.date

          let tone = 'text-gray-400'
          if (isSession && cell.isCancelled) tone = 'bg-red-50 text-red-700 line-through'
          else if (isSession) tone = 'bg-green-50 text-green-800 font-semibold'

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!clickable}
              onClick={() => onDayClick?.(cell)}
              title={cell.reason ?? undefined}
              className={[
                'aspect-square rounded-md text-xs sm:text-sm flex flex-col items-center justify-center',
                tone,
                cell.isToday ? 'ring-2 ring-blue-500' : '',
                cell.isPast ? 'opacity-50' : '',
                isSelected ? 'ring-2 ring-orange-500' : '',
                clickable ? 'cursor-pointer hover:brightness-95' : 'cursor-default',
              ].join(' ')}
            >
              <span>{cell.dayOfMonth}</span>
              {isSession && !cell.isCancelled && (
                <span className="hidden sm:block text-[10px] leading-tight">
                  {SESSION_TIMES[cell.session!].time.split(' – ')[0]}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-green-50 border border-green-200 inline-block" />
          Session on
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-4 rounded bg-red-50 border border-red-200 inline-block" />
          Cancelled
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SessionCalendar.tsx
git commit -m "feat: add SessionCalendar month grid component"
```

---

### Task 5: Public Session Dates tab

**Files:**
- Create: `src/components/SessionDates.tsx`

**Interfaces:**
- Consumes: `SessionCalendar` (Task 4), `fetchUnavailableDates` (Task 3), `SESSION_TIMES`, `formatDisplayDate` (Task 1), `getAustralianDateString` from `dateUtils`.
- Produces: default export `SessionDates`, no props.

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState, useEffect } from 'react'
import SessionCalendar from './SessionCalendar'
import { fetchUnavailableDates } from '@/lib/utils/unavailableDateUtils'
import { SESSION_TIMES, formatDisplayDate, type DayCell } from '@/lib/utils/sessionDates'
import { getAustralianDateString } from '@/lib/utils/dateUtils'

export default function SessionDates() {
  const todayStr = getAustralianDateString()
  const [year, setYear] = useState(Number(todayStr.slice(0, 4)))
  const [month, setMonth] = useState(Number(todayStr.slice(5, 7)))
  const [unavailableDates, setUnavailableDates] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<DayCell | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUnavailableDates()
      .then(setUnavailableDates)
      .catch((err: Error) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm sm:text-base">
          {error}
        </div>
      )}

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-gray-800">
        <p className="font-bold mb-1">Regular sessions</p>
        <ul className="list-disc list-inside ml-2 space-y-1 text-sm sm:text-base">
          <li>{SESSION_TIMES.friday.label}: {SESSION_TIMES.friday.time}</li>
          <li>{SESSION_TIMES.sunday.label}: {SESSION_TIMES.sunday.time}</li>
        </ul>
      </div>

      {isLoading ? (
        <p className="text-gray-500 py-8 text-center">Loading session dates…</p>
      ) : (
        <SessionCalendar
          year={year}
          month={month}
          todayStr={todayStr}
          unavailableDates={unavailableDates}
          selectedDate={selected?.date ?? null}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); setSelected(null) }}
          onDayClick={(cell) => setSelected(cell.isCancelled ? cell : null)}
        />
      )}

      {selected?.isCancelled && selected.date && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="font-semibold text-red-700">
            No session on {formatDisplayDate(selected.date)}
          </p>
          <p className="text-sm text-red-600 mt-1">{selected.reason}</p>
        </div>
      )}
    </div>
  )
}
```

Note `onDayClick` is passed here even though this is the public view — it only reveals the cancellation reason and never writes. Admin mode is distinguished by what its handler does, not by the prop's presence.

- [ ] **Step 2: Commit**

```bash
git add src/components/SessionDates.tsx
git commit -m "feat: add public session dates tab"
```

---

### Task 6: Database-driven announcement popup

**Files:**
- Rewrite: `src/components/AnnouncementPopup.tsx` (replaces the hardcoded dates at line 38 and the cutoff at line 12)

**Interfaces:**
- Consumes: `fetchUnavailableDates` (Task 3), `getUpcomingCancellations`, `formatDisplayDate` (Task 1), `getAustralianDateString`.
- Produces: default export `AnnouncementPopup`, no props. **The `isVisible`/`onClose` props are removed** — it now owns its own state, so `page.tsx` no longer manages it.

- [ ] **Step 1: Replace the file entirely**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { fetchUnavailableDates } from '@/lib/utils/unavailableDateUtils'
import {
  getUpcomingCancellations,
  formatDisplayDate,
  type Cancellation,
} from '@/lib/utils/sessionDates'
import { getAustralianDateString } from '@/lib/utils/dateUtils'

const WINDOW_DAYS = 14

export default function AnnouncementPopup() {
  const [cancellations, setCancellations] = useState<Cancellation[]>([])
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Silently ignore failures: a popup that can't load its data should simply
    // not appear, rather than pushing an error at a visitor who didn't ask.
    fetchUnavailableDates()
      .then((dates) =>
        setCancellations(
          getUpcomingCancellations(dates, getAustralianDateString(), WINDOW_DAYS),
        ),
      )
      .catch(() => setCancellations([]))
  }, [])

  if (isDismissed || cancellations.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <div className="relative mb-4">
            <h2 className="text-xl font-bold text-red-600 text-center">IMPORTANT NOTIFICATION</h2>
            <button
              onClick={() => setIsDismissed(true)}
              className="absolute top-0 right-0 text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>

          <div className="text-gray-800 space-y-3">
            <p className="font-semibold text-center">📅 <strong>No sessions on:</strong></p>
            <div className="text-center space-y-2">
              {cancellations.map(({ date, reason }) => (
                <div key={date}>
                  <p className="font-medium">{formatDisplayDate(date)}</p>
                  <p className="text-sm text-gray-600">{reason}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-600 mt-4">Thank you for your understanding! 🙏</p>
          </div>

          <div className="flex justify-center mt-6">
            <button
              onClick={() => setIsDismissed(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AnnouncementPopup.tsx
git commit -m "feat: drive announcement popup from database instead of hardcoded dates"
```

---

### Task 7: Restructure page.tsx

Two tabs, Home first. Booking tabs and their imports go. Home copy updated.

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `SessionDates` (Task 5), `AnnouncementPopup` (Task 6, now propless), `ImageSlideshow` (unchanged).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Replace the imports and top-of-component state**

Remove the imports of `RegisterForm`, `BookingForm`, `BookingLookup`, and `FindPlayerID`. Add `SessionDates`. Delete the `showAnnouncement` state, the `useEffect` that sets it, and `handleCloseAnnouncement` — the popup manages itself now.

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'

import SessionDates from '@/components/SessionDates'
import ImageSlideshow from '@/components/ImageSlideshow'
import AnnouncementPopup from '@/components/AnnouncementPopup'

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')

  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'dates', label: 'Session Dates' },
  ]
```

- [ ] **Step 2: Update the popup usage and the nav grid**

Replace `<AnnouncementPopup isVisible={...} onClose={...} />` with `<AnnouncementPopup />`.

Change the nav from `grid-cols-5` to `grid-cols-2` (was `page.tsx:62`). Leave the rest of the nav markup as it is.

- [ ] **Step 3: Update the Home fees block**

Replace the fees list (was `page.tsx:108-114`):

```tsx
<div>
  <p className="font-bold mb-1">💰 Fees:</p>
  <ul className="list-disc list-inside ml-4 space-y-1">
    <li>$10 cash on the night</li>
    <li>$8 by bank transfer</li>
  </ul>
</div>
```

- [ ] **Step 4: Update the intro line that mentions booking**

Replace the "Register and book online" paragraph (was `page.tsx:106`):

```tsx
<p>🏸 <strong>No booking needed</strong> — just turn up and play. Check the
  <strong> Session Dates</strong> tab to confirm a session is running.</p>
```

- [ ] **Step 5: Replace the payment instructions block**

Replace the whole block (was `page.tsx:158-171`). Bank details are unchanged; the "book first" heading, the single amount line, and both description/reference lines are gone.

```tsx
<div className="mb-8 sm:mb-10">
  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">💳 Payment Details</h3>
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 sm:p-6 text-gray-800 text-sm sm:text-base space-y-1">
    <p className="font-bold text-lg sm:text-xl mb-3">Pay $8 by bank transfer, or $10 cash on the night.</p>
    <p>🏷️ <span className="font-medium">Name:</span> Mareeba&nbsp;Badminton</p>
    <p>🏦 <span className="font-medium">BSB:</span> 633-000</p>
    <p>🏛️ <span className="font-medium">Account:</span> 225&nbsp;395&nbsp;003</p>
    <p>OR</p>
    <p>💳 <span className="font-medium">PayID&nbsp;(ABN):</span> 61&nbsp;470&nbsp;216&nbsp;342</p>
  </div>
</div>
```

- [ ] **Step 6: Delete three whole blocks from Home**

- The "How to Register" section (was `page.tsx:133-155`) — registration no longer exists.
- The "Quick Tips" section (was `page.tsx:174-192`) — all three tips reference Find your ID, Find Booking, or payment references.
- The Register, Book Session, Find Booking, and Find your ID tab blocks (was `page.tsx:220-250`).

- [ ] **Step 7: Add the Session Dates tab block**

Place it after the Home tab block:

```tsx
{/* Session Dates Tab */}
{activeTab === 'dates' && (
  <div>
    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
      Session Dates
    </h2>
    <SessionDates />
  </div>
)}
```

- [ ] **Step 8: Verify the build and check the page**

Run: `npm run build`
Expected: success. Any "module not found" here means a booking import was missed.

Run: `npm run dev`, open `http://localhost:3000` and confirm:
- Two tabs only, Home selected
- Fees read `$10 cash on the night` / `$8 by bank transfer`
- No "How to Register" or "Quick Tips" sections
- Session Dates tab shows the current month with Fridays and Sundays highlighted
- Month navigation moves forward and back, including across a year boundary

- [ ] **Step 9: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: replace booking tabs with session dates calendar"
```

---

### Task 8: Admin page

**Files:**
- Rewrite: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `SessionCalendar` (Task 4), all three functions from Task 3, `formatDisplayDate`/`getUpcomingCancellations`/`DayCell` (Task 1), `getAustralianDateString`.
- Produces: nothing.

- [ ] **Step 1: Replace the file entirely**

The existing content goes: it reads localStorage counts that are always zero and offers a migration `CLAUDE.md` records as abandoned.

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import SessionCalendar from '@/components/SessionCalendar'
import {
  fetchUnavailableDates,
  markDateUnavailable,
  restoreDate,
} from '@/lib/utils/unavailableDateUtils'
import { formatDisplayDate, type DayCell } from '@/lib/utils/sessionDates'
import { getAustralianDateString } from '@/lib/utils/dateUtils'

export default function AdminPage() {
  const todayStr = getAustralianDateString()

  const [password, setPassword] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [year, setYear] = useState(Number(todayStr.slice(0, 4)))
  const [month, setMonth] = useState(Number(todayStr.slice(5, 7)))
  const [unavailableDates, setUnavailableDates] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<DayCell | null>(null)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      setUnavailableDates(await fetchUnavailableDates())
    } catch (err) {
      setMessage(`❌ ${(err as Error).message}`)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        setMessage(`❌ ${data.error || 'Incorrect password'}`)
        return
      }
      // Held in state so it can accompany each write. Every write is
      // re-verified server-side; this flag only controls the UI.
      setPassword(passwordInput)
      setIsAuthed(true)
      setPasswordInput('')
    } catch {
      setMessage('❌ Could not reach the server. Please try again.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleCancel = async () => {
    if (!selected?.date) return
    setIsBusy(true)
    setMessage('')
    try {
      await markDateUnavailable(selected.date, reason, password)
      setMessage(`✅ ${formatDisplayDate(selected.date)} marked as no session.`)
      setReason('')
      setSelected(null)
      await reload()
    } catch (err) {
      setMessage(`❌ ${(err as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const handleRestore = async (date: string) => {
    setIsBusy(true)
    setMessage('')
    try {
      await restoreDate(date, password)
      setMessage(`✅ ${formatDisplayDate(date)} restored to a normal session.`)
      setSelected(null)
      await reload()
    } catch (err) {
      setMessage(`❌ ${(err as Error).message}`)
    } finally {
      setIsBusy(false)
    }
  }

  const upcoming = Object.entries(unavailableDates)
    .filter(([date]) => date >= todayStr)
    .sort(([a], [b]) => a.localeCompare(b))

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <form onSubmit={handleLogin} className="max-w-sm mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Admin Login</h1>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Admin password"
            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 text-gray-900"
            autoFocus
          />
          <button
            type="submit"
            disabled={isBusy || !passwordInput}
            className="w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isBusy ? 'Checking…' : 'Log in'}
          </button>
          {message && <p className="mt-4 text-sm">{message}</p>}
          <a href="/" className="block mt-6 text-center text-blue-600 hover:text-blue-800 underline text-sm">
            ← Back to main site
          </a>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Manage Session Dates</h1>
        <p className="text-sm text-gray-600 mb-6">
          Click a Friday or Sunday to mark it as having no session. Changes appear on the
          public site immediately.
        </p>

        {message && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            {message}
          </div>
        )}

        <SessionCalendar
          year={year}
          month={month}
          todayStr={todayStr}
          unavailableDates={unavailableDates}
          selectedDate={selected?.date ?? null}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); setSelected(null) }}
          onDayClick={(cell) => { setSelected(cell); setReason(cell.reason ?? '') }}
        />

        {selected?.date && (
          <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <p className="font-semibold text-gray-900 mb-3">
              {formatDisplayDate(selected.date)}
            </p>
            {selected.isCancelled ? (
              <button
                onClick={() => handleRestore(selected.date!)}
                disabled={isBusy}
                className="w-full bg-green-600 text-white py-2 rounded-md font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {isBusy ? 'Working…' : 'Restore this session'}
              </button>
            ) : (
              <>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (optional), e.g. hall booked out"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mb-3 text-gray-900"
                />
                <button
                  onClick={handleCancel}
                  disabled={isBusy}
                  className="w-full bg-red-600 text-white py-2 rounded-md font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {isBusy ? 'Working…' : 'Mark as no session'}
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Upcoming cancellations</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500">None — all sessions are running.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map(([date, storedReason]) => (
                <li key={date} className="flex items-center justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="min-w-0">
                    <p className="font-medium text-red-700 text-sm">{formatDisplayDate(date)}</p>
                    <p className="text-xs text-red-600 truncate">{storedReason}</p>
                  </div>
                  <button
                    onClick={() => handleRestore(date)}
                    disabled={isBusy}
                    className="text-sm text-blue-600 hover:text-blue-800 underline whitespace-nowrap disabled:opacity-50"
                  >
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <a href="/" className="block mt-8 text-center text-blue-600 hover:text-blue-800 underline text-sm">
          ← Back to main site
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify end to end in the browser**

Run `npm run dev`, then at `http://localhost:3000/admin`:

- A wrong password shows an error and does not reveal the calendar
- The correct password reveals the calendar
- Clicking the next upcoming Friday, typing a reason, and saving shows a success message
- That date turns red and appears under "Upcoming cancellations"
- Opening `/` shows the popup listing that date with its reason, and the Session Dates tab shows it struck out
- Clicking "Restore" removes it from both the calendar and the popup
- Clicking a Monday does nothing (only session days are clickable)

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: replace admin page with session date management"
```

---

### Task 9: Remove the booking system

Do this last, so the site is never in a state where booking is gone and the calendar isn't ready.

**Files:** deletions across `src/components/`, `src/lib/utils/`, `src/app/api/`, plus `package.json`.

- [ ] **Step 1: Confirm each file is genuinely unreferenced before deleting it**

Do not trust the list below — verify. For each candidate, search for imports of it:

```bash
git grep -n "RegisterForm\|BookingForm\|BookingLookup\|FindPlayerID\|ProfileUpdate\|SessionPlayerList\|NextSessionPlayers\|RegistrationReminderModal\|PaymentTracker" -- src
git grep -n "bookingUtils\|playerUtils\|paymentUtils\|utils/storage\|migrate-to-supabase" -- src
git grep -n "HomeSection\|components/Footer\|components/Logo" -- src
```

Anything still referenced must have its referencing code removed first. `HomeSection`, `Footer`, and `Logo` may already be orphaned from before this work — if so, note them but leave them alone; removing pre-existing dead code is not part of this task.

- [ ] **Step 2: Delete the booking components and page**

```bash
git rm src/components/RegisterForm.tsx \
       src/components/BookingForm.tsx \
       src/components/BookingLookup.tsx \
       src/components/FindPlayerID.tsx \
       src/components/ProfileUpdate.tsx \
       src/components/SessionPlayerList.tsx \
       src/components/NextSessionPlayers.tsx \
       src/components/RegistrationReminderModal.tsx \
       src/components/PaymentTracker.tsx
git rm -r src/app/payments
```

- [ ] **Step 3: Delete the booking utils**

```bash
git rm src/lib/utils/bookingUtils.ts \
       src/lib/utils/playerUtils.ts \
       src/lib/utils/paymentUtils.ts \
       src/lib/utils/storage.ts \
       src/lib/migrate-to-supabase.ts
```

Then delete `generatePaymentReference()` from `src/lib/utils/dateUtils.ts` (was lines 62-70). Leave every other export in that file — `getAustralianDateString()` is used by three of the new components.

- [ ] **Step 4: Delete the booking API routes**

```bash
git rm -r src/app/api/bookings \
          src/app/api/players \
          src/app/api/sessions \
          src/app/api/sync-players \
          src/app/api/setup-sessions \
          src/app/api/send-player-id \
          src/app/api/test-email
```

Keep `src/app/api/unavailable-dates` and `src/app/api/admin/login`.

- [ ] **Step 5: Remove the nodemailer dependency**

Only `send-player-id` and `test-email` used it, and both are now gone.

```bash
npm uninstall nodemailer @types/nodemailer
```

- [ ] **Step 6: Verify nothing broke**

```bash
npm run build
npm run lint
```

Expected: both succeed. A "module not found" means something still imports a deleted file — fix the importer rather than restoring the file.

Then run `npm run dev` and re-check: Home renders, Session Dates renders, `/admin` logs in and toggles a date, and `/payments` now returns 404.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove booking system, registration, and payment tracking"
```

---

### Task 10: Update project documentation

The repo's docs describe a booking app that no longer exists. Leaving them is worse than having no docs, because the next person will trust them.

**Files:**
- Modify: `CLAUDE.md`, `DEPLOYMENT_GUIDE.md`, `supabase-setup.sql`

- [ ] **Step 1: Update `CLAUDE.md`**

- Architecture section: the SPA now switches between Home and Session Dates only; `/admin` remains a separate route and `/payments` is gone.
- Remove references to `bookingUtils.ts`, `playerUtils.ts`, `paymentUtils.ts`.
- Database section: note that `players`, `bookings`, and `payments` still exist but are no longer read or written by the app, and that `book_session_atomic` is retained but unused.
- Note that `unavailable_dates` is now managed from `/admin`, not the Supabase Table Editor.
- Add `SUPABASE_SERVICE_ROLE_KEY` to the required environment variables.

- [ ] **Step 2: Update `DEPLOYMENT_GUIDE.md`**

Replace the "manage unavailable dates in the Supabase Table Editor" instructions with the `/admin` flow: log in, click a Friday or Sunday, add an optional reason, save. No deploy required. Add `SUPABASE_SERVICE_ROLE_KEY` to the environment variable list, flagging that it must not be `NEXT_PUBLIC_`.

Note: this file already has uncommitted changes in the working tree. Review them before committing so unrelated edits are not bundled in silently.

- [ ] **Step 3: Reconcile the `supabase-setup.sql` drift**

The live database has `Allow public insert on sessions` and `Allow public update on sessions`, but the file defines only SELECT for `sessions` (line 71). Add the two missing policies so a rebuild from this file reproduces the actual database.

Also add a comment above the `unavailable_dates` policies (line 95) recording that the read-only policy is deliberate, and that writes go through the service-role key in `/api/unavailable-dates` — so nobody "helpfully" adds a public write policy later.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md DEPLOYMENT_GUIDE.md supabase-setup.sql
git commit -m "docs: update guides for session calendar replacing booking system"
```

---

## Final Verification

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `npx tsx <scratchpad>/check-dates.ts` reports ALL PASSED
- [ ] POST and DELETE with a wrong password both return 401 and change nothing
- [ ] Marking a date in `/admin` updates the public calendar and popup on the next load
- [ ] A cancellation dated in the past does not appear in the popup
- [ ] Month navigation crosses both a year boundary and a leap-year February correctly
- [ ] `/payments` returns 404
- [ ] Load the site after 10pm Brisbane time and confirm the Friday/Sunday highlighting has not shifted a day — this is the repo's most common bug class and the one thing a passing build cannot catch
