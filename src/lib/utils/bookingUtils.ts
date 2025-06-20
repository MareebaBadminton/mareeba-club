import { getAustralianDateTime } from './dateUtils'
import type { Booking, Session } from '../types/player'
import { getData, setData } from './storage'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../supabase'
import { createPayment } from './paymentUtils' // Import createPayment
// REMOVE THIS LINE: import { addBookingToSheet } from './googleSheets'

// Cache variables for performance optimization
const CACHE_DURATION = 5000 // 5 seconds
let sessionsCache: { data: Session[]; timestamp: number } | null = null
let bookingsCache: { data: Booking[]; timestamp: number } | null = null

// Get all sessions from Supabase
export async function getAllSessions(): Promise<Session[]> {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching sessions from Supabase:', error)
      // Fallback to localStorage if Supabase fails
      return getData('SESSIONS') as Session[]
    }
    
    // Convert Supabase format to our Session interface
    return sessions.map(session => ({
      id: session.id,
      dayOfWeek: (session.day_of_week || '').trim(),
      startTime: session.start_time,
      endTime: session.end_time,
      maxPlayers: session.max_players,
      fee: session.fee
    }))
  } catch (error) {
    console.error('Error connecting to Supabase:', error)
    // Fallback to localStorage if connection fails
    return getData('SESSIONS') as Session[]
  }
}

// Get all bookings from Supabase
export async function getAllBookings(): Promise<Booking[]> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true })
    
    if (error || !bookings || bookings.length === 0) {
      if (error) {
        console.error('Error fetching bookings from Supabase:', error)
      }
      // Fallback to localStorage only (legacy Google Sheets path removed)
      return getData('BOOKINGS') as Booking[]
    }
    
    // Convert Supabase format to our Booking interface
    return bookings.map(booking => ({
      id: booking.id,
      playerId: booking.player_id,
      sessionDate: booking.session_date,
      sessionTime: booking.session_time,
      status: booking.status,
      paymentStatus: booking.payment_confirmed ? 'paid' : 'pending',
      fee: 8, // Use session fee from sessions table or default
      createdAt: booking.created_at
    }))
  } catch (error) {
    console.error('Error connecting to Supabase:', error)
    // Fallback to localStorage if connection fails
    return getData('BOOKINGS') as Booking[]
  }
}

// Get bookings for a specific player from Supabase
export async function getPlayerBookings(playerId: string): Promise<Booking[]> {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('player_id', playerId)
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching player bookings from Supabase:', error)
      // Fallback to localStorage
      const allBookings = getData('BOOKINGS') as Booking[]
      return allBookings.filter(booking => booking.playerId === playerId)
    }
    
    // Convert Supabase format to our Booking interface
    return bookings.map(booking => ({
      id: booking.id,
      playerId: booking.player_id,
      sessionDate: booking.session_date,
      sessionTime: booking.session_time,
      status: booking.status,
      paymentStatus: booking.payment_confirmed ? 'paid' : 'pending',
      fee: 8,
      createdAt: booking.created_at
    }))
  } catch (error) {
    console.error('Error connecting to Supabase:', error)
    // Fallback to localStorage
    const allBookings = getData('BOOKINGS') as Booking[]
    return allBookings.filter(booking => booking.playerId === playerId)
  }
}

