import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'

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

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error'
}

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
  } catch (err) {
    console.error('Unexpected error fetching unavailable dates:', err)
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
  } catch (err) {
    console.error('Unexpected error marking date unavailable:', err)
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
  } catch (err) {
    console.error('Unexpected error restoring date:', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
