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
