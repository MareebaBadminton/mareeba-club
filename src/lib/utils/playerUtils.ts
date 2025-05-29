import { Player } from '../types/player';
import { v4 as uuidv4 } from 'uuid';
import { getData, setData } from './storage';

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
    id: uuidv4(),
    registeredAt: new Date().toISOString(),
  };
  
  players.push(newPlayer);
  setData('PLAYERS', players);
  
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