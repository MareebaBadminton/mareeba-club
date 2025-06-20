import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// POST /api/players – create a new player in Supabase
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, firstName, lastName, email } = body

    if (!id || !firstName || !lastName || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('players')
      .insert([
        {
          id,
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ player: data })
  } catch (err: any) {
    console.error('Unexpected error creating player:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}

// GET /api/players – fetch list of players (optional)
export async function GET() {
  const { data, error } = await supabase.from('players').select('*').order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ players: data })
} 