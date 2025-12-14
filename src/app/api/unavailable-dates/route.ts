import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'

// GET /api/unavailable-dates - fetch all unavailable dates
export async function GET() {
  try {
    const { data: unavailableDates, error } = await supabase
      .from('unavailable_dates')
      .select('date, reason')
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching unavailable dates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert to a map format for easy lookup: { "2025-12-25": "Christmas Day" }
    const dateMap: Record<string, string> = {}
    unavailableDates.forEach((item: { date: string; reason: string | null }) => {
      dateMap[item.date] = item.reason || 'This date is unavailable.'
    })

    return NextResponse.json({ 
      unavailableDates: dateMap,
      count: unavailableDates.length 
    })
  } catch (err: any) {
    console.error('Unexpected error fetching unavailable dates:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
