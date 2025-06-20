import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Get players from Supabase
    const { data: players, error } = await supabase
      .from('players')
      .select('*');

    if (error) {
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      players: players,
      message: `Loaded ${players.length} players from Supabase` 
    });
  } catch (error: any) {
    console.error('Sync API Error:', error);
    return NextResponse.json(
      { success: false, players: [], error: `Error fetching from Supabase: ${error.message}` },
      { status: 500 }
    );
  }
}