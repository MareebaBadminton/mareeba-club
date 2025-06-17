'use client'

import { useState, useEffect } from 'react'
import { getPlayerById, syncPlayersFromGoogleSheets, isPlayerReadyForBooking, syncPlayerToSheets } from '@/lib/utils/playerUtils'
import { createBooking, getAvailableSessions, getNextSessionDate } from '@/lib/utils/bookingUtils'
import { createPayment } from '@/lib/utils/paymentUtils'
import type { Session } from '@/lib/types/player'
import { getAustralianToday, getMinBookingDate } from '@/lib/utils/dateUtils'

export default function BookingForm() {
  const [playerId, setPlayerId] = useState('')
  const [playerFound, setPlayerFound] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [availableSessions, setAvailableSessions] = useState<Session[]>([])
  const [bookingStatus, setBookingStatus] = useState<{
    success?: boolean;
    message: string;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bankReference, setBankReference] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [minDate, setMinDate] = useState('')
  const [syncValidation, setSyncValidation] = useState<{ ready: boolean; message?: string } | null>(null)
  const [isValidatingSync, setIsValidatingSync] = useState(false)
  const [isSyncingPlayer, setIsSyncingPlayer] = useState(false)

  useEffect(() => {
    // Set minimum date to today in Australian timezone (GMT+10)
    setMinDate(getMinBookingDate());
    
    // Set default date to next available session - FIXED: Make it async
    const setDefaultDate = async () => {
        try {
            const nextSession = await getNextSessionDate();
            setSelectedDate(nextSession);
        } catch (error) {
            console.error('Error getting next session date:', error);
            // Fallback to today's date
            setSelectedDate(getMinBookingDate());
        }
    };
    
    setDefaultDate();
}, []);

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
    setSyncValidation(null)
  
    try {
      let player = await getPlayerById(playerId)
      
      if (player) {
        setPlayerFound(true)
        setPlayerName(`${player.firstName} ${player.lastName}`)
        
        // Validate sync status before allowing booking
        setIsValidatingSync(true)
        const syncCheck = await isPlayerReadyForBooking(playerId)
        setSyncValidation(syncCheck)
        setIsValidatingSync(false)
      } else {
        // Smart sync: Auto-sync and retry once if player not found
        setSyncStatus('Player not found. Syncing latest data from Supabase...')
        setIsSyncing(true)
        
        try {
          const syncResult = await syncPlayersFromGoogleSheets()
          setSyncStatus(syncResult.message)
          
          // Retry after sync
          const retryPlayer = await getPlayerById(playerId)
          if (retryPlayer) {
            setPlayerFound(true)
            setPlayerName(`${retryPlayer.firstName} ${retryPlayer.lastName}`)
            
            // Validate sync status
            setIsValidatingSync(true)
            const syncCheck = await isPlayerReadyForBooking(playerId)
            setSyncValidation(syncCheck)
            setIsValidatingSync(false)
          } else {
            setPlayerFound(false)
            setPlayerName('')
            setSyncStatus('Player ID not found. Please check your Player ID or register first.')
          }
        } catch (syncError) {
          setSyncStatus('Failed to sync data. Please try again.')
          setPlayerFound(false)
          setPlayerName('')
        } finally {
          setIsSyncing(false)
        }
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

    // Pre-booking validation
    if (!syncValidation?.ready) {
      setBookingStatus({
        success: false,
        message: 'Please ensure your player data is synced before booking.'
      })
      setIsLoading(false)
      return
    }

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
        `${session.startTime}-${session.endTime}`
      )

      if (bookingResult.success && bookingResult.booking) {
        const booking = bookingResult.booking;
        
        // Generate payment reference FIRST
        const formatDateForReference = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-');
          return `${year}${day}${month}`;
        };
        
        const paymentReference = `MB${playerId}${formatDateForReference(selectedDate)}`;
        
        // Create payment record
        const payment = await createPayment({
          bookingId: booking.id,
          playerId: booking.playerId,
          amount: session.fee,
          paymentReference: paymentReference,
          status: 'pending'
        });
        
        // Save booking to Google Sheets
        try {
          await fetch('/api/bookings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: booking.id,
              playerId: booking.playerId,
              playerName: playerName,
              sessionDate: booking.sessionDate,
              sessionTime: booking.sessionTime,
              fee: booking.fee,
              paymentReference: paymentReference,
              paymentStatus: 'pending',
              createdAt: booking.createdAt
            }),
          });
          
          console.log('Booking saved to Google Sheets');
        } catch (sheetError) {
          console.warn('Failed to save to Google Sheets:', sheetError);
          // Continue with local booking even if Google Sheets fails
        }
        
        const paymentInstructions = `Thanks for your booking! Once we receive your payment, your name will show up in 'Next session'.

📋 PAYMENT INSTRUCTIONS:
💰 Amount: $${booking.fee.toFixed(2)}
🏦 BSB: 633-000
🔢 Account: 225 395 003
📝 Reference: ${paymentReference}

⚠️ Please use the reference "${paymentReference}" for your payment.`;
        
        setBookingStatus({
          success: true,
          message: paymentInstructions
        });
      } else {
        setBookingStatus({
          success: false,
          message: 'Unable to book session. You may already have a booking for this session.'
        });
      }
    } catch (error) {
      setBookingStatus({
        success: false,
        message: 'Unable to book session. Please try again later.'
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSyncPlayer = async () => {
    setIsSyncingPlayer(true)
    setSyncValidation(null)
    
    try {
      console.log('Starting sync for player:', playerId);
      const result = await syncPlayerToSheets(playerId)
      console.log('Sync result:', result);
      
      if (result.success) {
        // Re-validate after successful sync
        const syncCheck = await isPlayerReadyForBooking(playerId)
        setSyncValidation(syncCheck)
      } else {
        setSyncValidation({ ready: false, message: `Sync failed: ${result.message}` })
      }
    } catch (error) {
      console.error('Sync error:', error);
      // Show more detailed error message
      setSyncValidation({ 
        ready: false, 
        message: `Failed to sync player data: ${error instanceof Error ? error.message : 'Server connection failed (404 error)'}` 
      })
    } finally {
      setIsSyncingPlayer(false)
    }
  }

  // Add the sync function HERE (before the return statement)
  const handleSyncFromGoogleSheets = async () => {
    setIsSyncing(true)
    setSyncStatus('')
    
    try {
      const result = await syncPlayersFromGoogleSheets()
      setSyncStatus(result.message)
    } catch (error) {
      setSyncStatus('Failed to sync players from Google Sheets')
    } finally {
      setIsSyncing(false)
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
            
            {isValidatingSync && (
              <p className="text-sm text-blue-600 mt-2">Validating sync status...</p>
            )}
            
            {syncValidation && !syncValidation.ready && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 text-sm">{syncValidation.message}</p>
                <button
                  onClick={handleSyncPlayer}
                  disabled={isSyncingPlayer}
                  className="mt-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
                >
                  {isSyncingPlayer ? 'Syncing...' : 'Sync Player Data'}
                </button>
              </div>
            )}
            
            {syncValidation?.ready && (
              <p className="text-sm text-green-600 mt-2">✅ Player data is synced and ready for booking!</p>
            )}
          </div>
          
          {/* Only show booking form if sync validation passes */}
          {syncValidation?.ready && (
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
                            {session.maxPlayers} spots available
                          </p>
                        </div>
                        <button
                          onClick={() => handleBookSession(session)}
                          disabled={isLoading || session.maxPlayers <= 0}
                          className={`w-full py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm ${
                            isLoading || session.maxPlayers <= 0
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
                            {session.maxPlayers} spots available
                          </p>
                        </div>
                        <button
                          onClick={() => handleBookSession(session)}
                          disabled={isLoading || session.maxPlayers <= 0}
                          className={`px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            isLoading || session.maxPlayers <= 0
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
          )}
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
      
      {/* Add development tools INSIDE the component */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-yellow-100 border border-yellow-300 rounded">
          <p className="text-sm text-yellow-800 mb-2">Development Tools:</p>
          <button
            onClick={handleSyncFromGoogleSheets}
            disabled={isSyncing}
            className="px-3 py-1 text-sm bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
          >
            {isSyncing ? 'Syncing...' : 'Force Sync from Sheets'}
          </button>
          {syncStatus && (
            <p className="text-sm text-yellow-700 mt-1">{syncStatus}</p>
          )}
        </div>
      )}
    </div>
  )
} // <- Component ends here