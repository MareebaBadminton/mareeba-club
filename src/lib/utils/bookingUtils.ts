import { Booking, Session } from '../types/player';
import { v4 as uuidv4 } from 'uuid';
import { getData, setData, initializeStorage } from './storage';
import { getPlayerById } from './playerUtils';

// Initialize storage with default data
initializeStorage();

// Get all sessions
export async function getAllSessions(): Promise<Session[]> {
  return getData<Session>('SESSIONS');
}

// Get all bookings
export async function getAllBookings(): Promise<Booking[]> {
  return getData<Booking>('BOOKINGS');
}

// Get bookings by player ID
export async function getPlayerBookings(playerId: string): Promise<Booking[]> {
  const bookings = await getAllBookings();
  return bookings.filter(booking => booking.playerId === playerId);
}

// Create new booking
export async function createBooking(
  playerId: string,
  sessionDate: string,
  sessionTime: string
): Promise<Booking | null> {
  // Verify player exists
  const player = await getPlayerById(playerId);
  if (!player) return null;

  // Get existing bookings
  const bookings = await getAllBookings();
  
  // Check if player already has a booking for this session
  const existingBooking = bookings.find(
    booking => 
      booking.playerId === playerId && 
      booking.sessionDate === sessionDate &&
      booking.sessionTime === sessionTime &&
      booking.status === 'confirmed'
  );
  
  if (existingBooking) return null;

  // Get session details to get the fee
  const sessions = await getAllSessions();
  const [startTime, endTime] = sessionTime.split('-');
  const session = sessions.find(s => s.startTime === startTime && s.endTime === endTime);
  
  if (!session) return null;

  // Create new booking
  const newBooking: Booking = {
    id: uuidv4(),
    playerId,
    sessionDate,
    sessionTime,
    createdAt: new Date().toISOString(),
    status: 'confirmed',
    paymentStatus: 'pending',
    fee: session.fee
  };

  bookings.push(newBooking);
  setData('BOOKINGS', bookings);
  
  return newBooking;
}

// Cancel booking
export async function cancelBooking(bookingId: string): Promise<boolean> {
  const bookings = await getAllBookings();
  const bookingIndex = bookings.findIndex(booking => booking.id === bookingId);
  
  if (bookingIndex === -1) return false;
  
  bookings[bookingIndex].status = 'cancelled';
  setData('BOOKINGS', bookings);
  
  return true;
}

// Get available sessions for a date
export async function getAvailableSessions(date: string): Promise<Session[]> {
  const sessions = await getAllSessions();
  const bookings = await getAllBookings();
  
  const dateBookings = bookings.filter(
    booking => booking.sessionDate === date && booking.status === 'confirmed'
  );
  
  return sessions.map(session => {
    const sessionBookings = dateBookings.filter(
      booking => booking.sessionTime === `${session.startTime}-${session.endTime}`
    );
    
    return {
      ...session,
      maxPlayers: session.maxPlayers - sessionBookings.length
    };
  });
} 