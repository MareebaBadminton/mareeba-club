# Code Review: Mareeba Badminton Club

**Date:** December 12, 2025  
**Reviewer:** AI Code Review  
**Project:** Next.js 14 + Supabase Badminton Club Booking System

---

## Executive Summary

Overall, this is a **well-structured Next.js application** with clean separation of concerns. The codebase successfully migrated from localStorage/Google Sheets to Supabase. However, there are several areas for improvement around **caching**, **security**, **type safety**, and **code organization**.

### Overall Score: 7/10

---

## 🟢 Strengths

### 1. Clean Architecture
- Good separation between API routes, components, and utilities
- Consistent file naming conventions
- Logical folder structure (`/api`, `/components`, `/lib`)

### 2. User Experience
- Mobile-responsive design with Tailwind CSS
- Clear user flows (Register → Book → Pay)
- Helpful error messages and loading states
- Real-time updates with polling (30-second intervals)

### 3. Timezone Handling
- Proper use of `Australia/Brisbane` timezone
- Consistent use of `Intl.DateTimeFormat` for date formatting
- Dedicated `dateUtils.ts` for timezone operations

### 4. Database Design
- Clean Supabase integration
- Well-defined TypeScript interfaces
- Proper foreign key relationships (players → bookings → payments)

---

## 🔴 Critical Issues

### 1. Missing `dynamic = 'force-dynamic'` on Other API Routes
**Severity:** HIGH  
**Files:** `src/app/api/bookings/route.ts`, `src/app/api/sessions/route.ts`, `src/app/api/players/route.ts`

Only the `next-session` route has `export const dynamic = 'force-dynamic'`. Other routes may experience similar caching issues.

**Recommendation:**
```typescript
// Add to ALL API routes that fetch from database
export const dynamic = 'force-dynamic'
```

### 2. Hardcoded Admin Password
**Severity:** CRITICAL  
**File:** `src/components/PaymentTracker.tsx` (Line 28)

```typescript
const ADMIN_PASSWORD = 'MB4dm!nton';
```

This password is exposed in the client-side bundle and can be easily extracted.

**Recommendation:**
- Move admin authentication to server-side
- Use Supabase Auth or NextAuth.js
- At minimum, use environment variables and server-side validation

### 3. Hardcoded Unavailable Dates
**Severity:** MEDIUM  
**File:** `src/components/BookingForm.tsx` (Lines 71-84)

```typescript
const isDateUnavailable = (dateString: string) => {
  return dateString === '2025-06-15' || 
         dateString === '2025-07-06' || 
         // ... more hardcoded dates
};
```

**Recommendation:**
- Store unavailable dates in Supabase
- Create an admin interface to manage blackout dates
- Query database for unavailable dates

---

## 🟡 Medium Issues

### 4. Inconsistent Error Handling
**File:** Various

Some functions throw errors, others return `{ success: false, error }`, and some return `null`.

**Example inconsistencies:**
```typescript
// playerUtils.ts - Returns null
export async function getPlayerById(id: string): Promise<Player | null>

// bookingUtils.ts - Returns object
export async function createBooking(...): Promise<{ success: boolean; booking?: Booking; error?: string }>

// PaymentTracker.tsx - Throws error
throw new Error('Booking not found');
```

**Recommendation:**
Standardize on a consistent error handling pattern across the codebase.

### 5. localStorage as Backup Storage
**Files:** `src/lib/utils/bookingUtils.ts`, `src/lib/utils/playerUtils.ts`

The code falls back to localStorage when API calls fail:

```typescript
} catch (error) {
  console.error('Error fetching bookings:', error)
  // Fallback to localStorage if API fails
  return getData('BOOKINGS') as Booking[]
}
```

**Issues:**
- localStorage data may be stale
- Can cause inconsistencies between users
- Silent failures hide real issues

**Recommendation:**
- Remove localStorage fallbacks for database operations
- Show clear error messages when API fails
- Keep localStorage only for user preferences (like announcement seen status)

### 6. Duplicate Type Definitions
**Files:** `src/lib/types/player.ts`, `src/lib/supabase.ts`

Both files define similar types (Booking, Player, Session, Payment) with slight differences.

