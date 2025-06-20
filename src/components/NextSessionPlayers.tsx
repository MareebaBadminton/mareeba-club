import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getNextSessionDate, getAllSessions } from '@/lib/utils/bookingUtils'
import type { Booking, Session, Player } from '@/lib/types/player'

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

      const sessions = await getAllSessions();
      const nextDate = await getNextSessionDate();

      if (!nextDate) {
        setError('No upcoming sessions found');
        setLoading(false);
        return;
      }

      const targetDate = new Date(nextDate)
      const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' })

      // Match irrespective of capitalisation / casing
      const session = sessions.find(
        s => s.dayOfWeek?.toLowerCase() === dayOfWeek.toLowerCase()
      )

      if (!session) {
        setError('No session configuration found for the next date');
        setLoading(false);
        return;
      }

      // Fetch *all* confirmed bookings for the target date, then match the times on the client so we
      // catch both legacy records that stored only the start time (e.g. "19:30") and newer records
      // that store the full range (e.g. "19:30-21:30").
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('player_id, session_time, players!inner(first_name,last_name)')
        .eq('session_date', nextDate)
        .eq('payment_confirmed', true)

      if (bookingsError) {
        throw bookingsError
      }

      // Accept session_time stored as just the startTime or the full range.
      const relevantBookings = bookings.filter((b: any) => {
        const t = b.session_time as string | null
        if (!t) return false
        return t === session.startTime || t === `${session.startTime}-${session.endTime}`
      })

      const players = relevantBookings.map((booking: any) => {
        const player = booking.players
        return player ? `${player.first_name} ${player.last_name}` : booking.player_id
      })

      const availableSpots = session.maxPlayers - players.length;

      setNextSession({
        date: nextDate,
        players,
        session,
        availableSpots
      })
      
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading next session:', error)
      setError('Error loading next session information')
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
  
    // Set up real-time subscription (keep as backup)
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings'
        },
        () => {
          loadNextSession();
        }
      )
      .subscribe();
  
    // Cleanup function
    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
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