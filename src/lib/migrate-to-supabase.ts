import { supabase } from './supabase'
import { getData } from './utils/storage'
import type { Player, Booking, Session } from './types/player'

// Migrate from localStorage to Supabase
export const migrateLocalStorageToSupabase = async () => {
  try {
    console.log('Starting migration from localStorage to Supabase...')
    
    // Get data from localStorage
    const localPlayers = getData<Player>('PLAYERS')
    const localBookings = getData<Booking>('BOOKINGS')
    
    console.log(`Found ${localPlayers.length} players and ${localBookings.length} bookings in localStorage`)
    
    // Migrate players
    if (localPlayers.length > 0) {
      const playersToInsert = localPlayers.map(player => ({
        id: player.id,
        first_name: player.firstName,
        last_name: player.lastName,
        email: player.email,
        registered_at: player.registeredAt
      }))
      
      const { error: playersError } = await supabase
        .from('players')
        .upsert(playersToInsert, { onConflict: 'id' })
      
      if (playersError) {
        console.error('Error migrating players:', playersError)
        throw playersError
      }
      
      console.log(`✅ Migrated ${localPlayers.length} players from localStorage`)
    }
    
    // Migrate bookings
    if (localBookings.length > 0) {
      const bookingsData = localBookings.map(booking => ({
        id: booking.id,
        player_id: booking.playerId,
        session_date: booking.sessionDate,
        session_time: booking.sessionTime,
        status: booking.status,
        payment_reference: null,
        payment_confirmed: booking.paymentStatus === 'paid',
        created_at: booking.createdAt
      }))
      
      const { error: bookingsError } = await supabase
        .from('bookings')
        .upsert(bookingsData, { onConflict: 'id' })
      
      if (bookingsError) {
        console.error('Error migrating bookings:', bookingsError)
        throw bookingsError
      }
      
      console.log(`✅ Migrated ${localBookings.length} bookings from localStorage`)
    }
    
    console.log('🎉 LocalStorage migration completed successfully!')
    
    return {
      success: true,
      playersCount: localPlayers.length,
      bookingsCount: localBookings.length
    }
    
  } catch (error) {
    console.error('LocalStorage migration failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Google Sheets migration - moved to API route only
export const migrateGoogleSheetsToSupabase = async () => {
  try {
    // This function now calls the API route instead of direct Google Sheets access
    const response = await fetch('/api/migrate-sheets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Migration failed')
    }
    
    return result
    
  } catch (error) {
    console.error('Google Sheets migration failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}