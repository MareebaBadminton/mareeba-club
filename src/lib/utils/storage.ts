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
    maxPlayers: 24,
    fee: 8 // Member rate
  },
  {
    id: 'sunday-afternoon',
    dayOfWeek: 'Sunday',
    startTime: '14:30',
    endTime: '16:30',
    maxPlayers: 24,
    fee: 8
  },
  {
    id: 'monday-evening',
    dayOfWeek: 'Monday',
    startTime: '20:00',
    endTime: '22:00',
    maxPlayers: 24,
    fee: 8
  }
];

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

export const getItem = <T>(key: keyof typeof STORAGE_KEYS): T | null => {
  if (!isStorageAvailable()) return null;
  try {
    const item = localStorage.getItem(STORAGE_KEYS[key]);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting item from storage: ${error}`);
    return null;
  }
};

export const setItem = <T>(key: keyof typeof STORAGE_KEYS, value: T): void => {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item in storage: ${error}`);
  }
};

export const removeItem = (key: keyof typeof STORAGE_KEYS): void => {
  if (!isStorageAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEYS[key]);
  } catch (error) {
    console.error(`Error removing item from storage: ${error}`);
  }
};

export const initializeStorage = (): void => {
  if (!isStorageAvailable()) {
    console.warn('LocalStorage is not available');
    return;
  }

  try {
    // Initialize sessions if they don't exist
    if (!getItem('SESSIONS')) {
      setItem('SESSIONS', DEFAULT_SESSIONS);
    }

    // Initialize other storage items if they don't exist
    if (!getItem('PLAYERS')) {
      setItem('PLAYERS', []);
    }
    if (!getItem('BOOKINGS')) {
      setItem('BOOKINGS', []);
    }
    if (!getItem('PAYMENTS')) {
      setItem('PAYMENTS', []);
    }
  } catch (error) {
    console.error(`Error initializing storage: ${error}`);
  }
};

// Alias functions for backward compatibility with array returns
export function getData<T>(key: keyof typeof STORAGE_KEYS): T[] {
  const data = getItem<T[]>(key);
  return data || [];
}

export function setData<T>(key: keyof typeof STORAGE_KEYS, data: T[]): void {
  setItem(key, data);
} 