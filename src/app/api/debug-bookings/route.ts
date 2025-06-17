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

export async function GET(request: NextRequest) {
  try {
    console.log('Debug: Analyzing bookings data...');
    
    // Get bookings from sheets
    const sheetsBookings = await getBookingsFromSheet();
    console.log(`Found ${sheetsBookings.length} bookings in Google Sheets`);
    
    // Get all players from Supabase to check if player IDs exist
    const { data: supabasePlayers, error: playersError } = await supabase
      .from('players')
      .select('id');
    
    if (playersError) {
      return NextResponse.json({
        error: 'Failed to fetch players from Supabase',
        details: playersError
      }, { status: 500 });
    }
    
    const validPlayerIds = new Set(supabasePlayers.map(p => p.id));
    
    // Analyze bookings data
    const bookingsAnalysis = sheetsBookings.map((booking, index) => {
      const uniqueId = `${booking.playerId}_${booking.sessionDate}_${index}`;
      
      const analysis = {
        index,
        originalBooking: booking,
        transformedBooking: {
          id: uniqueId,
          player_id: booking.playerId,
          session_date: booking.sessionDate,
          session_time: '19:30',
          status: 'confirmed' as const,
          payment_reference: booking.paymentReference || null,
          payment_confirmed: booking.paymentStatus === 'paid',
          created_at: parseGoogleSheetsDate(booking.createdAt)
        },
        validations: {
          playerExists: validPlayerIds.has(booking.playerId),
          sessionDateFormat: /^\d{4}-\d{2}-\d{2}$/.test(booking.sessionDate),
          paymentStatusValid: ['pending', 'paid', 'failed'].includes(booking.paymentStatus),
          dateParsingResult: parseGoogleSheetsDate(booking.createdAt)
        }
      };
      
      return analysis;
    });
    
    // Count issues
    const invalidPlayerIds = bookingsAnalysis.filter(b => !b.validations.playerExists);
    const invalidDates = bookingsAnalysis.filter(b => !b.validations.sessionDateFormat);
    const invalidPaymentStatus = bookingsAnalysis.filter(b => !b.validations.paymentStatusValid);
    
    // Try inserting just the first valid booking to test
    const validBookings = bookingsAnalysis.filter(b => 
      b.validations.playerExists && 
      b.validations.sessionDateFormat && 
      b.validations.paymentStatusValid
    );
    
    let testInsertResult = null;
    if (validBookings.length > 0) {
      try {
        const testBooking = validBookings[0].transformedBooking;
        const { data, error } = await supabase
          .from('bookings')
          .insert([testBooking])
          .select();
        
        testInsertResult = {
          success: !error,
          error: error?.message || null,
          data: data
        };
      } catch (testError) {
        testInsertResult = {
          success: false,
          error: testError instanceof Error ? testError.message : 'Unknown error',
          data: null
        };
      }
    }
    
    return NextResponse.json({
      summary: {
        totalBookings: sheetsBookings.length,
        validPlayers: supabasePlayers.length,
        invalidPlayerIdCount: invalidPlayerIds.length,
        invalidDateCount: invalidDates.length,
        invalidPaymentStatusCount: invalidPaymentStatus.length,
        validBookingsCount: validBookings.length
      },
      issues: {
        invalidPlayerIds: invalidPlayerIds.slice(0, 5), // First 5 issues
        invalidDates: invalidDates.slice(0, 5),
        invalidPaymentStatus: invalidPaymentStatus.slice(0, 5)
      },
      testInsert: testInsertResult,
      sampleValidBooking: validBookings[0] || null,
      validPlayerIds: Array.from(validPlayerIds).slice(0, 10) // First 10 valid player IDs
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
} 