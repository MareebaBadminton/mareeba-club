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

export const getItem = (key: keyof typeof STORAGE_KEYS) => {
  if (!isClient) return null;
  try {
    const item = localStorage.getItem(STORAGE_KEYS[key]);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting item from storage: ${error}`);
    return null;
  }
};

export const setItem = (key: keyof typeof STORAGE_KEYS, value: any) => {
  if (!isClient) return;
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item in storage: ${error}`);
  }
};

export const removeItem = (key: keyof typeof STORAGE_KEYS) => {
  if (!isClient) return;
  try {
    localStorage.removeItem(STORAGE_KEYS[key]);
  } catch (error) {
    console.error(`Error removing item from storage: ${error}`);
  }
};

export const initializeStorage = () => {
  if (!isClient) return;
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

// Generic get data function
export function getData<T>(key: keyof typeof STORAGE_KEYS): T[] {
  if (typeof window === 'undefined' || !isLocalStorageAvailable()) {
    return [];
  }
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS[key]);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error getting data for key ${key}:`, error);
    return [];
  }
}

// Generic set data function
export function setData<T>(key: keyof typeof STORAGE_KEYS, data: T[]) {
  if (typeof window === 'undefined' || !isLocalStorageAvailable()) {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
  } catch (error) {
    console.error(`Error setting data for key ${key}:`, error);
  }
}

// Check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}; 