import React, { useState, useEffect } from 'react';
import { getAllBookings, updateBookingPaymentStatus } from '../lib/utils/bookingUtils';

interface Booking {
  id: string;
  playerId: string;
  sessionDate: string;
  sessionTime: string;
  paymentStatus: 'pending' | 'confirmed';
  playerName?: string;
}

export default function PaymentTracker() {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingBookings();
  }, []);

  const loadPendingBookings = async () => {
    try {
      const bookings = await getAllBookings();
      const pending = bookings.filter(b => b.paymentStatus === 'pending');
      setPendingBookings(pending);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (bookingId: string) => {
    try {
      await updateBookingPaymentStatus(bookingId, 'confirmed');
      await loadPendingBookings(); // Refresh the list
      alert('Payment confirmed successfully!');
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Error confirming payment');
    }
  };

  // Add this to the existing PaymentTracker component (around line 15)
  const [searchReference, setSearchReference] = useState('');
  const [searchResult, setSearchResult] = useState<Booking | null>(null);
  
  // Add this function after confirmPayment
  const searchByReference = async () => {
    if (!searchReference.trim()) {
      alert('Please enter a payment reference');
      return;
    }
    
    try {
      const booking = await findBookingByReference(searchReference.trim());
      if (booking) {
        setSearchResult(booking);
      } else {
        alert('No pending booking found for this reference');
        setSearchResult(null);
      }
    } catch (error) {
      console.error('Error searching by reference:', error);
      alert('Error searching for booking');
    }
  };
  
  // Add this to the JSX (after the h2 title)
  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
    <h3 className="text-lg font-semibold mb-3">Search by Payment Reference</h3>
    <div className="flex gap-3">
      <input
        type="text"
        placeholder="Enter payment reference (e.g., MB1234520241215)"
        value={searchReference}
        onChange={(e) => setSearchReference(e.target.value)}
        className="flex-1 px-3 py-2 border rounded"
      />
      <button
        onClick={searchByReference}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Search
      </button>
    </div>
    
    {searchResult && (
      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
        <p><strong>Found Booking:</strong></p>
        <p>Player ID: {searchResult.playerId}</p>
        <p>Session: {searchResult.sessionDate} at {searchResult.sessionTime}</p>
        <p>Amount: ${searchResult.fee.toFixed(2)}</p>
        <button
          onClick={() => confirmPayment(searchResult.id)}
          className="mt-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
        >
          Confirm This Payment
        </button>
      </div>
    )}
  </div>
  if (loading) return <div>Loading pending payments...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Pending Payments</h2>
      
      {pendingBookings.length === 0 ? (
        <p className="text-gray-600">No pending payments</p>
      ) : (
        <div className="space-y-4">
          {pendingBookings.map((booking) => (
            <div key={booking.id} className="border rounded-lg p-4 bg-white shadow">
              <div className="flex justify-between items-center">
                <div>
                  <p><strong>Player ID:</strong> {booking.playerId}</p>
                  <p><strong>Session:</strong> {booking.sessionDate} at {booking.sessionTime}</p>
                  <p><strong>Amount:</strong> $10.00</p>
                  <p className="text-sm text-gray-600">
                    <strong>Reference:</strong> MB{booking.playerId}{(() => {
                      const [year, month, day] = booking.sessionDate.split('-');
                      return `${year}${day}${month}`;
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => confirmPayment(booking.id)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}