**Recommendation:**
- Generate types from Supabase schema using `supabase gen types`
- Use a single source of truth for types
- Remove duplicate definitions

### 7. Missing Input Validation
**Files:** API routes

No Zod validation on API inputs despite Zod being installed.

```typescript
// Current: No validation
const body = await request.json()
const { playerId, sessionDate, sessionTime, sessionFee } = body

// Recommended: Use Zod
import { z } from 'zod'
const bookingSchema = z.object({
  playerId: z.string().length(5),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sessionTime: z.string(),
  sessionFee: z.number().positive().optional()
})
```

### 8. No Rate Limiting
**Files:** All API routes

API routes have no protection against abuse.

**Recommendation:**
- Add rate limiting middleware
- Use Vercel's Edge Config or Upstash Redis for rate limiting

---

## 🔵 Minor Issues / Suggestions

### 9. Unused Code / Dead Code
- `src/lib/migrate-to-supabase.ts` - Migration utility that may no longer be needed
- Legacy Google Sheets references in comments
- Unused `phone` and `emergencyContact` fields in Player type

### 10. Missing Loading States
**File:** `src/app/admin/page.tsx`

```typescript
// Bug: useState used incorrectly for side effect
useState(() => {
  updateCounts();  // Should be useEffect
});
```

### 11. Console.log Statements
Multiple `console.log` statements throughout production code should be removed or replaced with proper logging.

### 12. Inconsistent Naming
- `syncPlayersFromGoogleSheets()` - Still named for Google Sheets but uses Supabase
- `syncedToSheets` field in `PlayerSyncStatus`

### 13. No Environment Variable Validation
**File:** `src/lib/supabase.ts`

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
```

Uses non-null assertion (`!`) instead of proper validation.

**Recommendation:**
```typescript
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
})

const env = envSchema.parse(process.env)
```

---

## 📊 File-by-File Summary

| File | Issues | Priority |
|------|--------|----------|
| `PaymentTracker.tsx` | Hardcoded password | 🔴 Critical |
| `api/bookings/route.ts` | Missing dynamic export | 🔴 High |
| `api/sessions/route.ts` | Missing dynamic export | 🔴 High |
| `api/players/route.ts` | Missing dynamic export | 🔴 High |
| `BookingForm.tsx` | Hardcoded dates | 🟡 Medium |
| `bookingUtils.ts` | localStorage fallback | 🟡 Medium |
| `playerUtils.ts` | Inconsistent returns | 🟡 Medium |
| `admin/page.tsx` | useState bug | 🔵 Low |

---

## 🔧 Recommended Actions

### Immediate (Before Next Deployment)
1. ✅ Add `export const dynamic = 'force-dynamic'` to all API routes that query Supabase
2. 🔒 Move admin password to environment variable + server-side validation

### Short-term (Next Sprint)
3. Add Zod validation to all API routes
4. Remove localStorage fallbacks
5. Fix useState bug in admin page
6. Clean up console.log statements

### Long-term
7. Implement proper authentication (Supabase Auth)
8. Create admin dashboard for managing unavailable dates
9. Generate types from Supabase schema
10. Add rate limiting
11. Add automated tests

---

## 📁 Recommended Folder Structure Changes

```
src/
├── app/
│   ├── (public)/           # Public routes
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── (admin)/            # Protected admin routes
│   │   ├── admin/
│   │   └── payments/
│   └── api/
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── forms/              # Form components
│   └── sections/           # Page sections
├── lib/
│   ├── db/                 # Database utilities
│   ├── utils/              # General utilities
│   ├── validations/        # Zod schemas
│   └── types/              # Generated types
└── hooks/                  # Custom React hooks
```

---

## Conclusion

The Mareeba Badminton Club application is functional and serves its purpose well. The recent fix for the caching issue (`export const dynamic = 'force-dynamic'`) addresses a critical bug. 

**Priority fixes:**
1. Add `dynamic = 'force-dynamic'` to remaining API routes
2. Secure the admin authentication
3. Move hardcoded values to database/config

The codebase is maintainable and well-organized for a small club application. With the recommended improvements, it would be more secure, reliable, and easier to extend.

