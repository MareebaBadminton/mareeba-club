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
