'use client';

import { useState } from 'react';
import { clearAllUserData, clearAllData, getData } from '@/lib/utils/storage';
import { migrateLocalStorageToSupabase, migrateGoogleSheetsToSupabase } from '@/lib/migrate-to-supabase';

export default function AdminPage() {
  const [message, setMessage] = useState('');
  const [playerCount, setPlayerCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Update counts
  const updateCounts = () => {
    setPlayerCount(getData('PLAYERS').length);
    setBookingCount(getData('BOOKINGS').length);
    setPaymentCount(getData('PAYMENTS').length);
  };

  // Load initial counts
  useState(() => {
    updateCounts();
  });

  const handleClearUserData = () => {
    if (confirm('Are you sure you want to clear all registered players, bookings, and payments? This action cannot be undone.')) {
      try {
        clearAllUserData();
        updateCounts();
        setMessage('✅ All user data (players, bookings, payments) has been cleared successfully!');
      } catch (error) {
        setMessage('❌ Error clearing user data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear ALL data including sessions? This will reset everything to defaults. This action cannot be undone.')) {
      try {
        clearAllData();
        updateCounts();
        setMessage('✅ All data has been cleared and reset to defaults!');
      } catch (error) {
        setMessage('❌ Error clearing all data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  const handleLocalStorageMigration = async () => {
    setIsLoading(true);
    try {
      const result = await migrateLocalStorageToSupabase();
      if (result.success) {
        setMessage(`✅ LocalStorage migration successful! Migrated ${result.playersCount} players and ${result.bookingsCount} bookings.`);
      } else {
        setMessage(`❌ LocalStorage migration failed: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ LocalStorage migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSheetsMigration = async () => {
    if (confirm('This will import all data from your Google Sheets (IDLists and Bookings) into Supabase. Are you sure you want to proceed?')) {
      setIsLoading(true);
      try {
        const result = await migrateGoogleSheetsToSupabase();
        if (result.success) {
          setMessage(`🎉 Google Sheets migration successful! Migrated ${result.playersCount} players, ${result.bookingsCount} bookings, and ${result.sessionsCount} sessions to Supabase. Your players can now book from their own devices!`);
        } else {
          setMessage(`❌ Google Sheets migration failed: ${result.error}`);
        }
      } catch (error) {
        setMessage(`❌ Google Sheets migration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Admin Panel
        </h1>
        
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-3">Current LocalStorage Data:</h2>
          <div className="space-y-1">
            <p><strong>Registered Players:</strong> {playerCount}</p>
            <p><strong>Bookings:</strong> {bookingCount}</p>
            <p><strong>Payments:</strong> {paymentCount}</p>
          </div>
          <button
            onClick={updateCounts}
            className="mt-3 text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            Refresh Counts
          </button>
        </div>

        <div className="space-y-6">
          {/* Google Sheets Migration Section */}
          <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800 mb-2">📊 Google Sheets to Supabase Migration</h3>
            <p className="text-sm text-green-700 mb-4">
              Import all your existing player data and bookings from Google Sheets into Supabase. This will enable live updates and allow players to book from their own devices.
            </p>
            <button
              onClick={handleGoogleSheetsMigration}
              disabled={isLoading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 Migrating...' : '🚀 Import from Google Sheets'}
            </button>
          </div>

          {/* LocalStorage Migration Section */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">💾 LocalStorage to Supabase Migration</h3>
            <p className="text-sm text-blue-700 mb-4">
              Migrate any data stored locally in your browser to Supabase database.
            </p>
            <button
              onClick={handleLocalStorageMigration}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '🔄 Migrating...' : '📤 Migrate LocalStorage'}
            </button>
          </div>

          {/* Data Management Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🗂️ Data Management</h3>
            <div className="space-y-4">
              <button
                onClick={handleClearUserData}
                disabled={isLoading}
                className="w-full bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 font-medium disabled:opacity-50"
              >
                Clear LocalStorage User Data
              </button>
              <p className="text-sm text-gray-600">
                Clears all registered players, bookings, and payments from local storage. Keeps session configurations.
              </p>

              <button
                onClick={handleClearAllData}
                disabled={isLoading}
                className="w-full bg-red-500 text-white py-3 px-4 rounded-lg hover:bg-red-600 font-medium disabled:opacity-50"
              >
                Clear ALL LocalStorage Data
              </button>
              <p className="text-sm text-gray-600">
                Clears everything from local storage and resets to default settings. Use with extreme caution!
              </p>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm whitespace-pre-line">{message}</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">💡 Instructions:</h3>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>First, click "Import from Google Sheets" to migrate all your existing data to Supabase</li>
            <li>Once successful, players will be able to book sessions from their own devices</li>
            <li>You can then clear local storage data if everything is working correctly</li>
            <li>Make sure your Supabase environment variables are properly configured</li>
          </ol>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Main Site
          </a>
        </div>
      </div>
    </div>
  );
}