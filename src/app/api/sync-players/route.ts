import { NextRequest, NextResponse } from 'next/server';
import { getPlayersFromSheet } from '@/lib/utils/googleSheets';

export async function GET() {
  try {
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
      { success: false, error: 'Failed to sync players from Google Sheets' },
      { status: 500 }
    );
  }
}