import { NextRequest, NextResponse } from 'next/server';
import { addBookingToSheet, updateBookingPaymentInSheet, getBookingsFromSheet } from '@/lib/utils/googleSheets';

export async function POST(request: NextRequest) {
  try {
    const booking = await request.json();
    
    // Add booking to Google Sheets
    await addBookingToSheet(booking);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Booking saved to Google Sheets' 
    });
  } catch (error) {
    console.error('Error saving booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save booking to Google Sheets' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { bookingId, playerId, sessionDate, paymentStatus } = await request.json();
    
    // Update payment status in Google Sheets
    await updateBookingPaymentInSheet(playerId, sessionDate, paymentStatus);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payment status updated in Google Sheets' 
    });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payment status' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const bookings = await getBookingsFromSheet();
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings from Google Sheets' },
      { status: 500 }
    );
  }
}