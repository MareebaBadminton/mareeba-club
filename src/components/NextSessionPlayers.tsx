'use client'

import { useState, useEffect } from 'react'
import { getAllBookings } from '@/lib/utils/bookingUtils'
import { getPlayerById } from '@/lib/utils/playerUtils'
import { getAllSessions } from '@/lib/utils/bookingUtils'
import type { Booking, Session, Player } from '@/lib/types/player'

export default function NextSessionPlayers() {
  const [nextSession, setNextSession] = useState<{
    date: string;
    players: string[];
    session: Session;
    availableSpots: number;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadNextSession()
  }, [])

  const getNextSessionDate = (sessions: Session[]): { date: string; session: Session } | null => {
    const now = new Date()
    
    // Get all possible upcoming sessions for the next 14 days
    const upcoming: { date: string; session: Session }[] = []
    for (let i = 0; i < 14; i++) { // Start from today (i=0)
      const date = new Date(now)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Find sessions that match this day of week
      const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
      const matchingSessions = sessions.filter(s => s.dayOfWeek === dayOfWeek)
      
      matchingSessions.forEach(session => {
        // For today, only include sessions that haven't started yet
        if (i === 0) {
          const sessionTime = new Date(date)
          const [hours, minutes] = session.startTime.split(':')
          sessionTime.setHours(parseInt(hours), parseInt(minutes))
          
          if (sessionTime > now) {
            upcoming.push({ date: dateStr, session })
          }
        } else {
          upcoming.push({ date: dateStr, session })
        }
      })
    }
    
    // Sort by date and time
    upcoming.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date)
      if (dateCompare !== 0) return dateCompare
      return a.session.startTime.localeCompare(b.session.startTime)
    })
    
    return upcoming[0] || null
  }

  const loadNextSession = async () => {
    try {
      setLoading(true)
      setError('')

      // Get all sessions and find the next one
      const sessions = await getAllSessions()
      const nextSessionInfo = getNextSessionDate(sessions)
      
      if (!nextSessionInfo) {
        setError('No upcoming sessions found')
        return
      }

      const { date: nextDate, session } = nextSessionInfo

      // Get all bookings for the next session
      const allBookings = await getAllBookings()
      const sessionBookings = allBookings.filter(
        booking => 
          booking.sessionDate === nextDate && 
          booking.status === 'confirmed' &&
          (booking.paymentStatus === 'paid' || booking.paymentStatus === 'confirmed')
      )

      // Get player names for each booking
      const playerPromises = sessionBookings.map(async booking => {
        const player = await getPlayerById(booking.playerId)
        return player ? `${player.firstName} ${player.lastName}` : 'Unknown Player'
      })

      const players = await Promise.all(playerPromises)
      
      // Calculate available spots
      const availableSpots = session.maxPlayers - players.length
      
      setNextSession({
        date: nextDate,
        players,
        session,
        availableSpots
      })
    } catch (error) {
      setError('Error loading next session information')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600">Loading next session...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!nextSession) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-600">No upcoming session found</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Next Session
        </h3>
        <p className="text-gray-700">
          {new Date(nextSession.date).toLocaleDateString('en-AU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          Available spots: {nextSession.availableSpots} of {nextSession.session.maxPlayers}
        </p>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-700 mb-3">Players signed up:</h4>
        {nextSession.players.length === 0 ? (
          <p className="text-gray-500 italic">No players registered yet</p>
        ) : (
          <ol className="space-y-2">
            {nextSession.players.map((playerName, index) => (
              <li key={index} className="text-gray-900">
                {playerName}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}