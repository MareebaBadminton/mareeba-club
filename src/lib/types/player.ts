export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: {
    name: string;
    phone: string;
  };
  registeredAt: string;
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
  status: 'confirmed' | 'cancelled';
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