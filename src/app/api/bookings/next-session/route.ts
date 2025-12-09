import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
  const fmtWeekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: 'Australia/Brisbane'
  })

  const fmtDate = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Australia/Brisbane'
  })

  for (let i = 0; i < 14; i++) {
    const candidate = new Date()
    candidate.setDate(candidate.getDate() + i)
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
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const validDays = new Set(
      allowedSessions.map(s => s.day_of_week.trim().toLowerCase())
    )

    const fmtWeekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: 'Australia/Brisbane'
    })

    const fmtDate = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Australia/Brisbane'
    })

    let nextDate: string | null = null
    for (let i = 0; i < 14; i++) {
      const candidate = new Date()
      candidate.setDate(candidate.getDate() + i)
      const candidateDayName = fmtWeekday.format(candidate).toLowerCase()
      if (validDays.has(candidateDayName)) {
        nextDate = fmtDate.format(candidate)
        break
      }
    }

    if (!nextDate) {
      return NextResponse.json({ error: 'No upcoming sessions found' }, { 
        status: 404,
        headers: { 'Cache-Control': 'no-store, max-age=0' }
      })
    }

    // Find matching session
    const targetDate = new Date(nextDate)
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' })
    const session = allowedSessions.find(
      s => s.day_of_week?.trim().toLowerCase() === dayOfWeek.toLowerCase()
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
      .select('player_id, session_time, players!inner(first_name, last_name)')
      .eq('session_date', nextDate)
      .eq('payment_confirmed', true)

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      throw bookingsError
    }

    // Filter bookings that match the session time
    const relevantBookings = bookings.filter((b: any) => {
      const t = b.session_time as string | null
      if (!t) return false
      return t === session.start_time || t === `${session.start_time}-${session.end_time}`
    })

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
