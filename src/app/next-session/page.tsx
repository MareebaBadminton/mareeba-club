'use client'

import { useState, useEffect } from 'react'
import { Player } from '@/types/Player'
import { getData } from '@/lib/utils/storage'
import { Booking } from '@/lib/types/player'

export default function NextSession() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [nextSessionDate, setNextSessionDate] = useState<string | null>(null)

  const loadData = () => {
    // Use the proper storage utility instead of direct localStorage access
    const allBookings = getData<Booking>('BOOKINGS')
    const allPlayers = getData<Player>('PLAYERS')
    
    if (allBookings.length > 0) {
      // Get only the upcoming bookings with confirmed payments
      const now = new Date()
      
      const upcomingBookings = allBookings.filter(booking => {
        const bookingDate = new Date(booking.sessionDate)
        // Show bookings that haven't passed midnight yet
        const bookingEndOfDay = new Date(bookingDate)
        bookingEndOfDay.setHours(23, 59, 59, 999)
        
        return bookingEndOfDay > now && 
               booking.status === 'confirmed' &&
               booking.paymentStatus === 'paid'
      }).sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
      
      // Get the next session date (earliest upcoming session)
      if (upcomingBookings.length > 0) {
        const nextSession = upcomingBookings[0].sessionDate
        setNextSessionDate(nextSession)
        
        // Filter bookings for only the next session date
        const nextSessionBookings = upcomingBookings.filter(booking => 
          booking.sessionDate === nextSession
        )
        setBookings(nextSessionBookings)
      } else {
        setBookings([])
        setNextSessionDate(null)
      }
    } else {
      setBookings([])
      setNextSessionDate(null)
    }

    setPlayers(allPlayers)
  }

  useEffect(() => {
    // Initial load
    loadData()
    
    // Set up automatic refresh every minute to check for date changes
    const interval = setInterval(() => {
      loadData()
    }, 60000) // Check every minute
    
    // Also set up a specific check at midnight
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime()
    
    const midnightTimeout = setTimeout(() => {
      loadData()
      // Set up daily refresh at midnight
      const dailyInterval = setInterval(() => {
        loadData()
      }, 24 * 60 * 60 * 1000) // Every 24 hours
      
      return () => clearInterval(dailyInterval)
    }, msUntilMidnight)
    
    return () => {
      clearInterval(interval)
      clearTimeout(midnightTimeout)
    }
  }, [])

  const getPlayerName = (playerId: string): string => {
    const player = players.find(p => p.id === playerId)
    return player ? player.name : 'Unknown Player'
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string, timeString: string): string => {
    const date = new Date(dateString)
    const [startTime] = timeString.split('-')
    const [hours, minutes] = startTime.split(':')
    date.setHours(parseInt(hours), parseInt(minutes))
    
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Next Session Players</h1>
      
      {nextSessionDate && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900">
            Next Session: {formatDate(nextSessionDate)}
          </h2>
          <p className="text-sm text-blue-700 mt-1">
            This page automatically updates after each session ends at 11:59 PM
          </p>
        </div>
      )}
      
      {bookings.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map((booking, index) => (
                  <tr key={`${booking.playerId}-${booking.sessionDate}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(booking.sessionDate, booking.sessionTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.playerId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPlayerName(booking.playerId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {booking.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-gray-50 px-6 py-4">
            <p className="text-sm text-gray-500">
              Total Players: {bookings.length} / 20
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-gray-600">No upcoming sessions found with confirmed payments.</p>
        </div>
      )}
    </div>
  )
}