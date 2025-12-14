import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ✅ Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'

function getBrisbaneToday() {
  const now = new Date()

  const fmtDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Australia/Brisbane',
  })

  const fmtWeekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Australia/Brisbane',
  })

  // YYYY-MM-DD in Brisbane
  const date = fmtDate.format(now)
  // weekday in Brisbane (lowercase, e.g. "friday")
  const weekday = fmtWeekday.format(now).toLowerCase()

  // Anchor date for safe day-iteration (avoid parsing locale strings back into a Date)
  const [y, m, d] = date.split('-').map(Number)
  const utcAnchor = new Date(Date.UTC(y, m - 1, d))

  return { date, weekday, utcAnchor, fmtDate, fmtWeekday }
}

// Fallback session config if Supabase is unavailable
const FALLBACK_SESSIONS = [
  {
    id: 'friday-evening',
    day_of_week: 'Friday',
    start_time: '19:45',
    end_time: '21:45',
    max_players: 20,
    fee: 8
  },
  {
    id: 'sunday-afternoon',
    day_of_week: 'Sunday',
    start_time: '15:00',
    end_time: '17:00',
    max_players: 20,
    fee: 8
  }
]

function getFallbackNextSession() {
  const { date: todayDate, weekday: todayWeekday, utcAnchor, fmtDate, fmtWeekday } = getBrisbaneToday()

  // If today is a session day, keep showing it for the whole Brisbane day
  const todaySession = FALLBACK_SESSIONS.find(
    s => s.day_of_week.toLowerCase() === todayWeekday.toLowerCase()
  )
  if (todaySession) {
    return { date: todayDate, session: todaySession }
  }

  // Otherwise find next upcoming session day
  for (let i = 1; i < 14; i++) {
    const candidate = new Date(utcAnchor.getTime() + i * 24 * 60 * 60 * 1000)
    const candidateDayName = fmtWeekday.format(candidate)
    const session = FALLBACK_SESSIONS.find(
      s => s.day_of_week.toLowerCase() === candidateDayName.toLowerCase()
    )
    if (session) {
      return {
        date: fmtDate.format(candidate),
        session
      }
    }
  }
  return null
}

// GET /api/bookings/next-session – get next session with confirmed players
export async function GET() {
  try {
    // Get all sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      throw sessionsError
    }

    // Filter out Monday sessions
    const allowedSessions = sessions.filter(
      s => s.day_of_week?.trim().toLowerCase() !== 'monday'
    )

    if (allowedSessions.length === 0) {
      return NextResponse.json({ error: 'No sessions configured' }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      })
    }

    // Find next session date
    const validDays = new Set(
      allowedSessions.map(s => s.day_of_week.trim().toLowerCase())
    )

    const { date: todayDate, weekday: todayWeekday, utcAnchor, fmtDate, fmtWeekday } = getBrisbaneToday()

    let nextDate: string | null = null
    let nextDayName: string | null = null

    // If today is a session day, keep showing it for the whole Brisbane day.
    // Only switch to the next session once the Brisbane date rolls over.
    if (validDays.has(todayWeekday)) {
      nextDate = todayDate
      nextDayName = todayWeekday
    } else {
      // Otherwise, find next upcoming session day (up to 14 days)
      for (let i = 1; i < 14; i++) {
        const candidate = new Date(utcAnchor.getTime() + i * 24 * 60 * 60 * 1000)
        const candidateDayName = fmtWeekday.format(candidate).toLowerCase()
        if (validDays.has(candidateDayName)) {
          nextDate = fmtDate.format(candidate)
          nextDayName = candidateDayName
          break
        }
      }
    }

    if (!nextDate) {
      return NextResponse.json({ error: 'No upcoming sessions found' }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      })
    }

    // Find matching session
    // IMPORTANT: Use the Brisbane-time weekday we already computed (nextDayName).
    // Converting YYYY-MM-DD back into a JS Date and calling toLocaleDateString()
    // without a timezone can shift the weekday on Vercel/UTC and cause "shows next day" bugs.
    const session = allowedSessions.find(
      s => s.day_of_week?.trim().toLowerCase() === (nextDayName || '').toLowerCase()
    )

    if (!session) {
      return NextResponse.json({ error: 'No session configuration found for the next date' }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      })
    }

    // Fetch confirmed bookings for the target date
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('player_id, session_time, players(first_name, last_name)')
      .eq('session_date', nextDate)
      .eq('payment_confirmed', true)
      .eq('status', 'confirmed')

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      throw bookingsError
    }

    // ✅ FIX: do NOT time-filter.
    // We already selected the correct next session date (Fri/Sun) and require confirmed+paid.
    // In production we’ve seen that even tiny formatting differences (e.g. "19:45:00" vs "19:45")
    // can cause confirmed bookings to disappear if we strict-compare session_time strings.
    const relevantBookings = bookings

    const players = relevantBookings.map((booking: any) => {
      const player = booking.players
      return player ? `${player.first_name} ${player.last_name}` : booking.player_id
    })

    const availableSpots = session.max_players - players.length

    return NextResponse.json({
      date: nextDate,
      players,
      session: {
        id: session.id,
        dayOfWeek: (session.day_of_week || '').trim(),
        startTime: session.start_time,
        endTime: session.end_time,
        maxPlayers: session.max_players,
        fee: session.fee
      },
      availableSpots
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    })
  } catch (err: any) {
    console.error('Unexpected error fetching next session, using fallback:', err)

    // Use a safe fallback so the page stays up (even if player list is empty)
    const fallback = getFallbackNextSession()
    if (!fallback) {
      return NextResponse.json({ error: 'No upcoming sessions found' }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      })
    }

    const { date, session } = fallback
    return NextResponse.json({
      date,
      players: [],
      session: {
        id: session.id,
        dayOfWeek: session.day_of_week,
        startTime: session.start_time,
        endTime: session.end_time,
        maxPlayers: session.max_players,
        fee: session.fee
      },
      availableSpots: session.max_players
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    })
  }
}
