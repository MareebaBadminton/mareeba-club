import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getBookingsFromSheet } from '@/lib/utils/googleSheets';

// Function to convert Google Sheets date format to ISO string
function parseGoogleSheetsDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return new Date().toISOString();
  }
}

// Type definitions
interface TransformedBooking {
  id: string;
  player_id: string;
  session_date: string;
  session_time: string;
  status: 'confirmed';
  payment_reference: string | null;
  payment_confirmed: boolean;
  created_at: string;
}

interface InvalidBooking {
  booking: TransformedBooking;
  originalData: any;
  reason: string;
}

interface FailedInsert {
  error: string;
  bookings: TransformedBooking[];
}

export async function POST(request: NextRequest) {
  try {
    console.log('API: Starting bookings-only migration...');
    
    // Get bookings from sheets
    const sheetsBookings = await getBookingsFromSheet();
    console.log(`Found ${sheetsBookings.length} bookings in Google Sheets`);
    
    // Get all players from Supabase to validate references
    const { data: supabasePlayers, error: playersError } = await supabase
      .from('players')
      .select('id, first_name, last_name');
    
    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`);
    }
    
    const validPlayerIds = new Set(supabasePlayers.map(p => p.id));
    console.log(`Found ${supabasePlayers.length} valid players in Supabase`);
    
    // Separate valid and invalid bookings
    const validBookings: TransformedBooking[] = [];
    const invalidBookings: InvalidBooking[] = [];
    
    sheetsBookings.forEach((booking, index) => {
      const uniqueId = `${booking.playerId}_${booking.sessionDate}_${index}`;
      
      const transformedBooking: TransformedBooking = {
        id: uniqueId,
        player_id: booking.playerId,
        session_date: booking.sessionDate,
        session_time: '19:30',
        status: 'confirmed' as const,
        payment_reference: booking.paymentReference || null,
        payment_confirmed: booking.paymentStatus === 'paid',
        created_at: parseGoogleSheetsDate(booking.createdAt)
      };
      
      if (validPlayerIds.has(booking.playerId)) {
        validBookings.push(transformedBooking);
      } else {
        invalidBookings.push({
          booking: transformedBooking,
          originalData: booking,
          reason: `Player ID ${booking.playerId} not found in Supabase`
        });
      }
    });
    
    console.log(`Valid bookings: ${validBookings.length}, Invalid: ${invalidBookings.length}`);
    
    let successfulInserts = 0;
    const failedInserts: FailedInsert[] = [];
    
    // Insert valid bookings
    if (validBookings.length > 0) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .upsert(validBookings, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select();
        
        if (error) {
          console.error('Error inserting bookings:', error);
          failedInserts.push({
            error: error.message,
            bookings: validBookings
          });
        } else {
          successfulInserts = data?.length || validBookings.length;
          console.log(`✅ Successfully inserted ${successfulInserts} bookings`);
        }
      } catch (insertError) {
        console.error('Insert error:', insertError);
        failedInserts.push({
          error: insertError instanceof Error ? insertError.message : 'Unknown error',
          bookings: validBookings
        });
      }
    }
    
    // Create summary report
    const report = {
      success: true,
      summary: {
        totalBookingsFound: sheetsBookings.length,
        validBookingsCount: validBookings.length,
        invalidBookingsCount: invalidBookings.length,
        successfulInserts,
        failedInserts: failedInserts.length
      },
      details: {
        insertedBookings: successfulInserts,
        invalidBookings: invalidBookings.map(ib => ({
          playerName: ib.originalData.playerName,
          playerId: ib.originalData.playerId,
          sessionDate: ib.originalData.sessionDate,
          reason: ib.reason
        })),
        availablePlayers: supabasePlayers.map(p => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`
        }))
      }
    };
    
    let message = `Migration completed! `;
    if (successfulInserts > 0) {
      message += `${successfulInserts} bookings imported successfully. `;
    }
    if (invalidBookings.length > 0) {
      message += `${invalidBookings.length} bookings skipped due to missing players. `;
    }
    if (failedInserts.length > 0) {
      message += `${failedInserts.length} bookings failed to insert. `;
    }
    
    return NextResponse.json({
      ...report,
      message
    });
    
  } catch (error) {
    console.error('Bookings migration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to migrate bookings from Google Sheets to Supabase',
    description: 'This endpoint migrates only valid bookings and reports on any issues'
  });
} 