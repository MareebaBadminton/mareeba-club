'use client'

import { useState } from 'react'
import { getAllBookings, getPlayerBookings } from '@/lib/utils/bookingUtils'
import { getAllPlayers, getPlayerById } from '@/lib/utils/playerUtils'
import type { Booking, Player } from '@/lib/types/player'

export default function BookingLookup() {
  const [lookupMethod, setLookupMethod] = useState<'name' | 'id'>('name')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setBookings([])

    try {
      if (lookupMethod === 'name') {
        // Get all players with matching name
        const allPlayers = await getAllPlayers()
        const matchingPlayers = allPlayers.filter(
          (player: Player) => 
            player.firstName.toLowerCase() === firstName.toLowerCase() &&
            player.lastName.toLowerCase() === lastName.toLowerCase()
        )

        if (matchingPlayers.length === 0) {
          setError('No player found with this name')
          return
        }

        // Get all bookings for matching players
        const allBookings = await getAllBookings()
        const playerBookings = allBookings.filter(
          booking => matchingPlayers.some((player: Player) => player.id === booking.playerId)
        )

        if (playerBookings.length === 0) {
          setError('No bookings found for this player')
          return
        }

        setBookings(playerBookings)
      } else {
        // Look up by Player ID
        const player = await getPlayerById(playerId)
        if (!player) {
          setError('No player found with this ID')
          return
        }

        const playerBookings = await getPlayerBookings(playerId)
        if (playerBookings.length === 0) {
          setError('No bookings found for this player')
          return
        }

        setBookings(playerBookings)
      }
    } catch (error) {
      setError('Error looking up bookings. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Your Booking ID</h2>
      
      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setLookupMethod('name')}
            className={`flex-1 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              lookupMethod === 'name'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Search by Name
          </button>
          <button
            type="button"
            onClick={() => setLookupMethod('id')}
            className={`flex-1 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              lookupMethod === 'id'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Search by Player ID
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        {lookupMethod === 'name' ? (
          <>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                required
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
                required
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="playerId" className="block text-sm font-medium text-gray-700 mb-1">
              Player ID
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
        )}

        <button
          type="submit"
          disabled={isLoading || (lookupMethod === 'name' ? (!firstName || !lastName) : !playerId)}
          className={`w-full py-2 px-4 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isLoading || (lookupMethod === 'name' ? (!firstName || !lastName) : !playerId)
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Looking up...' : 'Find Bookings'}
        </button>
      </form>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700 mb-6">
          {error}
        </div>
      )}

      {bookings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Your Bookings</h3>
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="p-4 bg-gray-50 border border-gray-200 rounded-md"
            >
              <p className="font-medium text-gray-900">Booking ID: {booking.id}</p>
              <p className="text-gray-600">Date: {booking.sessionDate}</p>
              <p className="text-gray-600">Time: {booking.sessionTime}</p>
              <p className="text-gray-600">
                Status: <span className="capitalize">{booking.status}</span>
              </p>
              <p className="text-gray-600">
                Payment: <span className="capitalize">{booking.paymentStatus}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 