import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getPlayersFromSheet, getBookingsFromSheet } from '@/lib/utils/googleSheets';

export async function GET(request: NextRequest) {
  const debug = {
    step: '',
    success: false,
    data: null as any,
    error: null as any
  };

  try {
    // Step 1: Test Supabase connection
    debug.step = 'Testing Supabase connection';
    const { data: testData, error: supabaseError } = await supabase
      .from('players')
      .select('count')
      .limit(1);
    
    if (supabaseError) {
      debug.error = `Supabase connection failed: ${supabaseError.message}`;
      return NextResponse.json(debug, { status: 500 });
    }
    
    debug.step = 'Supabase connection successful';

    // Step 2: Test Google Sheets connection
    debug.step = 'Testing Google Sheets connection';
    
    // Check environment variables
    const requiredEnvVars = [
      'GOOGLE_SHEETS_CLIENT_EMAIL',
      'GOOGLE_SHEETS_PRIVATE_KEY',
      'GOOGLE_SHEETS_SPREADSHEET_ID',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];
    
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingEnvVars.length > 0) {
      debug.error = `Missing environment variables: ${missingEnvVars.join(', ')}`;
      return NextResponse.json(debug, { status: 500 });
    }

    debug.step = 'Environment variables are set';

    // Step 3: Try to read from Google Sheets
    debug.step = 'Reading players from Google Sheets';
    const sheetsPlayers = await getPlayersFromSheet();
    
    debug.step = 'Reading bookings from Google Sheets';
    const sheetsBookings = await getBookingsFromSheet();
    
    debug.step = 'Google Sheets read successful';
    debug.success = true;
    debug.data = {
      supabaseConnected: true,
      environmentVariables: requiredEnvVars.reduce((acc, varName) => {
        acc[varName] = process.env[varName] ? 'SET' : 'MISSING';
        return acc;
      }, {} as Record<string, string>),
      googleSheetsData: {
        playersCount: sheetsPlayers.length,
        bookingsCount: sheetsBookings.length,
        samplePlayer: sheetsPlayers[0] || null,
        sampleBooking: sheetsBookings[0] || null
      }
    };

    return NextResponse.json(debug);
    
  } catch (error) {
    debug.error = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    };
    return NextResponse.json(debug, { status: 500 });
  }
} 