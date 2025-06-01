'use client'

import { useState, useEffect } from 'react'
import { getAllBookings } from '@/lib/utils/bookingUtils'
import { getPlayerById } from '@/lib/utils/playerUtils'
import { getAllSessions } from '@/lib/utils/bookingUtils'
import type { Booking, Session, Player } from '@/lib/types/player'

export default function NextSessionPlayers() {
  const [nextSession, setNextSession] = useState<{
    date: string;
    time: string;
    players: { name: string; paymentStatus: string }[];
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadNextSession()
  }, [])

  const getNextSessionDate = (sessions: Session[]): string => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Get all possible upcoming sessions for the next 7 days
    const upcoming: { date: string; session: Session }[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Find sessions that match this day of week
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
      const matchingSessions = sessions.filter(s => s.dayOfWeek === dayOfWeek)
      
      matchingSessions.forEach(session => {
        upcoming.push({ date: dateStr, session })
      })
    }
    
    // Sort by date and time
    upcoming.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.session.startTime.localeCompare(b.session.startTime)
    })
    
    return upcoming[0]?.date || ''
  }

  const loadNextSession = async () => {
    try {
      setLoading(true)
      setError('')

      // Get all sessions and find the next one
      const sessions = await getAllSessions()
      const nextDate = getNextSessionDate(sessions)
      
      if (!nextDate) {
        setError('No upcoming sessions found')
        return
      }

      // Get all bookings for the next session
      const allBookings = await getAllBookings()
      const sessionBookings = allBookings.filter(
        booking => 
          booking.sessionDate === nextDate && 
          booking.status === 'confirmed'
      )

      // Get player details for each booking
      const playerPromises = sessionBookings.map(async booking => {
        const player = await getPlayerById(booking.playerId)
        return {
          name: player ? `${player.firstName} ${player.lastName}` : 'Unknown Player',
          paymentStatus: booking.paymentStatus
        }
      })

      const players = await Promise.all(playerPromises)
      
      // Get session time
      const sessionTime = sessionBookings[0]?.sessionTime || ''

      setNextSession({
        date: nextDate,
        time: sessionTime,
        players
      })
    } catch (error) {
      setError('Error loading next session information')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <p className="text-gray-600">Loading next session information...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!nextSession) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
        <p className="text-gray-600">No upcoming session found</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Next Session Players</h2>
      
      <div className="mb-6">
        <p className="text-gray-600">
          Date: <span className="font-medium">{new Date(nextSession.date).toLocaleDateString()}</span>
        </p>
        <p className="text-gray-600">
          Time: <span className="font-medium">{nextSession.time}</span>
        </p>
        <p className="text-gray-600">
          Players Registered: <span className="font-medium">{nextSession.players.length}</span>
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Registered Players</h3>
        {nextSession.players.length === 0 ? (
          <p className="text-gray-600">No players registered yet</p>
        ) : (
          <div className="grid gap-2">
            {nextSession.players.map((player, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 border border-gray-200 rounded-md flex justify-between items-center"
              >
                <span className="text-gray-900">{player.name}</span>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  player.paymentStatus === 'paid'
                    ? 'bg-green-100 text-green-800'
                    : player.paymentStatus === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {player.paymentStatus}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 