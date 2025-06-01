'use client'

import { useState, useEffect } from 'react'
import { Player } from '@/types/Player'

interface Booking {
  sessionId: string
  playerId: string
  playerName: string
  date: string
  paymentStatus: 'pending' | 'paid'
}

export default function NextSession() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    // Load bookings and players from localStorage
    const loadData = () => {
      const bookingsData = localStorage.getItem('bookings')
      const playersData = localStorage.getItem('players')
      
      if (bookingsData) {
        const allBookings: Booking[] = JSON.parse(bookingsData)
        // Get only the upcoming bookings (today and future dates)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const upcomingBookings = allBookings.filter(booking => {
          const bookingDate = new Date(booking.date)
          return bookingDate >= today
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        
        setBookings(upcomingBookings)
      }

      if (playersData) {
        setPlayers(JSON.parse(playersData))
      }
    }

    loadData()
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Next Session Players</h1>
      
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
                  <tr key={`${booking.playerId}-${booking.date}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(booking.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.playerId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPlayerName(booking.playerId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
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
              Total Players: {bookings.length} / 24
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-gray-600">No upcoming sessions found.</p>
        </div>
      )}
    </div>
  )
} 