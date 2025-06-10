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
  
  // Get the day of the week for the selected date
  const selectedDate = new Date(date);
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const selectedDayOfWeek = dayNames[selectedDate.getDay()];
  
  // Filter sessions to only include those for the selected day of the week
  const dayFilteredSessions = sessions.filter(session => 
    session.dayOfWeek === selectedDayOfWeek
  );
  
  const dateBookings = bookings.filter(
    booking => booking.sessionDate === date && booking.status === 'confirmed'
  );
  
  return dayFilteredSessions.map(session => {
    const sessionBookings = dateBookings.filter(
      booking => booking.sessionTime === `${session.startTime}-${session.endTime}`
    );
    
    return {
      ...session,
      maxPlayers: session.maxPlayers - sessionBookings.length
    };
  });
}

// Update booking payment status
// Add this at the end of the file
export async function updateBookingPaymentStatus(
  bookingId: string, 
  paymentStatus: 'pending' | 'confirmed'
): Promise<boolean> {
  const bookings = await getAllBookings();
  const bookingIndex = bookings.findIndex(booking => booking.id === bookingId);
  
  if (bookingIndex === -1) return false;
  
  bookings[bookingIndex].paymentStatus = paymentStatus;
  setData('BOOKINGS', bookings);
  
  return true;
}

// Add function to find booking by payment reference
export async function findBookingByReference(reference: string): Promise<Booking | null> {
  const bookings = await getAllBookings();
  
  // Extract player ID and date from reference (format: MBplayerIDYYYYDDMM)
  const match = reference.match(/^MB(\d+)(\d{8})$/);
  if (!match) return null;
  
  const [, playerId, dateStr] = match;
  const sessionDate = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
  
  return bookings.find(booking => 
    booking.playerId === playerId && 
    booking.sessionDate === sessionDate &&
    booking.paymentStatus === 'pending'
  ) || null;
}