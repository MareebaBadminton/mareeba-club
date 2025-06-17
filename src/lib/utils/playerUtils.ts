import { supabase } from '../supabase';
import { getData, setData } from './storage';
import { getAustralianDateTimeISO } from './dateUtils';
import type { Player, PlayerSyncStatus } from '@/lib/types/player';

// Generate a short 5-character numeric ID
function generateShortId(): string {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Ensure unique ID generation
async function generateUniqueId(): Promise<string> {
  const players = await getAllPlayers();
  let newId: string;
  
  do {
    newId = generateShortId();
  } while (players.some(player => player.id === newId));
  
  return newId;
}

// Get all players from Supabase
export async function getAllPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching players:', error)
    return []
  }
  
  return data.map(player => ({
    id: player.id,
    firstName: player.first_name,
    lastName: player.last_name,
    email: player.email,
    phone: player.phone,
    emergencyContact: player.emergency_contact,
    emergencyPhone: player.emergency_phone,
    registeredAt: player.registered_at
  }))
}

// Get player by ID from Supabase
// Update convertSupabaseToPlayer function
// Remove the old function and keep only the clean version
function convertSupabaseToPlayer(players: any[]): Player[] {
  return players.map(player => ({
    id: player.id,
    firstName: player.first_name,
    lastName: player.last_name,
    email: player.email,
    registeredAt: player.registered_at
  }))
}

// Update getPlayerById function
export async function getPlayerById(id: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching player:', error)
    return null
  }
  
  if (!data) return null
  
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    registeredAt: data.registered_at
  }
}

// Get player by email from Supabase
export async function getPlayerByEmail(email: string): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('email', email.toLowerCase())
    .single()
  
  if (error) {
    console.error('Error fetching player by email:', error)
    return null
  }
  
  if (!data) return null
  
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    registeredAt: data.registered_at
  }
}

// Get sync status for a player
export async function getPlayerSyncStatus(playerId: string): Promise<PlayerSyncStatus | null> {
  const syncStatuses = getData<PlayerSyncStatus>('PLAYER_SYNC_STATUS');
  return syncStatuses.find(status => status.playerId === playerId) || null;
}

// Update sync status
export async function updatePlayerSyncStatus(playerId: string, synced: boolean, error?: string): Promise<void> {
  const syncStatuses = getData<PlayerSyncStatus>('PLAYER_SYNC_STATUS');
  const existingIndex = syncStatuses.findIndex(status => status.playerId === playerId);
  
  const newStatus: PlayerSyncStatus = {
    playerId,
    syncedToSheets: synced,
    lastSyncAttempt: getAustralianDateTimeISO(),
    syncError: error
  };
  
  if (existingIndex >= 0) {
    syncStatuses[existingIndex] = newStatus;
  } else {
    syncStatuses.push(newStatus);
  }
  
  setData('PLAYER_SYNC_STATUS', syncStatuses);
}

// Check if email is already registered (local + Google Sheets)
export async function isEmailRegistered(email: string): Promise<boolean> {
  // First check local storage
  const localPlayer = await getPlayerByEmail(email);
  if (localPlayer) {
    return true;
  }
  
  // Also check Google Sheets if we're on the client side
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/sync-players');
      const data = await response.json();
      
      if (data.success && data.players) {
        const emailExistsInSheets = data.players.some(
          (player: any) => player.email.toLowerCase() === email.toLowerCase()
        );
        return emailExistsInSheets;
      }
    } catch (error) {
      console.warn('Could not check Google Sheets for email validation:', error);
      // Fall back to local check only
    }
  }
  
  return false;
}

// Add new player to Supabase
export async function addPlayer(playerData: Omit<Player, 'id' | 'registeredAt'>): Promise<{ success: boolean; player?: Player; error?: string }> {
  try {
    const newPlayer = {
      first_name: playerData.firstName,
      last_name: playerData.lastName,
      email: playerData.email.toLowerCase()
    }
    
    const { data, error } = await supabase
      .from('players')
      .insert([newPlayer])
      .select()
      .single()
    
    if (error) {
      console.error('Error adding player:', error)
      return { success: false, error: error.message }
    }
    
    const player: Player = {
      id: data.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email,
      registeredAt: data.registered_at
    }
    
    return { success: true, player }
  } catch (error) {
    console.error('Error adding player:', error)
    return { success: false, error: 'Failed to add player' }
  }
}

