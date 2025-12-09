import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/sessions – fetch all sessions from Supabase
export async function GET() {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching sessions from Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert Supabase format to client-friendly format
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      dayOfWeek: (session.day_of_week || '').trim(),
      startTime: session.start_time,
      endTime: session.end_time,
      maxPlayers: session.max_players,
      fee: session.fee
    }))

    return NextResponse.json({ sessions: formattedSessions })
  } catch (err: any) {
    console.error('Unexpected error fetching sessions:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
