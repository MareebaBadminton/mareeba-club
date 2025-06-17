import { NextRequest, NextResponse } from 'next/server';
import { syncAllPlayersToSheet } from '@/lib/utils/googleSheets';
import { getAllPlayers } from '@/lib/utils/playerUtils';

export async function POST(request: NextRequest) {
  try {
    // Get all players from local storage
    const localPlayers = await getAllPlayers();
    
    if (localPlayers.length === 0) {
      return NextResponse.json({ 
        success: true, 
        synced: 0, 
        errors: 0, 
        message: 'No local players found to sync' 
      });
    }

    // Sync all players to Google Sheets
    const result = await syncAllPlayersToSheet(localPlayers);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        synced: 0, 
        errors: 1, 
        message: `Failed to sync players: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
} 