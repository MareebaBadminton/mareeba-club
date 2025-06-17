// Date utilities for Australian timezone (GMT+10)
// Using Australia/Brisbane timezone which is consistently GMT+10 (no daylight saving)

const AUSTRALIAN_TIMEZONE = 'Australia/Brisbane'; // GMT+10, no daylight saving

// Get current date/time in Australian timezone (GMT+10)
export function getAustralianDateTime(): Date {
  const now = new Date();
  // Create a new date in Australian timezone
  const australianTimeString = now.toLocaleString('en-US', {
    timeZone: AUSTRALIAN_TIMEZONE
  });
  return new Date(australianTimeString);
}

// Get current date/time as ISO string in Australian timezone
export function getAustralianDateTimeISO(): string {
  const australianDate = getAustralianDateTime();
  // Manually format to ISO string since we want the Australian time as if it were UTC
  const year = australianDate.getFullYear();
  const month = String(australianDate.getMonth() + 1).padStart(2, '0');
  const day = String(australianDate.getDate()).padStart(2, '0');
  const hours = String(australianDate.getHours()).padStart(2, '0');
  const minutes = String(australianDate.getMinutes()).padStart(2, '0');
  const seconds = String(australianDate.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
}

// Format date for Australian locale (GMT+10)
export function formatAustralianDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-AU', {
    timeZone: AUSTRALIAN_TIMEZONE, // Queensland timezone (GMT+10)
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Get today's date in Australian timezone (for date comparisons)
export function getAustralianToday(): Date {
  const now = new Date();
  const australianDateString = now.toLocaleDateString('en-CA', {
    timeZone: AUSTRALIAN_TIMEZONE
  }); // Returns YYYY-MM-DD format
  return new Date(australianDateString + 'T00:00:00');
}

// Convert any date to Australian timezone
export function toAustralianTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const australianTimeString = dateObj.toLocaleString('en-US', {
    timeZone: AUSTRALIAN_TIMEZONE
  });
  return new Date(australianTimeString);
}

// Generate payment reference with Australian date (GMT+10)
export function generatePaymentReference(playerId: string): string {
  const now = getAustralianDateTime();
  const year = now.getFullYear();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  return `MB${playerId}${year}${day}${month}`;
}

// Get current date in YYYY-MM-DD format for Australian timezone
export function getAustralianDateString(): string {
  const now = new Date();
  return now.toLocaleDateString('en-CA', {
    timeZone: AUSTRALIAN_TIMEZONE
  }); // Returns YYYY-MM-DD format
}

// Get minimum date for booking (today in Australian timezone)
export function getMinBookingDate(): string {
  return getAustralianDateString();
} 