// Enhanced createPlayer with Supabase-first approach
export async function createPlayer(playerData: Omit<Player, 'id' | 'registeredAt'>): Promise<Player> {
  try {
    // Generate unique ID
    const playerId = await generateUniqueId();
    
    const newPlayer: Player = {
      ...playerData,
      id: playerId,
      registeredAt: getAustralianDateTimeISO(),
    };

    // STEP 1: Save to Supabase via API (primary database)
    const response = await fetch('/api/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newPlayer),
    });

    const result = await response.json();
    
    if (!response.ok) {
      // If API fails, don't save locally either
      throw new Error(result.error || 'Failed to register player');
    }
    
    console.log('✅ Player registered successfully in Supabase:', newPlayer.id);
    
    // STEP 2: Also save to localStorage for immediate local access
    const localPlayers = getData('PLAYERS') as Player[];
    localPlayers.push(newPlayer);
    setData('PLAYERS', localPlayers);
    
    // STEP 3: Mark as synced since it went through Supabase
    await updatePlayerSyncStatus(newPlayer.id, true);
    
    return newPlayer;
    
  } catch (error) {
    console.error('Player registration failed:', error);
    throw error; // Re-throw to show user the actual error
  }
}

// Check if player is ready for booking - UPDATED for Supabase migration
export async function isPlayerReadyForBooking(playerId: string): Promise<{ ready: boolean; message?: string }> {
  const player = await getPlayerById(playerId);
  if (!player) {
    return { ready: false, message: 'Player not found. Please check your Player ID.' };
  }
  
  // Since we've migrated to Supabase, if the player exists in Supabase, they're ready to book
  return { ready: true };
}

// Manual sync function for individual player
export async function syncPlayerToSheets(playerId: string): Promise<{ success: boolean; message: string }> {
  const player = await getPlayerById(playerId);
  if (!player) {
    return { success: false, message: 'Player not found' };
  }
  
  try {
    const response = await fetch('/api/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(player),
    });
    
    const result = await response.json();
    
    if (response.ok) {
      await updatePlayerSyncStatus(playerId, true);
      return { success: true, message: 'Player data synced successfully!' };
    } else {
      await updatePlayerSyncStatus(playerId, false, result.error);
      return { success: false, message: result.error || 'Sync failed' };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updatePlayerSyncStatus(playerId, false, errorMessage);
    return { success: false, message: `Sync failed: ${errorMessage}` };
  }
}

// Update player
export async function updatePlayer(id: string, playerData: Partial<Omit<Player, 'id'>>): Promise<Player | null> {
  const players = await getAllPlayers();
  const index = players.findIndex(player => player.id === id);
  
  if (index === -1) return null;
  
  players[index] = {
    ...players[index],
    ...playerData,
  };
  
  setData('PLAYERS', players);
  return players[index];
}

// Delete player
export async function deletePlayer(id: string): Promise<boolean> {
  const players = await getAllPlayers();
  const filteredPlayers = players.filter(player => player.id !== id);
  
  if (filteredPlayers.length === players.length) return false;
  
  setData('PLAYERS', filteredPlayers);
  return true;
}

// Sync players from Supabase to local storage (UPDATED: was Google Sheets, now Supabase)
export async function syncPlayersFromGoogleSheets(): Promise<{ success: boolean; count: number; message: string }> {
  if (typeof window === 'undefined') {
    return { success: false, count: 0, message: 'Can only sync from client side' };
  }

  try {
    console.log('Syncing players from Supabase...');
    
    // Get all players from Supabase
    const supabasePlayers = await getAllPlayers();
    
    if (supabasePlayers.length === 0) {
      return { 
        success: true, 
        count: 0, 
        message: 'No players found in Supabase database' 
      };
    }
    
    // Get current local players
    const localPlayers = getData('PLAYERS') as Player[];
    
    // Create a map of existing local players by ID for quick lookup
    const localPlayerMap = new Map(localPlayers.map(p => [p.id, p]));
    
    // Merge players: keep local data but add missing players from Supabase
    const mergedPlayers = [...localPlayers];
    let addedCount = 0;
    
    for (const supabasePlayer of supabasePlayers) {
      if (!localPlayerMap.has(supabasePlayer.id)) {
        // Player exists in Supabase but not locally - add them
        mergedPlayers.push(supabasePlayer);
        addedCount++;
        
        // Mark as synced since they came from Supabase
        await updatePlayerSyncStatus(supabasePlayer.id, true);
      }
    }
    
    // Save merged data to local storage
    setData('PLAYERS', mergedPlayers);
    
    console.log(`Sync complete: Added ${addedCount} players from Supabase`);
    return { 
      success: true, 
      count: addedCount, 
      message: `Successfully synced ${addedCount} new players from Supabase database` 
    };
    
  } catch (error) {
    console.error('Error syncing players from Supabase:', error);
    return { 
      success: false, 
      count: 0, 
      message: `Failed to sync from Supabase: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}