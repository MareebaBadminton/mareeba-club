import { useState, useEffect } from 'react'
import type { Session } from '@/lib/types/player'

export default function NextSessionPlayers() {
  const [nextSession, setNextSession] = useState<{
    date: string;
    players: string[];
    session: Session;
    availableSpots: number;
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadNextSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use API route to get next session data
      const response = await fetch('/api/bookings/next-session')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load next session')
      }

      const data = await response.json()

      setNextSession({
        date: data.date,
        players: data.players,
        session: data.session,
        availableSpots: data.availableSpots
      })
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading next session:', error)
      setError(error instanceof Error ? error.message : 'Error loading next session information')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial load
    loadNextSession();
  
    // Set up polling every 30 seconds
    const pollInterval = setInterval(() => {
      loadNextSession();
    }, 30000);
  
    // Cleanup function
    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">Loading next session...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadNextSession}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!nextSession) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No upcoming sessions found.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-lg font-semibold text-gray-800">
          {new Date(nextSession.date).toLocaleDateString('en-AU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        <button
          onClick={loadNextSession}
          className="text-blue-600 hover:text-blue-800 text-sm"
          title="Refresh data"
        >
          🔄 Refresh
        </button>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-600">
          {nextSession.session.startTime} - {nextSession.session.endTime}
        </p>
        <p className="text-sm text-gray-500">
          Available spots: {nextSession.availableSpots} of {nextSession.session.maxPlayers}
        </p>
      </div>

      <div className="space-y-2">
        {nextSession.players.length === 0 ? (
          <p className="text-gray-500 italic">No confirmed bookings yet</p>
        ) : (
          nextSession.players.map((playerName, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-gray-800">{playerName}</span>
            </div>
          ))
        )}
      </div>
      
      {lastUpdated && (
        <p className="text-xs text-gray-400 mt-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          ✨ <strong>Real-time updates:</strong> This list updates automatically when new bookings are made!
        </p>
      </div>
    </div>
  )
}