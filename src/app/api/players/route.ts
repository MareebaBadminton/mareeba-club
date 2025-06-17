import { NextRequest, NextResponse } from 'next/server';
import { addPlayerToSheet, getPlayersFromSheet } from '@/lib/utils/googleSheets';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const playerData = await request.json();
    
    // STEP 1: Save to Supabase FIRST (primary database)
    try {
      // Check if email already exists in Supabase
      const { data: existingPlayer, error: checkError } = await supabase
        .from('players')
        .select('email')
        .eq('email', playerData.email.toLowerCase())
        .single();
      
      if (existingPlayer) {
        return NextResponse.json(
          { success: false, error: 'This email address is already registered. Each email can only be used for one player account.' },
          { status: 400 }
        );
      }
      
      // Insert new player into Supabase
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert([{
          id: playerData.id,
          first_name: playerData.firstName,
          last_name: playerData.lastName,
          email: playerData.email.toLowerCase(),
          registered_at: playerData.registeredAt
        }])
        .select()
        .single();
      
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        throw insertError;
      }
      
      console.log('✅ Player saved to Supabase successfully:', newPlayer.id);
      
    } catch (supabaseError) {
      console.error('❌ Supabase save failed:', supabaseError);
      return NextResponse.json(
        { success: false, error: 'Failed to save player data. Please try again.' },
        { status: 500 }
      );
    }
    
    // STEP 2: Save to Google Sheets as backup (optional)
    const isGoogleSheetsConfigured = process.env.GOOGLE_SHEETS_SPREADSHEET_ID && 
                                   process.env.GOOGLE_SHEETS_SPREADSHEET_ID !== 'placeholder';

    if (isGoogleSheetsConfigured) {
      try {
        await addPlayerToSheet(playerData);
        console.log('✅ Player also saved to Google Sheets as backup');
      } catch (sheetsError) {
        console.warn('⚠️ Google Sheets backup failed (continuing anyway):', sheetsError);
        // Don't fail the registration if Google Sheets fails - Supabase is primary
      }
    } else {
      console.log('ℹ️ Google Sheets not configured - Supabase only');
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Player registered successfully',
      playerId: playerData.id
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process player registration' },
      { status: 500 }
    );
  }
}