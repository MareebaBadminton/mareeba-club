import React, { useState, useEffect } from 'react';
import { getAllBookings, updateBookingPaymentStatus } from '../lib/utils/bookingUtils';
import { findBookingByReference } from '../lib/utils/bookingUtils';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [searchResult, setSearchResult] = useState<Booking | null>(null);

  // Admin password
  const ADMIN_PASSWORD = 'MB4dm!nton';

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

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAdminPassword('');
    } else {
      alert('Incorrect admin password');
      setAdminPassword('');
    }
  };

  const confirmPayment = async (bookingId: string) => {
    if (!isAdmin) {
      alert('Admin access required to confirm payments');
      return;
    }
    
    try {
      // Update local storage
      updateBookingPaymentStatus(bookingId, 'confirmed');
      
      // Get the booking details to send to the API
      const bookings = await getAllBookings();
      const booking = bookings.find(b => b.id === bookingId);
      
      if (!booking) {
        throw new Error('Booking not found in local storage');
      }
      
      // Update Google Sheets
      const response = await fetch('/api/bookings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingId,
          playerId: booking.playerId,
          sessionDate: booking.sessionDate,
          paymentStatus: 'paid'
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update payment status');
      }
      
      const data = await response.json();
      console.log('Payment status updated:', data);
      
      // Reload pending bookings to refresh the display
      loadPendingBookings();
    } catch (error) {
      console.error('Error confirming payment:', error);
    }
  };

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

  if (loading) return <div>Loading pending payments...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Pending Payments</h2>
      
      {/* Admin Login Section */}
      {!isAdmin && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Admin Access Required</h3>
          <p className="text-yellow-700 mb-3">Enter admin password to confirm payments:</p>
          <div className="flex gap-3">
            <input
              type="password"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleAdminLogin}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Login as Admin
            </button>
          </div>
        </div>
      )}

      {/* Admin Status */}
      {isAdmin && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-green-800 font-semibold">✓ Admin Access Granted</span>
            <button
              onClick={() => setIsAdmin(false)}
              className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Search by Reference Section */}
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
            <button
              onClick={() => confirmPayment(searchResult.id)}
              disabled={!isAdmin}
              className={`mt-2 px-3 py-1 rounded ${
                isAdmin 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isAdmin ? 'Confirm This Payment' : 'Admin Access Required'}
            </button>
          </div>
        )}
      </div>
      
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
                  <p className="text-sm text-gray-600">
                    <strong>Reference:</strong> MB{booking.playerId}{(() => {
                      const [year, month, day] = booking.sessionDate.split('-');
                      return `${year}${day}${month}`;
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => confirmPayment(booking.id)}
                  disabled={!isAdmin}
                  className={`px-4 py-2 rounded ${
                    isAdmin 
                      ? 'bg-green-600 text-white hover:bg-green-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isAdmin ? 'Confirm Payment' : 'Admin Access Required'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}