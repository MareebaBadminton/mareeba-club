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

// Initialize storage with default data if empty
export function initializeStorage() {
  if (typeof window === 'undefined' || !isLocalStorageAvailable()) {
    console.warn('LocalStorage is not available');
    return;
  }

  try {
    if (!localStorage.getItem(STORAGE_KEYS.PLAYERS)) {
      localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SESSIONS)) {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(DEFAULT_SESSIONS));
    }

    if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

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