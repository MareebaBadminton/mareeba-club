import { google } from 'googleapis';
import { getAllBookings } from './bookingUtils';
import type { Player } from '../types/player';
import { formatAustralianDate, getAustralianDateTimeISO } from './dateUtils';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Initialize Google Sheets API
function getGoogleSheetsInstance() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });

  return google.sheets({ version: 'v4', auth });
}

// Add player to Google Sheets
export async function addPlayerToSheet(player: Player): Promise<void> {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEETS_SPREADSHEET_ID not configured - skipping Google Sheets sync');
      return;
    }

    // Add player data to the IDLists sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'IDLists!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          player.id,
          player.firstName,
          player.lastName,
          player.email,
          formatAustralianDate(player.registeredAt)
        ]]
      }
    });

    console.log('Player added to Google Sheets successfully');
  } catch (error) {
    console.error('Error adding player to Google Sheets:', error);
    throw error;
  }
}

// Initialize sheet with headers (run once)
export async function initializeSheet() {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
    }

    const headers = [['Player ID', 'First Name', 'Last Name', 'Email', 'Registered At']];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "IDLists!A1:E1", // Updated: No spaces, no quotes needed
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: headers,
      },
    });

    console.log('Sheet initialized with headers');
  } catch (error) {
    console.error('Error initializing sheet:', error);
    throw error;
  }
}

// Read all players from Google Sheets
export async function getPlayersFromSheet(): Promise<{
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registeredAt: string;
}[]> {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEETS_SPREADSHEET_ID not configured - returning empty array');
      return [];
    }

    // Read data from the sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "IDLists!A2:E", // Updated: No spaces, no quotes needed
    });

    const rows = response.data.values || [];
    
    // Convert rows to player objects
    const players = rows.map(row => ({
      id: row[0] || '',
      firstName: row[1] || '',
      lastName: row[2] || '',
      email: row[3] || '',
      registeredAt: row[4] || getAustralianDateTimeISO(),
    })).filter(player => player.id);

    console.log(`Loaded ${players.length} players from Google Sheets`);
    return players;
  } catch (error) {
    console.error('Error reading players from Google Sheets:', error);
    throw error;
  }
}

// Add booking to Google Sheets
export async function addBookingToSheet(booking: {
  playerId: string;
  playerName?: string;
  sessionDate: string;
  sessionTime?: string;
  fee: number;
  paymentReference: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
}): Promise<void> {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEETS_SPREADSHEET_ID not configured - skipping Google Sheets sync');
      return;
    }

    // Add booking data to the Bookings sheet - matching your sheet structure
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Bookings!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          booking.playerId,                           // Column A: Player ID
          booking.playerName || '',                   // Column B: Player Name
          booking.sessionDate,                        // Column C: Session Date (date only)
          booking.fee,                               // Column D: Fee
          booking.paymentReference,                  // Column E: Payment Reference
          booking.paymentStatus,                     // Column F: Payment status
          formatAustralianDate(booking.createdAt)    // Column G: Created at
        ]]
      }
    });

    console.log('Booking added to Google Sheets successfully');
  } catch (error) {
    console.error('Error adding booking to Google Sheets:', error);
    throw error;
  }
}

// Update booking payment status in Google Sheets
export async function updateBookingPaymentInSheet(
  playerId: string,
  sessionDate: string,
  paymentStatus: 'pending' | 'paid' | 'failed'
) {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
    }

    // Get all rows from the Bookings sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Bookings!A:G',
    });

    const rows = response.data.values || [];
    
    // Find the booking row by matching playerId (column A) and sessionDate (column C)
    const bookingRowIndex = rows.findIndex(row => 
      row[0] === playerId && row[2] === sessionDate
    );

    if (bookingRowIndex === -1) {
      throw new Error('Booking not found in sheet');
    }

    // Update the payment status (column F, index 5)
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Bookings!F${bookingRowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[paymentStatus]],
      },
    });

    console.log('Booking payment status updated in Google Sheets');
  } catch (error) {
    console.error('Error updating booking in Google Sheets:', error);
    throw error;
  }
}

// Add function to read bookings from Google Sheets
export async function getBookingsFromSheet(): Promise<{
  playerId: string;
  playerName?: string;
  sessionDate: string;
  fee: number;
  paymentReference: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
}[]> {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.warn('GOOGLE_SHEETS_SPREADSHEET_ID not configured - returning empty bookings array');
      return [];
    }

    // Read data from the Bookings sheet (skip header row)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Bookings!A2:G',
    });

    const rows = response.data.values || [];

    // Convert rows to booking-like objects - updated to match new structure
    const bookings = rows.map((row) => ({
      playerId: row[0] || '',
      playerName: row[1] || '',
      sessionDate: row[2] || '',
      fee: Number(row[3] || 0),
      paymentReference: row[4] || '',
      paymentStatus: (row[5] as 'pending' | 'paid' | 'failed') || 'pending',
      createdAt: row[6] || getAustralianDateTimeISO(),
    })).filter(b => b.playerId && b.sessionDate);

    console.log(`Loaded ${bookings.length} bookings from Google Sheets`);
    return bookings;
  } catch (error) {
    console.error('Error reading bookings from Google Sheets:', error);
    throw error;
  }
}

// Bulk sync all local players to Google Sheets
export async function syncAllPlayersToSheet(players: Player[]): Promise<{ success: boolean; synced: number; errors: number; message: string }> {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return { success: false, synced: 0, errors: 0, message: 'GOOGLE_SHEETS_SPREADSHEET_ID not configured' };
    }

    // Get existing players from sheet to avoid duplicates
    const existingPlayers = await getPlayersFromSheet();
    const existingPlayerIds = new Set(existingPlayers.map(p => p.id));
    const existingEmails = new Set(existingPlayers.map(p => p.email.toLowerCase()));

    // Filter out players that already exist in sheets
    const playersToSync = players.filter(player => 
      !existingPlayerIds.has(player.id) && 
      !existingEmails.has(player.email.toLowerCase())
    );

    if (playersToSync.length === 0) {
      return { success: true, synced: 0, errors: 0, message: 'All players are already synced to Google Sheets' };
    }

    // Prepare batch data for bulk insert
    const values = playersToSync.map(player => [
      player.id,
      player.firstName,
      player.lastName,
      player.email,
      formatAustralianDate(player.registeredAt)
    ]);

    // Bulk insert all players at once
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'IDLists!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: values
      }
    });

    console.log(`Bulk synced ${playersToSync.length} players to Google Sheets`);
    return { 
      success: true, 
      synced: playersToSync.length, 
      errors: 0, 
      message: `Successfully synced ${playersToSync.length} players to Google Sheets` 
    };
  } catch (error) {
    console.error('Error bulk syncing players to Google Sheets:', error);
    return { 
      success: false, 
      synced: 0, 
      errors: 1, 
      message: `Failed to sync players: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}
