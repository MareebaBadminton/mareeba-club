'use client'

import { useState, useEffect } from 'react'
import { getAllBookings, getNextSessionDate } from '@/lib/utils/bookingUtils'
import { getPlayerById } from '@/lib/utils/playerUtils'
import { getAllSessions } from '@/lib/utils/bookingUtils'
import type { Booking, Session, Player } from '@/lib/types/player'

export default function SessionPlayerList() {
  const [bookings, setBookings] = useState<{
    sessionId: string;
    date: string;
    players: { id: string; name: string }[];
  }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true)
        const sessions = await getAllSessions()
        
        // Filter bookings for selected date or get next session date if none selected
        const targetDate = selectedDate || await getNextSessionDate() // Now properly async
        
        const allBookings = await getAllBookings()
        const confirmedBookings = allBookings.filter(
          booking => booking.sessionDate === targetDate && booking.status === 'confirmed'
        )

        // Group bookings by session time
        const sessionBookings = await Promise.all(
          sessions.map(async (session) => {
            const sessionTimeStr = `${session.startTime}-${session.endTime}`
            const playersForSession = await Promise.all(
              confirmedBookings
                .filter(booking => booking.sessionTime === sessionTimeStr)
                .map(async (booking) => {
                  const player = await getPlayerById(booking.playerId)
                  return player ? { id: player.id, name: `${player.firstName} ${player.lastName}` } : null
                })
            )

            return {
              sessionId: session.id,
              date: targetDate,
              players: playersForSession.filter((p): p is { id: string; name: string } => p !== null)
            }
          })
        )

        setBookings(sessionBookings)
      } catch (error) {
        console.error('Error loading bookings:', error)
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, [selectedDate])



  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Player List</h2>
      
      <div className="mb-6">
        <label htmlFor="sessionDate" className="block text-sm font-medium text-gray-700 mb-1">
          Select Date (leave empty for next session)
        </label>
        <input
          type="date"
          id="sessionDate"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-600">Loading...</p>
      ) : (
        <div className="space-y-6">
          {bookings.map((sessionBooking) => (
            <div key={sessionBooking.sessionId} className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                {sessionBooking.players.length} Players Registered
              </h3>
              
              {sessionBooking.players.length > 0 ? (
                <ul className="space-y-1">
                  {sessionBooking.players.map((player) => (
                    <li key={player.id} className="text-gray-700">
                      {player.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No players registered for this session yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}