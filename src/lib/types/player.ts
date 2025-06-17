export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registeredAt: string;
}

export interface PlayerSyncStatus {
  playerId: string;
  syncedToSheets: boolean;
  lastSyncAttempt: string;
  syncError?: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  bankReference: string;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
  confirmedAt?: string;
}

export interface Booking {
  id: string;
  playerId: string;
  sessionDate: string;
  sessionTime: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'failed';
  fee: number;
}

export interface Session {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxPlayers: number;
  fee: number;
}