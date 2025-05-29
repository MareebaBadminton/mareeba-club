'use client'

import { useState, useEffect } from 'react'
import { getAllBookings } from '@/lib/utils/bookingUtils'
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
  const [selectedDate, setSelectedDate] = useState<string>('')

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const loadBookings = async () => {
    try {
      setLoading(true)
      const allBookings = await getAllBookings()
      const sessions = await getAllSessions()
      
      // Filter bookings for selected date or get next session date if none selected
      const targetDate = selectedDate || getNextSessionDate(sessions)
      setSelectedDate(targetDate)

      const dateBookings = allBookings.filter(
        booking => booking.sessionDate === targetDate && booking.status === 'confirmed'
      )

      // Group bookings by session time
      const sessionBookings = await Promise.all(
        sessions.map(async (session) => {
          const sessionTimeStr = `${session.startTime}-${session.endTime}`
          const playersForSession = await Promise.all(
            dateBookings
              .filter(booking => booking.sessionTime === sessionTimeStr)
              .map(async (booking) => {
                const player = await getPlayerById(booking.playerId)
                return player ? {
                  id: player.id,
                  name: `${player.firstName} ${player.lastName}`
                } : null
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

  // Get the next session date
  const getNextSessionDate = (sessions: Session[]): string => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    // Find the next session
    let nextDate = new Date(today)
    let found = false
    let count = 0 // Prevent infinite loop
    
    while (!found && count < 7) {
      const dayName = daysOfWeek[nextDate.getDay()]
      if (sessions.some(session => session.dayOfWeek === dayName)) {
        found = true
      } else {
        nextDate.setDate(nextDate.getDate() + 1)
        count++
      }
    }
    
    return nextDate.toISOString().split('T')[0]
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Session Player List</h2>
      
      {/* Date Selection */}
      <div className="mb-6">
        <label htmlFor="sessionDate" className="block text-sm font-medium text-gray-700 mb-1">
          Select Date
        </label>
        <input
          type="date"
          id="sessionDate"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
        />
      </div>

      {loading ? (
        <p className="text-gray-600">Loading player list...</p>
      ) : (
        <div className="space-y-6">
          {bookings.map((sessionBooking) => (
            <div key={sessionBooking.sessionId} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {sessionBooking.players.length} Players Registered
              </h3>
              
              {sessionBooking.players.length > 0 ? (
                <div className="grid gap-2">
                  {sessionBooking.players.map((player) => (
                    <div key={player.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <span className="text-gray-900">{player.name}</span>
                      <span className="text-gray-500 text-sm">ID: {player.id}</span>
                    </div>
                  ))}
                </div>
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