const STORAGE_KEYS = {
  PLAYERS: 'mareeba_players',
  BOOKINGS: 'mareeba_bookings',
  SESSIONS: 'mareeba_sessions',
  PAYMENTS: 'mareeba_payments'
} as const;

// Default sessions data
const DEFAULT_SESSIONS = [
  {
    id: 'friday-evening',
    dayOfWeek: 'Friday',
    startTime: '19:30',
    endTime: '21:30',
    maxPlayers: 20,  // Already set to 20
    fee: 8
  },
  {
    id: 'sunday-afternoon',
    dayOfWeek: 'Sunday',
    startTime: '14:30',
    endTime: '16:30',
    maxPlayers: 20,  // Already set to 20
    fee: 8
  },
  {
    id: 'monday-evening',
    dayOfWeek: 'Monday',
    startTime: '20:00',
    endTime: '22:00',
    maxPlayers: 20,  // Already set to 20
    fee: 8
  }
];

// In-memory fallback when localStorage is not available
let memoryStorage: { [key: string]: any } = {};

const isClient = typeof window !== 'undefined';

// Check if localStorage is available
const isStorageAvailable = () => {
  if (!isClient) return false;
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

// Get item from storage
export const getData = <T>(key: keyof typeof STORAGE_KEYS): T[] => {
  try {
    if (!isClient) return [];
    
    const storageKey = STORAGE_KEYS[key];
    if (isStorageAvailable()) {
      const data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : [];
    } else {
      return memoryStorage[storageKey] || [];
    }
  } catch (error) {
    console.error(`Error getting data for ${key}:`, error);
    return [];
  }
};

// Set item in storage
export const setData = <T>(key: keyof typeof STORAGE_KEYS, data: T[]): void => {
  try {
    if (!isClient) return;
    
    const storageKey = STORAGE_KEYS[key];
    if (isStorageAvailable()) {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } else {
      memoryStorage[storageKey] = data;
    }
  } catch (error) {
    console.error(`Error setting data for ${key}:`, error);
  }
};

export const initializeStorage = (): void => {
  if (!isClient) return;

  try {
    // Always update sessions to ensure latest configuration
    setData('SESSIONS', DEFAULT_SESSIONS);

    // Initialize other storage items if they don't exist
    if (!getData('PLAYERS').length) {
      setData('PLAYERS', []);
    }
    if (!getData('BOOKINGS').length) {
      setData('BOOKINGS', []);
    }
    if (!getData('PAYMENTS').length) {
      setData('PAYMENTS', []);
    }
  } catch (error) {
    console.error(`Error initializing storage: ${error}`);
  }
};