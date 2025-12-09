import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/bookings – fetch bookings from Supabase
// Query params: playerId (optional), sessionDate (optional)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    const sessionDate = searchParams.get('sessionDate')
    const paymentConfirmed = searchParams.get('paymentConfirmed')

    let query = supabase
      .from('bookings')
      .select('*')
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true })

    if (playerId) {
      query = query.eq('player_id', playerId)
    }

    if (sessionDate) {
      query = query.eq('session_date', sessionDate)
    }

    if (paymentConfirmed !== null) {
      query = query.eq('payment_confirmed', paymentConfirmed === 'true')
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching bookings from Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Convert Supabase format to client-friendly format
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      playerId: booking.player_id,
      sessionDate: booking.session_date,
      sessionTime: booking.session_time,
      status: booking.status,
      paymentStatus: booking.payment_confirmed ? 'paid' : 'pending',
      fee: booking.fee || 8,
      createdAt: booking.created_at
    }))

    return NextResponse.json({ bookings: formattedBookings })
  } catch (err: any) {
    console.error('Unexpected error fetching bookings:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}

// POST /api/bookings – create a new booking
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { playerId, sessionDate, sessionTime, sessionFee } = body

    if (!playerId || !sessionDate || !sessionTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for duplicate booking
    const { data: existingBookings, error: checkError } = await supabase
      .from('bookings')
      .select('id')
      .eq('player_id', playerId)
      .eq('session_date', sessionDate)
      .eq('session_time', sessionTime)
      .in('status', ['confirmed', 'pending'])

    if (checkError) {
      console.error('Error checking for existing booking:', checkError)
      return NextResponse.json({ error: `Database error: ${checkError.message}` }, { status: 500 })
    }

    if (existingBookings && existingBookings.length > 0) {
      return NextResponse.json({ error: 'You already have a booking for this session' }, { status: 400 })
    }

    // Determine legacy-friendly ID
    let sequence = 1
    try {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('session_date', sessionDate)
        .eq('session_time', sessionTime)

      sequence = (count || 0) + 1
    } catch (seqErr) {
      console.warn('Unable to compute booking sequence, defaulting to 1', seqErr)
    }

    const legacyId = `${playerId}_${sessionDate}_${sequence}`

    // Create the booking
    const newBookingData = {
      id: legacyId,
      player_id: playerId,
      session_date: sessionDate,
      session_time: sessionTime,
      status: 'pending',
      payment_confirmed: false,
      fee: sessionFee || 8,
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert([newBookingData])
      .select()
      .single()

    if (error) {
      console.error('Error creating booking in Supabase:', error)
      return NextResponse.json({ error: `Failed to create booking: ${error.message}` }, { status: 500 })
    }

    const formattedBooking = {
      id: booking.id,
      playerId: booking.player_id,
      sessionDate: booking.session_date,
      sessionTime: booking.session_time,
      status: booking.status,
      paymentStatus: booking.payment_confirmed ? 'paid' : 'pending',
      fee: booking.fee,
      createdAt: booking.created_at,
    }

    // Create a corresponding payment record
    const paymentReference = `${playerId}`
    const { error: paymentError } = await supabase
      .from('payments')
      .insert([{
        booking_id: formattedBooking.id,
        player_id: formattedBooking.playerId,
        amount: formattedBooking.fee,
        payment_reference: paymentReference,
        status: 'pending'
      }])

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
      // Don't fail the booking creation if payment record creation fails
    }

    return NextResponse.json({ success: true, booking: formattedBooking })
  } catch (err: any) {
    console.error('Unexpected error creating booking:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}

// PATCH /api/bookings – update a booking (payment status, cancellation, etc.)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { bookingId, paymentStatus, status: newStatus } = body

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })
    }

    const updateData: Record<string, any> = {}

    if (paymentStatus !== undefined) {
      updateData.payment_confirmed = paymentStatus === 'paid'
      if (paymentStatus === 'paid') {
        updateData.status = 'confirmed'
      }
    }

    if (newStatus !== undefined) {
      updateData.status = newStatus
    }

    updateData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating booking:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Unexpected error updating booking:', err)
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 })
  }
}
