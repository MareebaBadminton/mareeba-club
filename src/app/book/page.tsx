'use client'

import { useState } from 'react'
import Navigation from '@/components/Navigation'
import { getPlayerById } from '@/lib/utils/playerUtils'
import { createBooking, getAvailableSessions } from '@/lib/utils/bookingUtils'
import type { Session } from '@/lib/types/player'
import { useForm } from 'react'

export default function BookPage() {
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

  const { register, handleSubmit } = useForm<BookingFormData>();
  const { register: registerPlayer, handleSubmit: handlePlayerSubmit } = useForm<PlayerFormData>();
  const { register: registerPayment, handleSubmit: handlePaymentSubmit } = useForm<PaymentFormData>();

  const handlePlayerIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setBookingStatus(null)

    try {
      const player = await getPlayerById(playerId)
      if (player) {
        setPlayerFound(true)
        setPlayerName(`${player.firstName} ${player.lastName}`)
      } else {
        setBookingStatus({
          success: false,
          message: 'Player ID not found. Please check and try again.'
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
        setBookingStatus({
          success: true,
          message: 'Session booked successfully!'
        })
      } else {
        setBookingStatus({
          success: false,
          message: 'Unable to book session. You may already have a booking for this session.'
        })
      }
    } catch (error) {
      setBookingStatus({
        success: false,
        message: 'Error booking session. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Get tomorrow's date in YYYY-MM-DD format
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div>
      <Navigation />
      <main className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Book a Session</h1>

        {/* Player ID Form */}
        {!playerFound && (
          <form onSubmit={handlePlayerIdSubmit} className="mb-8">
            <div className="space-y-4">
              <div>
                <label htmlFor="playerId" className="block text-sm font-medium text-gray-700 mb-1">
                  Enter your Player ID
                </label>
                <input
                  type="text"
                  id="playerId"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !playerId}
                className={`w-full py-2 px-4 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isLoading || !playerId
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Verifying...' : 'Continue'}
              </button>
            </div>
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
                  <h2 className="text-lg font-medium text-gray-900">Available Sessions</h2>
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
      </main>
    </div>
  )
} 