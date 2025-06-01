'use client'

import { useState } from 'react'
import { Player } from '@/types/Player'

export default function FindIds() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Player[]>([])

  const handleSearch = () => {
    const playersData = localStorage.getItem('players')
    if (!playersData) {
      setSearchResults([])
      return
    }

    const players: Player[] = JSON.parse(playersData)
    const results = players.filter(player => 
      player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      player.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setSearchResults(results)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Find Your Player ID</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name or email"
            className="flex-1 p-2 border rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Search
          </button>
        </div>

        {searchResults.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((player) => (
                  <tr key={player.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{player.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{player.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : searchTerm && (
          <p className="text-gray-600">No players found matching your search.</p>
        )}
      </div>
    </div>
  )
} 