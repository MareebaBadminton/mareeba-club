import { Payment, Booking, Player } from '../types/player';
import { v4 as uuidv4 } from 'uuid';
import { getData, setData } from './storage';

// Initialize storage key
const PAYMENT_STORAGE_KEY = 'mareeba_payments';

// Initialize payments storage
export function initializePaymentsStorage() {
  if (typeof window === 'undefined') return;
  
  if (!localStorage.getItem(PAYMENT_STORAGE_KEY)) {
    localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify([]));
  }
}

// Get all payments
export async function getAllPayments(): Promise<Payment[]> {
  const payments = localStorage.getItem(PAYMENT_STORAGE_KEY);
  return payments ? JSON.parse(payments) : [];
}

// Get payment by booking ID
export async function getPaymentByBookingId(bookingId: string): Promise<Payment | null> {
  const payments = await getAllPayments();
  return payments.find(payment => payment.bookingId === bookingId) || null;
}

// Create new payment
export async function createPayment(
  bookingId: string,
  amount: number,
  bankReference: string
): Promise<Payment> {
  const payments = await getAllPayments();
  
  const newPayment: Payment = {
    id: uuidv4(),
    bookingId,
    amount,
    bankReference,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  payments.push(newPayment);
  localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
  
  return newPayment;
}

// Confirm payment
export async function confirmPayment(paymentId: string): Promise<Payment | null> {
  const payments = await getAllPayments();
  const paymentIndex = payments.findIndex(payment => payment.id === paymentId);
  
  if (paymentIndex === -1) return null;
  
  payments[paymentIndex] = {
    ...payments[paymentIndex],
    status: 'confirmed',
    confirmedAt: new Date().toISOString()
  };
  
  localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments));
  return payments[paymentIndex];
}

// Get payments report
export async function getPaymentsReport(): Promise<{
  bookingId: string;
  playerName: string;
  sessionDate: string;
  sessionTime: string;
  amount: number;
  status: string;
  bankReference: string;
}[]> {
  const payments = await getAllPayments();
  const bookings = getData<Booking>('BOOKINGS');
  const players = getData<Player>('PLAYERS');
  
  return payments.map(payment => {
    const booking = bookings.find(b => b.id === payment.bookingId);
    const player = booking ? players.find(p => p.id === booking.playerId) : null;
    
    return {
      bookingId: payment.bookingId,
      playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
      sessionDate: booking ? booking.sessionDate : 'Unknown',
      sessionTime: booking ? booking.sessionTime : 'Unknown',
      amount: payment.amount,
      status: payment.status,
      bankReference: payment.bankReference
    };
  });
} 