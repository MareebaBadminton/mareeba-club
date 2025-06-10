// Payment processor specifically for Bendigo Bank CDR API
import BendigoBankCDRService from './bendigoBankApi';
import { getAllBookings, updateBookingPaymentStatus } from './bookingUtils';
import { getPlayerById } from './playerUtils';

class BendigoPaymentProcessor {
  private bankService: BendigoBankCDRService;

  constructor(bankService: BendigoBankCDRService) {
    this.bankService = bankService;
  }

  async processRecentPayments(): Promise<{
    processed: number;
    errors: string[];
    payments: any[];
  }> {
    const results = {
      processed: 0,
      errors: [] as string[],
      payments: [] as any[]
    };

    try {
      // Check if user has authorized the bank connection
      if (!this.bankService.isAuthorized()) {
        results.errors.push('Bank authorization required');
        return results;
      }

      // Get recent payments from Bendigo Bank
      const payments = await this.bankService.checkForSessionPayments(7);
      
      // Get all pending bookings
      const allBookings = await getAllBookings();
      const pendingBookings = allBookings.filter(b => b.paymentStatus === 'pending');

      for (const payment of payments) {
        try {
          // Try to match payment to a booking
          const matchedBooking = await this.findMatchingBooking(payment, pendingBookings);
          
          if (matchedBooking) {
            // Update booking status
            await updateBookingPaymentStatus(matchedBooking.id, 'paid');
            
            results.processed++;
            results.payments.push({
              bookingId: matchedBooking.id,
              playerId: matchedBooking.playerId,
              amount: payment.amount,
              transactionId: payment.transactionId,
              processedAt: new Date().toISOString()
            });
            
            console.log(`Payment processed: ${payment.amount} for booking ${matchedBooking.id}`);
          } else {
            // Log unmatched payment for manual review
            console.log('Unmatched payment:', payment);
          }
        } catch (error) {
          results.errors.push(`Error processing payment ${payment.transactionId}: ${error}`);
        }
      }
    } catch (error) {
      results.errors.push(`Failed to process payments: ${error}`);
    }

    return results;
  }

  private async findMatchingBooking(payment: any, pendingBookings: any[]): Promise<any | null> {
    // Try multiple matching strategies
    
    // 1. Direct booking reference match
    if (payment.possibleBookingRef) {
      let booking = pendingBookings.find(b => b.id === payment.possibleBookingRef);
      if (booking) return booking;
      
      // 2. Player ID match
      booking = pendingBookings.find(b => b.playerId === payment.possibleBookingRef);
      if (booking) return booking;
    }
    
    // 3. Amount-based matching (if only one pending booking with this amount)
    const amountMatches = pendingBookings.filter(b => {
      // Assuming session fee is $15
      return Math.abs(payment.amount - 15) < 0.01;
    });
    
    if (amountMatches.length === 1) {
      return amountMatches[0];
    }
    
    // 4. Player name matching in description
    for (const booking of pendingBookings) {
      try {
        const player = await getPlayerById(booking.playerId);
        if (player) {
          const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
          const description = payment.description.toLowerCase();
          
          if (description.includes(player.firstName.toLowerCase()) || 
              description.includes(player.lastName.toLowerCase()) ||
              description.includes(fullName)) {
            return booking;
          }
        }
      } catch (error) {
        console.error('Error checking player for booking:', booking.id);
      }
    }
    
    return null;
  }
}

export default BendigoPaymentProcessor;