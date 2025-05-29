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

// Initialize storage with default data if empty
export function initializeStorage() {
  if (typeof window === 'undefined') return;

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
}

// Generic get data function
export function getData<T>(key: keyof typeof STORAGE_KEYS): T[] {
  if (typeof window === 'undefined') return [];
  
  const data = localStorage.getItem(STORAGE_KEYS[key]);
  return data ? JSON.parse(data) : [];
}

// Generic set data function
export function setData<T>(key: keyof typeof STORAGE_KEYS, data: T[]) {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data));
} 