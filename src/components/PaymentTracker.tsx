import React, { useState, useEffect } from 'react';
import { getAllBookings, updateBookingPaymentStatus, findBookingByReference, syncBookingsFromGoogleSheets } from '../lib/utils/bookingUtils';
import { Booking } from '../lib/types/player';
import { getAllPayments, updatePaymentStatus, createPayment, getPaymentStats, Payment } from '@/lib/utils/paymentUtils'

export default function PaymentTracker() {
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStats, setPaymentStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    pendingPayments: 0,
    completedPayments: 0,
    failedPayments: 0
  });
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [searchReference, setSearchReference] = useState('');
  const [searchResult, setSearchResult] = useState<Booking | null>(null);
  const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'stats'>('pending');

  // Admin password
  const ADMIN_PASSWORD = 'MB4dm!nton';

  useEffect(() => {
    const init = async () => {
      await syncBookingsFromGoogleSheets();
      await loadData();
    };
    init();
  }, []);

  const loadData = async () => {
    try {
      // Load bookings and payments
      const [bookings, allPayments, stats] = await Promise.all([
        getAllBookings(),
        getAllPayments(),
        getPaymentStats()
      ]);
      
      // Show bookings that are either status='pending' OR paymentStatus='pending'
      const pending = bookings.filter(b => 
        b.status === 'pending' || b.paymentStatus === 'pending'
      );
      setPendingBookings(pending);
      setPayments(allPayments);
      setPaymentStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load payment data. Please refresh the page.' });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setAdminPassword('');
      setMessage({ type: 'success', text: 'Admin access granted successfully!' });
    } else {
      alert('Incorrect admin password');
      setAdminPassword('');
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
        paymentReference: paymentReference || `MB${booking.playerId}${(() => {
          const [year, month, day] = booking.sessionDate.split('-');
          return `${year}${day}${month}`;
        })()}`,
        status: 'completed',
        paymentDate: new Date().toISOString()
      });

      if (!payment) {
        throw new Error('Failed to create payment record');
      }

      // Update booking payment status
      const success = await updateBookingPaymentStatus(bookingId, true);
      if (!success) {
        throw new Error('Failed to update booking payment status');
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to update payment status`);
      }
      
      setMessage({ 
        type: 'success', 
        text: `Payment confirmed successfully for Player ID: ${booking.playerId}` 
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
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === 'success' 
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

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'pending', label: 'Pending Payments', count: pendingBookings.length },
              { key: 'all', label: 'All Payments', count: payments.length },
              { key: 'stats', label: 'Statistics', count: null }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
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
              placeholder="Enter payment reference (e.g., MB1234520241215)"
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
              <p>Player ID: {searchResult.playerId}</p>
              <p>Session: {searchResult.sessionDate} at {searchResult.sessionTime}</p>
              <button
                onClick={() => confirmPayment(searchResult.id, searchReference)}
                disabled={!isAdmin || processingPayments.has(searchResult.id)}
                className={`mt-2 px-3 py-1 rounded ${
                  !isAdmin 
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
                      <p><strong>Player ID:</strong> {booking.playerId}</p>
                      <p><strong>Session:</strong> {booking.sessionDate} at {booking.sessionTime}</p>
                      <p className="text-sm text-gray-600">
                        <strong>Reference:</strong> MB{booking.playerId}{(() => {
                          const [year, month, day] = booking.sessionDate.split('-');
                          return `${year}${day}${month}`;
                        })()}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Amount:</strong> {formatCurrency(8.00)}
                      </p>
                    </div>
                    <button
                      onClick={() => confirmPayment(booking.id)}
                      disabled={!isAdmin || processingPayments.has(booking.id)}
                      className={`px-4 py-2 rounded ${
                        !isAdmin 
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
          <h3 className="text-lg font-semibold mb-4">All Payments ({payments.length})</h3>
          {payments.length === 0 ? (
            <p className="text-gray-600">No payment records found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{payment.playerId}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{payment.paymentReference || 'N/A'}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.status === 'completed' ? 'bg-green-100 text-green-800' :
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Payment Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-blue-800">Total Payments</h4>
              <p className="text-2xl font-bold text-blue-600">{paymentStats.totalPayments}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-green-800">Total Amount</h4>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(paymentStats.totalAmount)}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-yellow-800">Pending</h4>
              <p className="text-2xl font-bold text-yellow-600">{paymentStats.pendingPayments}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-green-800">Completed</h4>
              <p className="text-2xl font-bold text-green-600">{paymentStats.completedPayments}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-red-800">Failed</h4>
              <p className="text-2xl font-bold text-red-600">{paymentStats.failedPayments}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}