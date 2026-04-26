import React, { useState, useEffect } from 'react';
import { getAllBookings, updateBookingPaymentStatus, findBookingByReference, cancelBooking } from '../lib/utils/bookingUtils';
import { Booking, Player } from '../lib/types/player';
import { getAllPayments, updatePaymentStatus, createPayment, Payment } from '@/lib/utils/paymentUtils'
import { getAllPlayers } from '@/lib/utils/playerUtils'

export default function PaymentTracker() {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [playerMap, setPlayerMap] = useState<Map<string, Player>>(new Map());

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [searchResult, setSearchResult] = useState<Booking | null>(null);
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadData();
    };
    init();
  }, []);

  const loadData = async () => {
    try {
      // Step 1: Fetch all bookings, payments, stats, and players in parallel
      let [bookings, allPayments, players] = await Promise.all([
        getAllBookings(),
        getAllPayments(),
        getAllPlayers()
      ]);

      // Step 1a: Create a map of playerId -> Player for quick lookup
      const playerLookup = new Map<string, Player>();
      players.forEach(player => {
        playerLookup.set(player.id, player);
      });
      setPlayerMap(playerLookup);

      // Step 2: Identify bookings that have been pending & unpaid for > 48 hours
      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
      const now = Date.now();

      const staleBookings = bookings.filter(
        (b) =>
          b.status === 'pending' &&
          b.paymentStatus === 'pending' &&
          b.createdAt &&
          new Date(b.createdAt).getTime() < now - FORTY_EIGHT_HOURS_MS
      );

      if (staleBookings.length > 0) {
        try {
          // Attempt to cancel all stale bookings in parallel
          await Promise.all(staleBookings.map((b) => cancelBooking(b.id)));
        } catch (cancelErr) {
          console.error('Error cancelling stale bookings:', cancelErr);
        }

        // Refresh bookings list after cancellations to get latest state
        bookings = await getAllBookings();
      }

      // Step 3: Filter pending bookings (status OR payment pending)
      const pending = bookings.filter(
        (b) => b.status === 'pending' || b.paymentStatus === 'pending'
      );

      // Step 4: Update local state
      setPendingBookings(pending);
      setPayments(allPayments);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load payment data. Please refresh the page.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!adminPassword.trim()) {
      alert('Please enter a password');
      return;
    }

    setLoginLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setIsAdmin(true);
        setAdminPassword('');
        setMessage({ type: 'success', text: 'Admin access granted successfully!' });
      } else {
        alert(data.error || 'Incorrect admin password');
        setAdminPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const confirmPayment = async (bookingId: string, paymentReference?: string) => {
    if (!isAdmin) {
      alert('Admin access required to confirm payments');
      return;
    }

    setProcessingPayments(prev => new Set(prev).add(bookingId));
    setMessage(null);

    try {
      // Get the booking details
      const bookings = await getAllBookings();
      const booking = bookings.find(b => b.id === bookingId);

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Create payment record in Supabase
      const payment = await createPayment({
        bookingId: booking.id,
        playerId: booking.playerId,
        amount: 8.00, // Session fee
        paymentMethod: 'bank_transfer',
        paymentReference: paymentReference || `${booking.playerId}`,
        status: 'completed',
        paymentDate: new Date().toISOString()
      });

      if (!payment) {
        throw new Error('Failed to create payment record');
      }

      // Update booking payment status
      const success = await updateBookingPaymentStatus(bookingId, 'paid');
      if (!success) {
        throw new Error('Failed to update booking payment status');
      }

      // Legacy Google Sheets sync removed.

      const player = playerMap.get(booking.playerId);
      const playerName = player ? `${player.firstName} ${player.lastName}` : `Player ID: ${booking.playerId}`;
      setMessage({
        type: 'success',
        text: `Payment confirmed successfully for ${playerName}`
      });

      // Reload data to refresh the display
      await loadData();

    } catch (error) {
      console.error('Error confirming payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage({
        type: 'error',
        text: `Failed to confirm payment: ${errorMessage}. Please try again.`
      });
    } finally {
      setProcessingPayments(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
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
        setMessage({ type: 'success', text: 'Booking found successfully!' });
      } else {
        alert('No pending booking found for this reference');
        setSearchResult(null);
      }
    } catch (error) {
      console.error('Error searching by reference:', error);
      alert('Error searching for booking');
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) return <div>Loading payment data...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Payment Management</h2>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${message.type === 'success'
            ? 'bg-green-50 border border-green-200 text-green-800'
            : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
          <p>{message.text}</p>
          <button
            onClick={() => setMessage(null)}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Admin Login Section */}
      {!isAdmin && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Admin Access Required</h3>
          <p className="text-yellow-700 mb-3">Enter admin password to manage payments:</p>
          <div className="flex gap-3">
            <input
              type="password"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="flex-1 px-2 py-0.5 border rounded text-sm h-8"
            />
            <button
              onClick={handleAdminLogin}
              disabled={loginLoading}
              className={`px-4 py-2 rounded ${loginLoading
                  ? 'bg-blue-400 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
            >
              {loginLoading ? 'Logging in...' : 'Login as Admin'}
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

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'pending', label: 'Pending Payments', count: pendingBookings.length },
              { key: 'all', label: 'All Payments', count: payments.filter(p => p.status === 'completed').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Search by Reference Section */}
      {activeTab === 'pending' && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Search by Payment Reference</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter player ID as payment reference (e.g., 12345)"
              value={searchReference}
              onChange={(e) => setSearchReference(e.target.value)}
              className="flex-1 px-2 py-0.5 border rounded text-sm h-8"
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
              <p><strong>Player:</strong> {
                playerMap.get(searchResult.playerId)
                  ? `${playerMap.get(searchResult.playerId)!.firstName} ${playerMap.get(searchResult.playerId)!.lastName}`
                  : 'Name not found'
              } <span className="text-gray-500 text-sm">(ID: {searchResult.playerId})</span></p>
              <p>Session: {searchResult.sessionDate} at {searchResult.sessionTime}</p>
              <button
                onClick={() => confirmPayment(searchResult.id, searchReference)}
                disabled={!isAdmin || processingPayments.has(searchResult.id)}
                className={`mt-2 px-3 py-1 rounded ${!isAdmin
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : processingPayments.has(searchResult.id)
                      ? 'bg-yellow-500 text-white cursor-wait'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                {!isAdmin
                  ? 'Admin Access Required'
                  : processingPayments.has(searchResult.id)
                    ? 'Processing...'
                    : 'Confirm This Payment'
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content based on active tab */}
      {activeTab === 'pending' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Pending Payments ({pendingBookings.length})</h3>
          {pendingBookings.length === 0 ? (
            <p className="text-gray-600">No pending payments</p>
          ) : (
            <div className="space-y-4">
              {pendingBookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4 bg-white shadow">
                  <div className="flex justify-between items-center">
                    <div>
                      <p><strong>Player:</strong> {
                        playerMap.get(booking.playerId)
                          ? `${playerMap.get(booking.playerId)!.firstName} ${playerMap.get(booking.playerId)!.lastName}`
                          : 'Name not found'
                      } <span className="text-gray-500 text-sm">(ID: {booking.playerId})</span></p>
                      <p><strong>Session:</strong> {booking.sessionDate} at {booking.sessionTime}</p>
                      <p className="text-sm text-gray-600">
                        <strong>Reference:</strong> {booking.playerId}
                      </p>
                    </div>
                    <button
                      onClick={() => confirmPayment(booking.id)}
                      disabled={!isAdmin || processingPayments.has(booking.id)}
                      className={`px-4 py-2 rounded ${!isAdmin
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : processingPayments.has(booking.id)
                            ? 'bg-yellow-500 text-white cursor-wait'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                    >
                      {!isAdmin
                        ? 'Admin Access Required'
                        : processingPayments.has(booking.id)
                          ? 'Processing...'
                          : 'Confirm Payment'
                      }
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div>
          {(() => {
            const completedPayments = payments.filter(p => p.status === 'completed');
            return (
              <>
                <h3 className="text-lg font-semibold mb-4">All Payments ({completedPayments.length})</h3>
                {completedPayments.length === 0 ? (
                  <p className="text-gray-600">No completed payment records found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {completedPayments.map((payment) => {
                          const player = playerMap.get(payment.playerId);
                          return (
                            <tr key={payment.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {player ? `${player.firstName} ${player.lastName}` : 'Name not found'}
                                <span className="text-gray-500 text-xs block">ID: {payment.playerId}</span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{payment.paymentReference || 'N/A'}</td>
                              <td className="px-4 py-2 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                  }`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                {payment.paymentDate ? formatDate(payment.paymentDate) : formatDate(payment.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}


    </div>
  );
}