// Create a new booking in Supabase, create a payment, and sync to Google Sheets
export async function createBooking(
  playerId: string,
  sessionDate: string,
  sessionTime: string,
  sessionFee: number
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  try {
    // 1. Check for duplicate booking first
    const { data: existingBookings, error: checkError } = await supabase
      .from('bookings')
      .select('id')
      .eq('player_id', playerId)
      .eq('session_date', sessionDate)
      .eq('session_time', sessionTime)
      .in('status', ['confirmed', 'pending'])

    if (checkError) {
      console.error('Error checking for existing booking:', checkError)
      return { success: false, error: `Database error: ${checkError.message}` }
    }

    if (existingBookings && existingBookings.length > 0) {
      return { success: false, error: 'You already have a booking for this session' }
    }

    // 2. Determine legacy-friendly ID (playerId_date_sequence)
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

    // 3. Create the booking in Supabase (explicit ID to keep legacy pattern)
    const newBookingData = {
      id: legacyId,
      player_id: playerId,
      session_date: sessionDate,
      session_time: sessionTime,
      status: 'pending',
      payment_confirmed: false,
      fee: sessionFee,
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .insert([newBookingData])
      .select()
      .single()

    if (error) {
      console.error('Error creating booking in Supabase:', error)
      return { success: false, error: `Failed to create booking: ${error.message}` }
    }

    const newBooking: Booking = {
      id: booking.id,
      playerId: booking.player_id,
      sessionDate: booking.session_date,
      sessionTime: booking.session_time,
      status: booking.status,
      paymentStatus: booking.payment_confirmed ? 'paid' : 'pending',
      fee: booking.fee,
      createdAt: booking.created_at,
    }

    // 4. Create a corresponding payment record
    const paymentReference = `MBBC-${newBooking.id.substring(0, 8).toUpperCase()}`
    await createPayment({
      bookingId: newBooking.id,
      playerId: newBooking.playerId,
      amount: newBooking.fee,
      paymentReference: paymentReference
    })

    // Legacy Google Sheets sync removed.

    clearBookingCache() // Clear cache after successful booking

    return { success: true, booking: newBooking }
  } catch (error: any) {
    console.error('An unexpected error occurred during booking creation:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

// Returns sessions that still have capacity together with the number of remaining spots
export async function getAvailableSessions(date: string): Promise<(Session & { availableSpots: number })[]> {
  try {
    const targetDate = new Date(date)
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' })
    
    // Use cached data if available and fresh
    const now = Date.now()
    let sessions: Session[]
    let allBookings: Booking[]
    
    // Get sessions (cache for 30 seconds)
    if (sessionsCache && (now - sessionsCache.timestamp) < CACHE_DURATION) {
      sessions = sessionsCache.data
    } else {
      sessions = await getAllSessions()
      sessionsCache = { data: sessions, timestamp: now }
    }
    
    // Get bookings (cache for 30 seconds)
    if (bookingsCache && (now - bookingsCache.timestamp) < CACHE_DURATION) {
      allBookings = bookingsCache.data
    } else {
      allBookings = await getAllBookings()
      bookingsCache = { data: allBookings, timestamp: now }
    }
    
    const availableSessions = sessions.filter(s => s.dayOfWeek === dayOfWeek)
    
    // Get existing CONFIRMED bookings for this date (don't count pending bookings)
    const confirmedBookings = allBookings.filter(
      (b) => b.sessionDate === date && b.status === 'confirmed'
    )
    
    // Calculate remaining spots for each session
    const sessionsWithAvailability: (Session & { availableSpots: number })[] = availableSessions.map(
      (session) => {
        const fullRange = `${session.startTime}-${session.endTime}`
        const bookingCount = confirmedBookings.filter((b) => {
          if (!b.sessionTime) return false
          return b.sessionTime === fullRange || b.sessionTime === session.startTime
        }).length
        const remaining = session.maxPlayers - bookingCount

        return {
          ...session,
          availableSpots: remaining,
        }
      }
    )
    
    // Return only those that still have capacity
    return sessionsWithAvailability.filter((s) => s.availableSpots > 0)
  } catch (error) {
    console.error('Error getting available sessions:', error)
    return []
  }
}

// Cancel booking in Supabase
export async function cancelBooking(bookingId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
    
    if (error) {
      console.error('Error cancelling booking in Supabase:', error)
      return false
    }
    
    // Also update localStorage as backup
    const bookings = getData('BOOKINGS') as Booking[]
    const bookingIndex = bookings.findIndex(b => b.id === bookingId)
    if (bookingIndex !== -1) {
      bookings[bookingIndex].status = 'cancelled'
      setData('BOOKINGS', bookings)
    }
    
    return true
  } catch (error) {
    console.error('Error connecting to Supabase:', error)
    return false
  }
}

// Add this function to clear cache when data changes
export function clearBookingCache() {
  sessionsCache = null
  bookingsCache = null
}

// Legacy sync functions (kept for compatibility but now use Supabase)
export async function syncBookingsFromGoogleSheets(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    // Now this function syncs from Supabase instead of Google Sheets
    const supabaseBookings = await getAllBookings()
    
    // Update localStorage with Supabase data
    setData('BOOKINGS', supabaseBookings)
    
    return {
      success: true,
      count: supabaseBookings.length,
      message: `Synced ${supabaseBookings.length} bookings from Supabase`
    }
  } catch (error) {
    console.error('Error syncing bookings from Supabase:', error)
    return {
      success: false,
      count: 0,
      message: 'Error syncing from Supabase'
    }
  }
}

// Function to get the date of the next upcoming session
export async function getNextSessionDate(): Promise<string | null> {
  const sessions = await getAllSessions()
  if (!sessions.length) return null

  // Australian date/time with time stripped so "today" counts.
  const now = new Date(getAustralianDateTime())
  now.setHours(0, 0, 0, 0)

  // Check the next 14 days for the first day that actually has a configured session
  for (let i = 0; i < 14; i++) {
    const nextDate = new Date(now)
    nextDate.setDate(now.getDate() + i)

    const nextDayName = nextDate.toLocaleDateString('en-US', { weekday: 'long' })

    const match = sessions.find(
      (s) => s.dayOfWeek.toLowerCase() === nextDayName.toLowerCase()
    )

    if (match) {
      return nextDate.toISOString().split('T')[0]
    }
  }

  // No upcoming session found within the look-ahead window
  return null
}

export async function findBookingByReference(reference: string): Promise<Booking | null> {
  const allBookings = await getAllBookings();
  const booking = allBookings.find(b => b.id.substring(0, 8).toUpperCase() === reference.toUpperCase().replace('MBBC-', ''));
  return booking || null;
}

export async function updateBookingPaymentStatus(bookingId: string, paymentStatus: 'paid' | 'pending'): Promise<boolean> {
  const { error } = await supabase
    .from('bookings')
    .update({ payment_confirmed: paymentStatus === 'paid', status: 'confirmed' })
    .eq('id', bookingId);

  if (error) {
    console.error('Error updating booking payment status:', error);
    return false;
  }
  clearBookingCache();
  return true;
}