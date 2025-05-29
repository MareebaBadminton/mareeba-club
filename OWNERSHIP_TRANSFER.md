# Mareeba Badminton Club Website - Ownership Transfer Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [File Structure](#file-structure)
3. [Setup Instructions](#setup-instructions)
4. [Making Changes](#making-changes)
5. [Important Configurations](#important-configurations)
6. [Maintenance Tasks](#maintenance-tasks)

## Project Overview
This is a Next.js website for Mareeba Badminton Club that handles:
- Player registration
- Session booking
- Payment tracking
- Session attendance management

### Key Features
- Online registration system
- Session booking with player ID
- Payment tracking through bank transfers
- Player list management
- Session schedule management

## File Structure
```
mareeba-club/
├── public/
│   └── mb-logo.png              # Club logo
├── src/
│   ├── app/
│   │   ├── page.tsx             # Main page
│   │   ├── globals.css          # Global styles
│   │   └── layout.tsx           # Layout component
│   ├── components/
│   │   ├── BookingForm.tsx      # Session booking
│   │   ├── RegisterForm.tsx     # Player registration
│   │   └── SessionPlayerList.tsx # Player lists
│   └── lib/
│       ├── types/
│       │   └── player.ts        # TypeScript definitions
│       └── utils/
│           ├── bookingUtils.ts  # Booking functions
│           ├── playerUtils.ts   # Player management
│           ├── paymentUtils.ts  # Payment tracking
│           └── storage.ts       # Data storage
├── package.json                 # Dependencies
└── tailwind.config.js          # Styling config
```

## Setup Instructions

### Prerequisites
1. Install Node.js (version 18 or higher)
2. Install Git (optional, for version control)

### Initial Setup
1. Clone/copy the project to your computer
2. Open terminal in project directory
3. Run these commands:
   ```bash
   npm install
   npm run dev
   ```
4. Website will run at: http://localhost:3000

## Making Changes

### Common Changes

#### 1. Bank Details
File: `src/components/BookingForm.tsx`
```typescript
<div className="grid gap-2 text-blue-700">
  <p>Bank: Bendigo Bank</p>
  <p>Account Name: Mareeba Badminton</p>
  <p>BSB: 633-000</p>
  <p>Account Number: 225 395 003</p>
</div>
```

#### 2. Session Times
File: `src/lib/utils/storage.ts`
```typescript
const DEFAULT_SESSIONS = [
  {
    id: 'friday-evening',
    dayOfWeek: 'Friday',
    startTime: '19:30',
    endTime: '21:30',
    maxPlayers: 24,
    fee: 8
  },
  // ... other sessions
];
```

#### 3. Fees
File: `src/app/page.tsx`
```typescript
<div className="text-gray-600">
  <p className="mb-2">Member Rate (with ID): $8.00</p>
  <p>Casual Rate: $10.00</p>
</div>
```

### Adding New Features
1. Components go in: `src/components/`
2. Page changes in: `src/app/page.tsx`
3. New utilities in: `src/lib/utils/`

## Important Configurations

### Data Storage
- Currently using browser localStorage
- Data stored under these keys:
  - `mareeba_players`: Player information
  - `mareeba_bookings`: Session bookings
  - `mareeba_payments`: Payment records
  - `mareeba_sessions`: Session configurations

### Session Limits
- Maximum players per session: 24
- Booking requires player ID
- One booking per player per session

## Maintenance Tasks

### Regular Tasks
1. Check storage usage (localStorage limits)
2. Verify payment records
3. Update session schedules as needed
4. Backup player data periodically

### Backup Process
1. Export localStorage data:
   ```javascript
   // In browser console:
   const backup = {
     players: JSON.parse(localStorage.getItem('mareeba_players')),
     bookings: JSON.parse(localStorage.getItem('mareeba_bookings')),
     payments: JSON.parse(localStorage.getItem('mareeba_payments')),
     sessions: JSON.parse(localStorage.getItem('mareeba_sessions'))
   };
   console.log(JSON.stringify(backup));
   ```
2. Save the output to a file
3. Store backup safely

### Restoring Data
1. Open browser console
2. Paste backup data:
   ```javascript
   const backup = /* your backup data */;
   localStorage.setItem('mareeba_players', JSON.stringify(backup.players));
   localStorage.setItem('mareeba_bookings', JSON.stringify(backup.bookings));
   localStorage.setItem('mareeba_payments', JSON.stringify(backup.payments));
   localStorage.setItem('mareeba_sessions', JSON.stringify(backup.sessions));
   ```

## Support and Resources
- Next.js Documentation: https://nextjs.org/docs
- TailwindCSS Documentation: https://tailwindcss.com/docs
- React Documentation: https://react.dev

## Contact Information
[Add your contact information here for transition period support]

## Version History
- Initial Release: [Current Date]
- Last Updated: [Current Date]

## License
[Add license information if applicable] 