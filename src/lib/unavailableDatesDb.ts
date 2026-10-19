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
