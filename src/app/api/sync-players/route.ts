import { NextRequest, NextResponse } from 'next/server';
import { getPlayersFromSheet } from '@/lib/utils/googleSheets';

export async function GET() {
  try {
    // Check if Google Sheets is properly configured
    const isGoogleSheetsConfigured = process.env.GOOGLE_SHEETS_SPREADSHEET_ID && 
                                   process.env.GOOGLE_SHEETS_SPREADSHEET_ID !== 'placeholder';

    if (!isGoogleSheetsConfigured) {
      return NextResponse.json({ 
        success: true, 
        players: [],
        message: 'Google Sheets not configured - using local storage only' 
      });
    }

    // Get players from Google Sheets
    const playersFromSheet = await getPlayersFromSheet();
    
    return NextResponse.json({ 
      success: true, 
      players: playersFromSheet,
      message: `Loaded ${playersFromSheet.length} players from Google Sheets` 
    });
  } catch (error) {
    console.error('Sync API Error:', error);
    return NextResponse.json(
      { success: true, players: [], error: 'Google Sheets unavailable - using local storage only' },
      { status: 200 }
    );
  }
}