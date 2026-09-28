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
