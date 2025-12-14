import { getAustralianDateTime } from './dateUtils'
import type { Booking, Session } from '../types/player'
import { v4 as uuidv4 } from 'uuid'

// Cache variables for performance optimization
const CACHE_DURATION = 5000 // 5 seconds
let sessionsCache: { data: Session[]; timestamp: number } | null = null
let bookingsCache: { data: Booking[]; timestamp: number } | null = null

// Get all sessions from API route (proxies to Supabase)
export async function getAllSessions(): Promise<Session[]> {
  try {
    const response = await fetch('/api/sessions')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.statusText}`)
    }
    
    const { sessions } = await response.json()
    return sessions || []
  } catch (error) {
    console.error('Error fetching sessions:', error)
    // Don't use stale localStorage data - let the error propagate
    throw new Error('Unable to load sessions. Please check your internet connection and try again.')
  }
}

// Get all bookings from API route (proxies to Supabase)
export async function getAllBookings(): Promise<Booking[]> {
  try {
    const response = await fetch('/api/bookings')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch bookings: ${response.statusText}`)
    }
    
    const { bookings } = await response.json()
    return bookings || []
  } catch (error) {
    console.error('Error fetching bookings:', error)
    // Don't use stale localStorage data - let the error propagate
    throw new Error('Unable to load bookings. Please check your internet connection and try again.')
  }
}

// Get bookings for a specific player from API route (proxies to Supabase)
export async function getPlayerBookings(playerId: string): Promise<Booking[]> {
  try {
    const response = await fetch(`/api/bookings?playerId=${encodeURIComponent(playerId)}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch player bookings: ${response.statusText}`)
    }
    
    const { bookings } = await response.json()
    return bookings || []
  } catch (error) {
    console.error('Error fetching player bookings:', error)
    // Don't use stale localStorage data - let the error propagate
    throw new Error('Unable to load your bookings. Please check your internet connection and try again.')
  }
}

// Create a new booking via API route (proxies to Supabase)
export async function createBooking(
  playerId: string,
  sessionDate: string,
  sessionTime: string,
  sessionFee: number
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  try {
    // Check if the session is already full (count both pending and confirmed bookings)
    const allBookings = await getAllBookings()
    const sessions = await getAllSessions()
    const targetDate = new Date(sessionDate)
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' })
    const session = sessions.find(s => s.dayOfWeek === dayOfWeek)
    
    if (session) {
      // sessionTime parameter can be either full range "19:30-21:30" or just startTime "19:30"
      const activeBookings = allBookings.filter(
        (b) => b.sessionDate === sessionDate && 
               b.status !== 'cancelled' &&
               b.sessionTime &&
               (b.sessionTime === sessionTime || 
                b.sessionTime === session.startTime ||
                b.sessionTime === `${session.startTime}-${session.endTime}`)
      )
      
      if (activeBookings.length >= session.maxPlayers) {
        return { success: false, error: 'Sorry, this session is full. Please book a spot in our next session!' }
      }
    }

    // Create the booking via API route
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerId,
        sessionDate,
        sessionTime,
        sessionFee
      })
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      return { success: false, error: result.error || 'Failed to create booking' }
    }

    clearBookingCache() // Clear cache after successful booking

    return { success: true, booking: result.booking }
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
    
    // Get existing bookings for this date (count both pending and confirmed, exclude cancelled)
    const activeBookings = allBookings.filter(
      (b) => b.sessionDate === date && b.status !== 'cancelled'
    )
    
    // Calculate remaining spots for each session
    const sessionsWithAvailability: (Session & { availableSpots: number })[] = availableSessions.map(
      (session) => {
        const fullRange = `${session.startTime}-${session.endTime}`
        const bookingCount = activeBookings.filter((b) => {
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

// Cancel booking via API route
export async function cancelBooking(bookingId: string): Promise<boolean> {
  try {
    const response = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        status: 'cancelled'
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error cancelling booking:', errorData.error)
      return false
    }
    
    clearBookingCache()
    return true
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return false
  }
}

// Add this function to clear cache when data changes
export function clearBookingCache() {
  sessionsCache = null
  bookingsCache = null
}

// Legacy sync function (kept for compatibility - now just verifies Supabase connection)
export async function syncBookingsFromGoogleSheets(): Promise<{ success: boolean; count: number; message: string }> {
  try {
    // Verify we can fetch from Supabase
    const supabaseBookings = await getAllBookings()
    
    return {
      success: true,
      count: supabaseBookings.length,
      message: `Connected to Supabase: ${supabaseBookings.length} bookings found`
    }
  } catch (error) {
    console.error('Error connecting to Supabase:', error)
    return {
      success: false,
      count: 0,
      message: 'Error connecting to Supabase'
    }
  }
}

// Function to get the date of the next upcoming session
export async function getNextSessionDate(): Promise<string | null> {
  const sessions = await getAllSessions()
  if (!sessions.length) return null

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

  // Filter out Monday sessions - only show Sunday and Friday sessions
  const allowedSessions = sessions.filter(
    s => s.dayOfWeek?.trim().toLowerCase() !== 'monday'
  )

  // Build a quick lookup of valid day names (lower-case), excluding Monday
  const validDays = new Set(
    allowedSessions.map(s => s.dayOfWeek.trim().toLowerCase())
  )

  if (validDays.size === 0) return null

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

  // Check today + next 13 days
  for (let i = 0; i < 14; i++) {
    const candidate = new Date()
    candidate.setDate(candidate.getDate() + i)

    const candidateDayName = fmtWeekday.format(candidate).toLowerCase()
    if (validDays.has(candidateDayName)) {
      // format YYYY-MM-DD for Australian zone
      return fmtDate.format(candidate)
    }
  }

  return null
}

export async function findBookingByReference(reference: string): Promise<Booking | null> {
  const allBookings = await getAllBookings();
  const booking = allBookings.find(b => b.playerId === reference.trim());
  return booking || null;
}

export async function updateBookingPaymentStatus(bookingId: string, paymentStatus: 'paid' | 'pending'): Promise<boolean> {
  try {
    const response = await fetch('/api/bookings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bookingId,
        paymentStatus
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Error updating booking payment status:', errorData.error)
      return false
  }

    clearBookingCache()
    return true
  } catch (error) {
    console.error('Error updating booking payment status:', error)
    return false
  }
}
