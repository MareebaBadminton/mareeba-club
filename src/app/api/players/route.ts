import { NextRequest, NextResponse } from 'next/server';
import { addPlayerToSheet } from '@/lib/utils/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const playerData = await request.json();
    
    // Add to Google Sheets
    await addPlayerToSheet(playerData);
    
    return NextResponse.json({ success: true, message: 'Player added to Google Sheets' });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add player to Google Sheets' },
      { status: 500 }
    );
  }
}