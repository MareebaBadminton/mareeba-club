import { Player } from '@/types/Player';
import { getData, setData } from './storage';

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

// Get all players
export async function getAllPlayers(): Promise<Player[]> {
  return getData<Player>('PLAYERS');
}

// Get player by ID
export async function getPlayerById(id: string): Promise<Player | null> {
  const players = await getAllPlayers();
  return players.find(player => player.id === id) || null;
}

// Create new player
export async function createPlayer(playerData: Omit<Player, 'id' | 'registeredAt'>): Promise<Player> {
  const players = await getAllPlayers();
  
  const newPlayer: Player = {
    ...playerData,
    id: await generateUniqueId(),
    registeredAt: new Date().toISOString(),
  };
  
  // Save to localStorage
  players.push(newPlayer);
  setData('PLAYERS', players);
  
  // Sync to Google Sheets via API (client-side)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPlayer),
      });
      console.log('Player synced to Google Sheets');
    } catch (error) {
      console.warn('Failed to sync to Google Sheets:', error);
      // Continue anyway - local storage still works
    }
  }
  
  return newPlayer;
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

// Add this function at the end of the file

// Sync players from Google Sheets to local storage
export async function syncPlayersFromGoogleSheets(): Promise<{ success: boolean; count: number; message: string }> {
  if (typeof window === 'undefined') {
    return { success: false, count: 0, message: 'Can only sync from client side' };
  }

  try {
    const response = await fetch('/api/sync-players');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch players from Google Sheets');
    }

    const playersFromSheet = data.players;
    
    // Get current local players
    const localPlayers = await getAllPlayers();
    
    // Create a map of existing local players by ID for quick lookup
    const localPlayerMap = new Map(localPlayers.map(p => [p.id, p]));
    
    // Merge players: keep local data but add missing players from sheets
    const mergedPlayers = [...localPlayers];
    let addedCount = 0;
    
    for (const sheetPlayer of playersFromSheet) {
      if (!localPlayerMap.has(sheetPlayer.id)) {
        // Player exists in sheets but not locally - add them
        mergedPlayers.push({
          ...sheetPlayer,
          // Ensure all required Player fields are present
          phone: '', // Default empty phone since it's not in sheets
          emergencyContact: '', // Default empty emergency contact
        });
        addedCount++;
      }
    }
    
    // Save merged data to local storage
    setData('PLAYERS', mergedPlayers);
    
    console.log(`Sync complete: Added ${addedCount} players from Google Sheets`);
    return { 
      success: true, 
      count: addedCount, 
      message: `Successfully synced ${addedCount} new players from Google Sheets` 
    };
  } catch (error) {
    console.error('Error syncing players from Google Sheets:', error);
    return { 
      success: false, 
      count: 0, 
      message: `Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}