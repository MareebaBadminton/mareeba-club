'use client'

import { useState } from 'react'
import { getPlayerById, syncPlayersFromGoogleSheets } from '@/lib/utils/playerUtils'
import { createBooking, getAvailableSessions } from '@/lib/utils/bookingUtils'
import { createPayment } from '@/lib/utils/paymentUtils'
import type { Session } from '@/lib/types/player'

export default function BookingForm() {
  const [playerId, setPlayerId] = useState('')
  const [playerFound, setPlayerFound] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [availableSessions, setAvailableSessions] = useState<Session[]>([])
  const [bookingStatus, setBookingStatus] = useState<{
    success?: boolean;
    message: string;
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bankReference, setBankReference] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>('')

  const handlePlayerIdSubmit = async () => {
    setIsLoading(true)
    setBookingStatus(null)
  
    try {
      let player = await getPlayerById(playerId)
      
      if (player) {
        setPlayerFound(true)
        setPlayerName(`${player.firstName} ${player.lastName}`)
      } else {
        // Smart sync: Auto-sync and retry once if player not found
        setSyncStatus('Player not found. Syncing latest data from Google Sheets...')
        setIsSyncing(true)
        
        try {
          const syncResult = await syncPlayersFromGoogleSheets()
          setSyncStatus(syncResult.message)
          
          // Retry after sync
          const retryPlayer = await getPlayerById(playerId)
          if (retryPlayer) {
            setPlayerFound(true)
            setPlayerName(`${retryPlayer.firstName} ${retryPlayer.lastName}`)
            setSyncStatus('Player found after sync! ✅')
            return
          }
        } catch (syncError) {
          setSyncStatus('Failed to sync from Google Sheets')
        } finally {
          setIsSyncing(false)
        }
        
        // Show error only if still not found after sync
        setBookingStatus({
          success: false,
          message: 'Player ID not found even after syncing with Google Sheets. Please check your Player ID or contact support.'
        })
        setPlayerFound(false)
      }
    } catch (error) {
      setBookingStatus({
        success: false,
        message: 'Error verifying player ID. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateChange = async (date: string) => {
    setSelectedDate(date)
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

    try {
      const booking = await createBooking(
        playerId,
        selectedDate,
        `${session.startTime}-${session.endTime}`
      )

      if (booking) {
        // Generate payment reference FIRST
        const formatDateForReference = (dateStr: string) => {
          const [year, month, day] = dateStr.split('-');
          return `${year}${day}${month}`;
        };
        
        const paymentReference = `MB${playerId}${formatDateForReference(selectedDate)}`;
        
        // Create payment record
        const payment = await createPayment(booking.id, booking.fee, paymentReference);
        
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
        
        const paymentInstructions = (
          <div className="space-y-2">
            <div>Thanks for your booking, once we received your payment. Your name will be shown up in 'Next session'.</div>
            <div>📋 PAYMENT INSTRUCTIONS:</div>
            <div>💰 Amount: ${booking.fee.toFixed(2)}</div>
            <div>🏦 BSB: 633-000</div>
            <div>🔢 Account: 225 395 003</div>
            <div>📝 Reference: {paymentReference}</div>
            <div>⚠️ Please use the reference "{paymentReference}" for your payment.</div>
          </div>
        );
        
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

  // Get tomorrow's date in YYYY-MM-DD format
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Session</h2>

      {/* Bank Account Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Payment Information</h3>
        <p className="text-blue-800 mb-2">
          Please make your payment to:
        </p>
        <div className="grid gap-2 text-blue-700">
          <p>Bank: Bendigo Bank</p>
          <p>Account Name: Mareeba Badminton </p>
          <p>BSB: 633-000</p>
          <p>Account Number: 225 395 003
          </p>
          <p className="mt-2 font-medium">Fees:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Members: $8.00</li>
            <li>Non-members/Walk-in: $10.00</li>
          </ul>
          <p className="mt-2 text-sm font-medium">
            Important: Use your Player ID as the payment reference
          </p>
        </div>
      </div>

      {/* Player ID Form */}
      {!playerFound && (
        <form onSubmit={handlePlayerIdSubmit} className="space-y-4">
          <div>
            <label htmlFor="playerId" className="block text-sm font-medium text-gray-700 mb-1">
              Player ID
            </label>
            <input
              type="text"
              id="playerId"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              placeholder="Enter your 5-digit Player ID"
              className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
              required
            />
          </div>
          
          {/* Add sync button here */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Verify Player ID'}
            </button>
            
            <button
              type="button"
              onClick={handleSyncFromGoogleSheets}
              disabled={isSyncing}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              {isSyncing ? 'Syncing...' : 'Sync from Sheets'}
            </button>
          </div>
          
          {syncStatus && (
            <p className={`text-sm ${
              syncStatus.includes('Successfully') ? 'text-green-600' : 'text-red-600'
            }`}>
              {syncStatus}
            </p>
          )}
        </form>
      )}

      {/* Booking Interface */}
      {playerFound && (
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-blue-700">
              Booking for: <span className="font-medium">{playerName}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <input
                type="date"
                id="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
              />
            </div>

            {selectedDate && availableSessions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Available Sessions</h3>
                
                {/* REMOVE: Bank Reference Input */}
                {/* <div className="mb-4">
                  <label htmlFor="bankReference" className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Payment Reference
                  </label>
                  <input
                    type="text"
                    id="bankReference"
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                    placeholder="Enter your bank payment reference"
                    className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    This helps us match your payment to your booking
                  </p>
                </div> */}

                <div className="grid gap-4">
                  {availableSessions.map((session) => (
                    <div
                      key={session.id}
                      className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center"
                    >
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
          className={`mt-6 p-4 rounded-md ${
            bookingStatus.success
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {bookingStatus.message}
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