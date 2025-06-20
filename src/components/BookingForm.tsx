'use client'

import { useState, useEffect } from 'react'
import { getPlayerById } from '@/lib/utils/playerUtils'
import { createBooking, getAvailableSessions, getNextSessionDate, updateBookingPaymentStatus } from '@/lib/utils/bookingUtils'
import type { Session } from '@/lib/types/player'
import { getAustralianToday, getMinBookingDate } from '@/lib/utils/dateUtils'

export default function BookingForm() {
  const [playerId, setPlayerId] = useState('')
  const [playerFound, setPlayerFound] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [availableSessions, setAvailableSessions] = useState<(Session & { availableSpots?: number })[]>([])
  const [bookingStatus, setBookingStatus] = useState<{
    success?: boolean;
    message: string;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bankReference, setBankReference] = useState('')
  const [minDate, setMinDate] = useState('')

  useEffect(() => {
    // Set minimum date to today in Australian timezone (GMT+10)
    setMinDate(getMinBookingDate());
    
    // Set default date to next available session - FIXED: Make it async
    const setDefaultDate = async () => {
        try {
            const nextSession = await getNextSessionDate();
            if (nextSession) {
              setSelectedDate(nextSession);
            } else {
              // Fallback to today's date if no session is found
              setSelectedDate(getMinBookingDate());
            }
        } catch (error) {
            console.error('Error getting next session date:', error);
            // Fallback to today's date
            setSelectedDate(getMinBookingDate());
        }
    };
    
    setDefaultDate();
}, []);

  // Auto-load sessions if we already have a selectedDate (default) once the player is verified
  useEffect(() => {
    const fetchSessions = async () => {
      if (!playerFound || !selectedDate) return
      if (isDateUnavailable(selectedDate)) {
        setAvailableSessions([])
        return
      }
      setIsLoading(true)
      try {
        const sessions = await getAvailableSessions(selectedDate)
        setAvailableSessions(sessions)
      } catch (error) {
        console.error('Error loading sessions:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerFound, selectedDate])

  // Check if selected date is unavailable
  const isDateUnavailable = (dateString: string) => {
    // June 15, 2025 is unavailable
    return dateString === '2025-06-15';
  };

  const getUnavailableDateMessage = (dateString: string) => {
    if (dateString === '2025-06-15') {
      return 'No session on 15/6. Thank you for your understanding.';
    }
    return '';
  };

  const handlePlayerIdSubmit = async (e?: React.FormEvent) => {
    // Prevent form submission from redirecting the page
    if (e) {
      e.preventDefault();
    }
    
    setIsLoading(true)
    setBookingStatus(null)
  
    try {
      let player = await getPlayerById(playerId)
      
      if (player) {
        setPlayerFound(true)
        setPlayerName(`${player.firstName} ${player.lastName}`)
      } else {
        setPlayerFound(false)
        setPlayerName('')
        setBookingStatus({
          success: false,
          message: 'Player ID not found. Please check your Player ID or register first.'
        })
      }
    } catch (error) {
      setPlayerFound(false)
      setPlayerName('')
      setBookingStatus({
        success: false,
        message: 'Error finding player. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateChange = async (date: string) => {
    setSelectedDate(date)
    
    // Clear previous booking status
    setBookingStatus(null)
    
    // If date is unavailable, don't load sessions
    if (isDateUnavailable(date)) {
      setAvailableSessions([])
      return
    }
    
    setIsLoading(true)
    try {
      const sessions = await getAvailableSessions(date)
      setAvailableSessions(sessions)
    } catch (error) {
      setBookingStatus({
        success: false,
        message: 'Error loading available sessions. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookSession = async (session: Session) => {
    setIsLoading(true)
    setBookingStatus(null)
  
    // Check if date is unavailable
    if (isDateUnavailable(selectedDate)) {
      setBookingStatus({
        success: false,
        message: getUnavailableDateMessage(selectedDate)
      });
      setIsLoading(false);
      return;
    }
  
    try {
      const bookingResult = await createBooking(
        playerId,
        selectedDate,
        `${session.startTime}-${session.endTime}`,
        session.fee
      )
  
      if (bookingResult.success && bookingResult.booking) {
        const booking = bookingResult.booking;
        const paymentReference = `MB${playerId}${selectedDate.replace(/-/g, '')}`;
        setBankReference(paymentReference)
        setBookingStatus({
          success: true,
          message: 'Booking successful! Please see payment details below. Your name will appear in "Next Session" once an administrator confirms your payment.'
        })
      } else {
        setBookingStatus({
          success: false,
          message: bookingResult.error || 'Booking failed. Please try again.'
        })
      }
    } catch (error: any) {
      setBookingStatus({
        success: false,
        message: error.message || 'An unexpected error occurred.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      {/* Player ID Form */}
      {!playerFound && (
        <form onSubmit={handlePlayerIdSubmit} className="space-y-4">
          <div>
            <label htmlFor="playerId" className="block text-sm font-medium text-gray-700 mb-2">
              Player ID
            </label>
            <input
              type="text"
              id="playerId"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="Enter your 5-digit Player ID"
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
              required
            />
          </div>
          
          {/* Add sync button here */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 sm:py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm sm:text-base"
            >
              {isLoading ? 'Verifying...' : 'Verify Player ID'}
            </button>
          </div>
        </form>
      )}

      {/* Booking Interface */}
      {playerFound && (
        <div className="space-y-4 sm:space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-blue-800">Player found: <strong>{playerName}</strong></p>
          </div>
          
            <div className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                id="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
              />
              
              {/* Show unavailable date notice */}
              {isDateUnavailable(selectedDate) && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700 text-sm font-medium">
                    {getUnavailableDateMessage(selectedDate)}
                  </p>
                </div>
              )}
            </div>

            {selectedDate && availableSessions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">Available Sessions</h3>

                <div className="grid gap-3 sm:gap-4">
                  {availableSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white p-3 sm:p-4 rounded-lg border border-gray-200"
                    >
                      {/* Mobile: Stack layout */}
                      <div className="flex flex-col space-y-3 sm:hidden">
                        <div>
                          <p className="font-medium text-sm">{session.dayOfWeek}</p>
                          <p className="text-gray-600 text-sm">
                            {session.startTime} - {session.endTime}
                          </p>
                          <p className="text-xs text-gray-500">
                            {session.availableSpots ?? session.maxPlayers} spots available
                          </p>
                        </div>
                        <button
                          onClick={() => handleBookSession(session)}
                          disabled={isLoading || (session.availableSpots ?? session.maxPlayers) <= 0}
                          className={`w-full py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm ${
                            isLoading || (session.availableSpots ?? session.maxPlayers) <= 0
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {isLoading ? 'Booking...' : 'Book Session'}
                        </button>
                      </div>

                      {/* Desktop: Side-by-side layout */}
                      <div className="hidden sm:flex justify-between items-center">
                        <div>
                          <p className="font-medium">{session.dayOfWeek}</p>
                          <p className="text-gray-600">
                            {session.startTime} - {session.endTime}
                          </p>
                          <p className="text-sm text-gray-500">
                            {session.availableSpots ?? session.maxPlayers} spots available
                          </p>
                        </div>
                        <button
                          onClick={() => handleBookSession(session)}
                          disabled={isLoading || (session.availableSpots ?? session.maxPlayers) <= 0}
                          className={`px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isLoading || (session.availableSpots ?? session.maxPlayers) <= 0
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {isLoading ? 'Booking...' : 'Book Session'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
        </div>
      )}

      {/* Status Messages */}
      {bookingStatus && (
        <div
          className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-md text-base sm:text-lg ${
            bookingStatus.success
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          <pre className="whitespace-pre-wrap font-sans">{bookingStatus.message}</pre>
        </div>
      )}

      {/* Payment instructions */}
      {bookingStatus?.success && bankReference && (
        <div className="mt-4 sm:mt-6 p-4 sm:p-6 bg-green-50 border border-green-200 rounded-md text-green-800 space-y-3 text-sm sm:text-base">
          <p className="font-semibold">
            Thanks for your booking! Once we receive your payment, your name will show up in 'Next session'.
          </p>
          <div className="space-y-1">
            <p className="font-bold">📜 PAYMENT INSTRUCTIONS:</p>
            <p>💰 <span className="font-medium">Amount:</span> $8.00</p>
            <p>🏷️ <span className="font-medium">Name:</span> Mareeba&nbsp;Badminton</p>
            <p>🏦 <span className="font-medium">BSB:</span> 633-000</p>
            <p>🏛️ <span className="font-medium">Account:</span> 225&nbsp;395&nbsp;003</p>
            <p>💳 <span className="font-medium">PayID&nbsp;(ABN):</span> 61&nbsp;470&nbsp;216&nbsp;342</p>
            <p>📝 <span className="font-medium">Reference:</span> {bankReference}</p>
          </div>
          <p className="pt-2">⚠️ Please use the reference "{bankReference}" for your payment.</p>
        </div>
      )}
    </div>
  )
} // <- Component ends here