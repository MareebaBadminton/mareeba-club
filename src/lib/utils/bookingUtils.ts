import { getAustralianDateTime } from './dateUtils'
import type { Booking, Session } from '../types/player'
import { getData, setData } from './storage'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '../supabase'

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
      dayOfWeek: session.day_of_week,
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
    
    if (error) {
      console.error('Error fetching bookings from Supabase:', error)
      // Fallback to localStorage if Supabase fails
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

// Create a new booking in Supabase
export async function createBooking(
  playerId: string,
  sessionDate: string,
  sessionTime: string
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  try {
    // Check for duplicate booking first
    const { data: existingBookings, error: checkError } = await supabase
      .from('bookings')
      .select('id')
      .eq('player_id', playerId)
      .eq('session_date', sessionDate)
      .eq('session_time', sessionTime)
      .in('status', ['confirmed', 'pending']) // Check for both pending and confirmed bookings
    
    if (checkError) {
      console.error('Error checking for existing booking:', checkError)
      return createBookingLocalStorage(playerId, sessionDate, sessionTime)
    }
    
    if (existingBookings && existingBookings.length > 0) {
      return { success: false, error: 'You already have a booking for this session' }
    }
    
    const newBookingData = {
      player_id: playerId,
      session_date: sessionDate,
      session_time: sessionTime,
      status: 'pending', // Start as pending until payment is confirmed
      payment_confirmed: false
    }
    
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert([newBookingData])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating booking in Supabase:', error)
      return createBookingLocalStorage(playerId, sessionDate, sessionTime)
    }
    
    // Convert to our interface format
    const newBooking: Booking = {
      id: booking.id,
      playerId: booking.player_id,
      sessionDate: booking.session_date,
      sessionTime: booking.session_time,
      status: booking.status, // Will be 'pending'
      paymentStatus: booking.payment_confirmed ? 'paid' : 'pending',
      fee: 8,
      createdAt: booking.created_at
    }
    
    // Also save to localStorage as backup
    const localBookings = getData('BOOKINGS') as Booking[]
    localBookings.push(newBooking)
    setData('BOOKINGS', localBookings)
    
    return { success: true, booking: newBooking }
    
  } catch (error) {
    console.error('Error connecting to Supabase:', error)
    return createBookingLocalStorage(playerId, sessionDate, sessionTime)
  }
}

// Fallback function for localStorage booking creation
function createBookingLocalStorage(
  playerId: string,
  sessionDate: string,
  sessionTime: string
): { success: boolean; booking?: Booking; error?: string } {
  try {
    const bookings = getData('BOOKINGS') as Booking[]
    
    // Check for duplicate booking (both pending and confirmed)
    const existingBooking = bookings.find(b => 
      b.playerId === playerId && 
      b.sessionDate === sessionDate && 
      b.sessionTime === sessionTime &&
      (b.status === 'confirmed' || b.status === 'pending')
    )
    
    if (existingBooking) {
      return { success: false, error: 'You already have a booking for this session' }
    }
    
    const newBooking: Booking = {
      id: uuidv4(),
      playerId,
      sessionDate,
      sessionTime,
      status: 'pending', // Start as pending until payment is confirmed
      paymentStatus: 'pending',
      fee: 8,
      createdAt: new Date().toISOString()
    }
    
    bookings.push(newBooking)
    setData('BOOKINGS', bookings)
    
    return { success: true, booking: newBooking }
  } catch (error) {
    console.error('Error creating booking in localStorage:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Get Australian date/time helper function
// Remove this entire function (lines 220-223):
// function getAustralianDateTime(): Date {
//   return new Date(new Date().toLocaleString("en-US", {timeZone: "Australia/Brisbane"}))
// }

// Get next session date (same logic as before)
export async function getNextSessionDate(): Promise<string> {
  const now = getAustralianDateTime()
  const sessions = await getAllSessions()
  
  const upcoming: { date: string; session: Session }[] = []
  
  for (let i = 0; i < 14; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    const dateStr = date.toLocaleDateString('en-CA', {
      timeZone: 'Australia/Brisbane'
    })
    
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
    const matchingSessions = sessions.filter(s => s.dayOfWeek === dayOfWeek)
    
    matchingSessions.forEach(session => {
      if (i === 0) {
        const sessionEndTime = new Date(date)
        const [endHours, endMinutes] = session.endTime.split(':')
        sessionEndTime.setHours(parseInt(endHours), parseInt(endMinutes))
        
        if (sessionEndTime > now) {
          upcoming.push({ date: dateStr, session })
        }
      } else {
        upcoming.push({ date: dateStr, session })
      }
    })
  }
  
  upcoming.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    return a.session.startTime.localeCompare(b.session.startTime)
  })
  
  return upcoming[0]?.date || now.toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' })
}

// Update booking payment status in Supabase
export async function updateBookingPaymentStatus(
  bookingId: string,
  confirmed: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({ 
        payment_confirmed: confirmed,
        status: confirmed ? 'confirmed' : 'pending', // Change status based on payment confirmation
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
    
    if (error) {
      console.error('Error updating booking payment status in Supabase:', error)
      return false
    }
    
    // Also update localStorage as backup
    const bookings = getData('BOOKINGS') as Booking[]
    const bookingIndex = bookings.findIndex(b => b.id === bookingId)
    if (bookingIndex !== -1) {
      bookings[bookingIndex].paymentStatus = confirmed ? 'paid' : 'pending'
      bookings[bookingIndex].status = confirmed ? 'confirmed' : 'pending' // Update status too
      setData('BOOKINGS', bookings)
    }
    
    return true
  } catch (error) {
    console.error('Error connecting to Supabase:', error)
    return false
  }
}

// Find booking by reference - check Supabase first
export async function findBookingByReference(reference: string): Promise<Booking | null> {
  try {
    const allBookings = await getAllBookings()
    return allBookings.find(booking => booking.id === reference) || null
  } catch (error) {
    console.error('Error finding booking by reference:', error)
    return null
  }
}

// Get available sessions for a date
export async function getAvailableSessions(date: string): Promise<Session[]> {
  try {
    const targetDate = new Date(date)
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' })
    
    const sessions = await getAllSessions()
    const availableSessions = sessions.filter(s => s.dayOfWeek === dayOfWeek)
    
    // Get existing CONFIRMED bookings for this date (don't count pending bookings)
    const allBookings = await getAllBookings()
    const confirmedBookings = allBookings.filter(b => 
      b.sessionDate === date && b.status === 'confirmed'
    )
    
    // Filter out full sessions (only count confirmed bookings)
    return availableSessions.filter(session => {
      const sessionTime = `${session.startTime}-${session.endTime}`
      const bookingCount = confirmedBookings.filter(b => b.sessionTime === sessionTime).length
      return bookingCount < session.maxPlayers
    })
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