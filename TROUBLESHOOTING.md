# Troubleshooting Guide

## Common Issues & Solutions

---

### Issue: Players only appear in "Next Session" after deployment

**Symptoms:**
- You approve a player's payment in the Payments page
- The database (Supabase) shows `payment_confirmed = true` and `status = 'confirmed'`
- But the player doesn't appear in the "Next Session" page
- Players magically appear after a new Vercel deployment

**Root Cause:**
Next.js 13+ App Router **caches API route handlers by default** on Vercel. This means:
1. First request → function runs, response is cached
2. Subsequent requests → cached response is returned (stale data!)
3. New deployment → cache is invalidated → fresh data appears

**Solution:**
Add `export const dynamic = 'force-dynamic'` to the API route:

```typescript
// src/app/api/bookings/next-session/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ✅ Force dynamic rendering - never cache this route
export const dynamic = 'force-dynamic'

// ... rest of the code
```

**Why this works:**
This directive tells Next.js/Vercel to **never cache** the route and always execute the function fresh on every request.

**Reference:**
- [Next.js Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic)

---

### Issue: "Next Session" shows wrong date (off by one day)

**Symptoms:**
- Today is Friday (session day) but "Next Session" shows Sunday
- Or the date appears correct locally but wrong in production (Vercel)

**Root Cause:**
Vercel servers run in UTC timezone. When converting dates, JavaScript `Date` objects can shift days if timezone isn't handled explicitly.

**Solution:**
Always use `Intl.DateTimeFormat` with explicit `timeZone: 'Australia/Brisbane'` for all date/weekday calculations. Never rely on `toLocaleDateString()` without a timezone.

```typescript
const fmtWeekday = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  timeZone: 'Australia/Brisbane',
})

const weekday = fmtWeekday.format(new Date()).toLowerCase() // e.g. "friday"
```

---

### Issue: Bookings not saving to Supabase

**Symptoms:**
- User submits booking form
- No error shown
- But booking doesn't appear in Supabase `bookings` table

**Things to check:**
1. **Supabase RLS (Row Level Security)** - Ensure policies allow INSERT/UPDATE
2. **API route errors** - Check Vercel Function Logs for errors
3. **Network tab** - Check browser DevTools for failed requests

---

## Debugging Tips

### Check Vercel Function Logs
1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project → Deployments → Latest deployment
3. Click "Functions" tab → Select the API route
4. View real-time logs

### Test API Routes Directly
You can test API routes directly in your browser or with curl:

```bash
# Test next-session endpoint
curl https://your-domain.vercel.app/api/bookings/next-session

# Test locally
curl http://localhost:3000/api/bookings/next-session
```

### Verify Supabase Data
Check these tables in Supabase Dashboard:
- `bookings` - Verify `status`, `payment_confirmed`, `session_date`
- `payments` - Verify `status` is 'completed'
- `players` - Verify player exists with correct `player_id`

---

## Environment

- **Framework:** Next.js 13+ (App Router)
- **Hosting:** Vercel
- **Database:** Supabase
- **Timezone:** Australia/Brisbane (UTC+10)

