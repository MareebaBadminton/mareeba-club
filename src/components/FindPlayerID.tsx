'use client'

import { useState } from 'react'
import { syncPlayersFromGoogleSheets, getAllPlayers } from '@/lib/utils/playerUtils'
import type { Player } from '@/lib/types/player'

export default function FindPlayerID() {
  const [email, setEmail] = useState('')
  const [foundPlayer, setFoundPlayer] = useState<Player | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setFoundPlayer(null)

    try {
      // Sync players from Google Sheets first to get the latest data
      await syncPlayersFromGoogleSheets()

      // Get all players and search by email
      const allPlayers = await getAllPlayers()
      const player = allPlayers.find(
        (p: Player) => p.email.toLowerCase() === email.toLowerCase().trim()
      )

      if (player) {
        setFoundPlayer(player)
      } else {
        setError('No player found with this email address. Please check your email or register first.')
      }
    } catch (error) {
      console.error('Error finding player:', error)
      setError('Error searching for player. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setEmail('')
    setFoundPlayer(null)
    setError('')
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm">
      <p className="text-gray-600 mb-6">
        If you've registered but can't remember your Player ID, enter your email address below to retrieve it.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="findEmail" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="findEmail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300"
            placeholder="Enter your email address"
            required
            disabled={isLoading}
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className={`w-full py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isLoading || !email.trim()
              ? 'bg-blue-400 cursor-not-allowed text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Searching...' : 'Find My Player ID'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Success - Player Found */}
      {foundPlayer && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-semibold text-green-900 mb-3">✅ Player ID Found!</h3>
          <div className="space-y-2 text-green-800">
            <p><strong>Your Player ID:</strong> <span className="text-2xl font-bold text-green-600">{foundPlayer.id}</span></p>
            <p><strong>Name:</strong> {foundPlayer.firstName} {foundPlayer.lastName}</p>
            <p><strong>Email:</strong> {foundPlayer.email}</p>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-blue-800 text-sm font-medium">
              💡 <strong>Important:</strong> Save your Player ID ({foundPlayer.id}) somewhere safe. You'll need it to book sessions!
            </p>
          </div>
          
          <button
            onClick={handleReset}
            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Search Another Email
          </button>
        </div>
      )}
      
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Make sure to enter the exact email address you used when registering</li>
          <li>• Your Player ID is a unique 5-digit number</li>
          <li>• Keep your Player ID safe once you find it - you'll need it for booking sessions</li>
          <li>• If you can't find your email, you may need to register again</li>
        </ul>
      </div>
    </div>
  )
}