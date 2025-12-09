import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('API: Setting up default sessions...');
    
    // Define the default sessions for Mareeba Badminton Club
    const defaultSessions = [
      {
        id: 'friday-evening',
        day_of_week: 'Friday',
        start_time: '19:45',
        end_time: '21:45',
        max_players: 20,
        fee: 8
      },
      {
        id: 'sunday-afternoon',
        day_of_week: 'Sunday',
        start_time: '15:00',
        end_time: '17:00',
        max_players: 20,
        fee: 8
      }
    ];
    
    console.log('Inserting sessions:', JSON.stringify(defaultSessions, null, 2));
    
    // Clear ALL existing sessions first to ensure no orphaned sessions remain
    // This is important when sessions are removed from defaultSessions (e.g., Monday session)
    // First, fetch all existing session IDs
    const { data: existingSessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id');
    
    if (fetchError) {
      console.log('Note: Could not fetch existing sessions (this is normal if table is empty)', fetchError.message);
    } else if (existingSessions && existingSessions.length > 0) {
      // Delete all existing sessions by their IDs
      const existingIds = existingSessions.map(s => s.id);
      const { error: deleteError } = await supabaseAdmin
        .from('sessions')
        .delete()
        .in('id', existingIds);
      
      if (deleteError) {
        console.log('Warning: Error deleting existing sessions', deleteError.message);
      } else {
        console.log(`✅ Cleared ${existingIds.length} existing session(s)`);
      }
    }
    
    // Insert the sessions using admin client
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert(defaultSessions)
      .select();
    
    if (error) {
      console.error('Error inserting sessions:', error);
      throw new Error(`Failed to insert sessions: ${error.message}`);
    }
    
    console.log(`✅ Successfully inserted ${data.length} sessions`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully created ${data.length} sessions`,
      sessions: data,
      schedule: {
        'Friday': '7:45 PM - 9:45 PM',
        'Sunday': '3:00 PM - 5:00 PM'
      }
    });
    
  } catch (error) {
    console.error('Sessions setup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : null
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Check current sessions using admin client
    const { data: existingSessions, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .order('day_of_week');
    
    if (error) {
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }
    
    return NextResponse.json({
      message: 'Current sessions in database',
      count: existingSessions.length,
      sessions: existingSessions,
      note: 'Use POST to create default sessions if none exist'
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 