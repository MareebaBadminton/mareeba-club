import { google } from 'googleapis';
import { getAllBookings } from './bookingUtils';

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
export async function addPlayerToSheet(player: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  registeredAt: string;
}) {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
    }

    // Prepare the row data (removed phone column)
    const values = [[
      player.id,
      player.firstName,
      player.lastName,
      player.email,
      new Date(player.registeredAt).toLocaleString()
    ]];

    // Append the data to the sheet - UPDATED SHEET NAME
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'badminton ID List and Bookings!A:E', // Changed from 'ID List!A:E'
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    console.log('Player added to Google Sheets:', response.data);
    return response.data;
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

    // In initializeSheet function
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'ID List!A1:E1',
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

// Add this function after the existing functions

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
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
    }

    // Read data from the sheet (skip header row)
    // In getPlayersFromSheet function
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'ID List!A2:E',
    });

    const rows = response.data.values || [];
    
    // Convert rows to player objects
    const players = rows.map(row => ({
      id: row[0] || '',
      firstName: row[1] || '',
      lastName: row[2] || '',
      email: row[3] || '',
      registeredAt: row[4] || new Date().toISOString(),
    })).filter(player => player.id); // Filter out empty rows

    console.log(`Loaded ${players.length} players from Google Sheets`);
    return players;
  } catch (error) {
    console.error('Error reading players from Google Sheets:', error);
    throw error;
  }
}

// Add booking to Google Sheets
// Update addBookingToSheet to remove Booking ID and Session Time
export async function addBookingToSheet(booking: {
  playerId: string;
  playerName: string;
  sessionDate: string;
  fee: number;
  paymentReference: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  createdAt: string;
}) {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
    }

    // Prepare the row data for bookings sheet (without Booking ID and Session Time)
    const values = [[
      booking.playerId,
      booking.playerName,
      booking.sessionDate,
      booking.fee,
      booking.paymentReference,
      booking.paymentStatus,
      new Date(booking.createdAt).toLocaleString()
    ]];

    // Append to the Bookings sheet (Sheet2)
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Bookings!A:G', // 7 columns
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    console.log('Booking added to Google Sheets:', response.data);
    return response.data;
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

    // First, get all rows from the sheet
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

// Initialize bookings sheet with headers
export async function initializeBookingsSheet() {
  try {
    const sheets = getGoogleSheetsInstance();
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
    }

    const headers = [[
      'Player ID', 
      'Player Name', 
      'Session Date', 
      'Fee', 
      'Payment Reference', 
      'Payment Status', 
      'Created At'
    ]];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Bookings!A1:G1', // Updated range to A1:G1 (7 columns)
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: headers,
      },
    });

    console.log('Bookings sheet initialized with headers');
  } catch (error) {
    console.error('Error initializing bookings sheet:', error);
    throw error;
  }
}