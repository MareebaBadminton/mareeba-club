import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPlayersFromSheet, getBookingsFromSheet } from '@/lib/utils/googleSheets';

// Function to convert Google Sheets date format to ISO string
function parseGoogleSheetsDate(dateString: string): string {
  try {
    // Handle formats like "6/13/2025, 8:52:03 AM" or similar
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // If invalid date, use current date
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return new Date().toISOString();
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting Google Sheets to Supabase migration...');
    
    // Get data from Google Sheets
    const sheetsPlayers = await getPlayersFromSheet();
    const sheetsBookings = await getBookingsFromSheet();
    
    console.log(`Found ${sheetsPlayers.length} players and ${sheetsBookings.length} bookings in Google Sheets`);
    
    let playersCount = 0;
    let bookingsCount = 0;
    let sessionsCount = 0;
    
    // Migrate players from sheets
    if (sheetsPlayers.length > 0) {
      const playersToInsert = sheetsPlayers.map(player => ({
        id: player.id,
        first_name: player.firstName,
        last_name: player.lastName,
        email: player.email.toLowerCase(), // Ensure lowercase email
        registered_at: parseGoogleSheetsDate(player.registeredAt)
      }));
      
      console.log('Sample player data to insert:', JSON.stringify(playersToInsert[0], null, 2));
      
      const { error: playersError } = await supabase
        .from('players')
        .upsert(playersToInsert, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (playersError) {
        console.error('Error migrating players from sheets:', playersError);
        // Don't throw error, continue with migration but log the issue
        console.log('Continuing with booking migration despite player error...');
      } else {
        playersCount = sheetsPlayers.length;
        console.log(`✅ Migrated ${playersCount} players from Google Sheets`);
      }
    }
    
    // Migrate bookings from sheets
    if (sheetsBookings.length > 0) {
      const bookingsData = sheetsBookings.map((booking, index) => {
        // Generate a more reliable unique ID
        const uniqueId = `${booking.playerId}_${booking.sessionDate}_${index}`;
        
        return {
          id: uniqueId,
          player_id: booking.playerId,
          session_date: booking.sessionDate, // This should already be in YYYY-MM-DD format
          session_time: '19:30', // Default session time since it's not in sheets
          status: 'confirmed' as const,
          payment_reference: booking.paymentReference || null,
          payment_confirmed: booking.paymentStatus === 'paid',
          created_at: parseGoogleSheetsDate(booking.createdAt)
        };
      });
      
      console.log('Sample booking data to insert:', JSON.stringify(bookingsData[0], null, 2));
      
      const { error: bookingsError } = await supabase
        .from('bookings')
        .upsert(bookingsData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });
      
      if (bookingsError) {
        console.error('Error migrating bookings from sheets:', bookingsError);
        // Continue but log the error
        console.log('Booking migration failed, but continuing with sessions...');
      } else {
        bookingsCount = sheetsBookings.length;
        console.log(`✅ Migrated ${bookingsCount} bookings from Google Sheets`);
      }
    }
    
    // Migrate default sessions
    const defaultSessions = [
      {
        id: 'friday-evening',
        day_of_week: 'Friday',
        start_time: '19:30',
        end_time: '21:30',
        max_players: 20,
        fee: 8
      },
      {
        id: 'sunday-afternoon',
        day_of_week: 'Sunday',
        start_time: '14:30',
        end_time: '16:30',
        max_players: 20,
        fee: 8
      },
      {
        id: 'monday-evening',
        day_of_week: 'Monday',
        start_time: '20:00',
        end_time: '22:00',
        max_players: 20,
        fee: 8
      }
    ];
    
    const { error: sessionsError } = await supabase
      .from('sessions')
      .upsert(defaultSessions, { onConflict: 'id' });
    
    if (sessionsError) {
      console.error('Error migrating sessions:', sessionsError);
      // Continue but log the error
    } else {
      sessionsCount = defaultSessions.length;
      console.log(`✅ Migrated ${sessionsCount} sessions`);
    }
    
    console.log('🎉 Google Sheets migration completed!');
    
    return NextResponse.json({
      success: true,
      message: `Migration completed! Attempted to migrate ${sheetsPlayers.length} players and ${sheetsBookings.length} bookings. Check Supabase for results.`,
      data: {
        playersAttempted: sheetsPlayers.length,
        bookingsAttempted: sheetsBookings.length,
        sessionsCount: sessionsCount,
        playersCount,
        bookingsCount
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('API: Migration error:', error);
    return NextResponse.json({
      success: false,
      message: 'Migration failed due to server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to start migration from Google Sheets to Supabase',
    endpoints: {
      'POST /api/migrate-sheets': 'Migrate all data from Google Sheets to Supabase'
    }
  });
} 