# Deployment & Management Guide

**For:** Mareeba Badminton Club Website  
**Last Updated:** December 12, 2025

---

## 🚀 How to Deploy Changes

After making code changes, follow these steps to deploy to your live website:

### Step 1: Open Terminal
- In Cursor/VS Code: Press `` Ctrl+` `` (backtick) to open terminal
- Or open PowerShell and navigate to your project:
  ```powershell
  cd C:\mareeba-club
  ```

### Step 2: Save Changes to Git
```powershell
git add .
git commit -m "Your description of changes"
git push
```

### Step 3: Wait for Deployment
- Vercel automatically detects the push
- Go to [vercel.com](https://vercel.com) → Your project → **Deployments**
- Wait for status to change from "Building" to "Ready" (1-2 minutes)

### Step 4: Test Your Changes
- Visit your live website
- Test the features you changed

---

## 📋 Quick Reference Commands

| Action | Command |
|--------|---------|
| Check what changed | `git status` |
| Save all changes | `git add .` |
| Commit with message | `git commit -m "message"` |
| Push to deploy | `git push` |
| Get latest changes | `git pull` |
| Do all at once | `git add . && git commit -m "message" && git push` |

---

## 👥 Working with Multiple Admins

If you have another admin who needs to edit the code on their laptop, here's how to set it up:

### For the Repository Owner (You)

**Give them access to GitHub:**

1. Go to [github.com/MareebaBadminton/mareeba-club](https://github.com/MareebaBadminton/mareeba-club)
2. Click **Settings** (top menu)
3. Click **Collaborators** (left sidebar)
4. Click **Add people**
5. Enter their GitHub username or email
6. Choose **Write** access (allows editing)
7. Click **Add [username] to this repository**
8. They'll receive an email invitation

### For the New Admin (Them)

**First Time Setup:**

1. **Create a GitHub account** (if they don't have one)
   - Go to [github.com](https://github.com) and sign up

2. **Accept the invitation**
   - Check their email for the GitHub invitation
   - Click "Accept invitation"

3. **Install Git** (if not installed)
   - Download: [git-scm.com/download/win](https://git-scm.com/download/win)
   - Install with default settings

4. **Install Cursor** (if not installed)
   - Download: [cursor.sh](https://cursor.sh)

5. **Clone the repository to their laptop:**
   ```powershell
   cd C:\Users\TheirName\Documents
   git clone https://github.com/MareebaBadminton/mareeba-club.git
   cd mareeba-club
   ```

6. **Open in Cursor:**
   - Open Cursor
   - File → Open Folder → Select `mareeba-club` folder

### Daily Workflow (Both Admins)

**Before starting work (IMPORTANT!):**
```powershell
git pull
```
This downloads the latest changes from GitHub so you're always working with the latest code.

**After making changes:**
```powershell
git add .
git commit -m "Description of your changes"
git push
```

### Important Notes

- ✅ **Always `git pull` first** - Gets the latest code from GitHub
- ✅ **Work on different files** - Reduces conflicts
- ✅ **If you both edit the same file** - Git will help merge changes (usually automatic)
- ✅ **Changes deploy automatically** - After `git push`, Vercel deploys in 1-2 minutes

---

## 📅 Managing Unavailable Dates

Unavailable dates (holidays, closures) are stored in Supabase. You can add or remove them without changing code.

### How to Add an Unavailable Date

1. Go to [supabase.com](https://supabase.com) and log in
2. Select your project
3. Click **Table Editor** (left sidebar)
4. Click **unavailable_dates** table
5. Click **Insert row** (top right)
6. Fill in:
   - **date**: The date in format `YYYY-MM-DD` (e.g., `2026-12-25`)
   - **reason**: Message to show users (e.g., `No session due to Christmas Day`)
7. Click **Save**

### How to Remove an Unavailable Date

1. Go to Supabase → **Table Editor** → **unavailable_dates**
2. Find the row you want to remove
3. Click on the row to select it
4. Click **Delete** (or press Delete key)
5. Confirm deletion

### Example Dates Format

| date | reason |
|------|--------|
| 2026-01-01 | No session due to New Year's Day. Thank you for your understanding. |
| 2026-04-25 | No session due to ANZAC Day. Thank you for your understanding. |
| 2026-12-25 | No session due to Christmas Day. Thank you for your understanding. |
| 2026-12-26 | No session due to Boxing Day. Thank you for your understanding. |

### Tips
- Date format must be `YYYY-MM-DD` (year-month-day)
- The reason message is shown to users when they select that date
- Changes take effect immediately (no deployment needed!)

---

## 🔐 Managing Admin Password

The admin password is stored securely in Vercel.

### How to Change the Admin Password

1. Go to [vercel.com](https://vercel.com) and log in
2. Click on your **mareeba-club** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)
5. Find `ADMIN_PASSWORD`
6. Click the **⋮** menu → **Edit**
7. Enter your new password
8. Click **Save**
9. Go to **Deployments** → Click **⋮** on latest → **Redeploy**

---

## 🔧 Troubleshooting

### "Changes not showing on website"
1. Make sure you ran `git push`
2. Check Vercel deployments - is it still building?
3. Try hard refresh: `Ctrl+Shift+R` in browser

### "Admin login not working"
1. Check Vercel Environment Variables for `ADMIN_PASSWORD`
2. Make sure you redeployed after adding/changing the password

### "Unavailable date not showing"
1. Check the date format is `YYYY-MM-DD`
2. Hard refresh the booking page: `Ctrl+Shift+R`

### "Error loading data"
1. Check your internet connection
2. Check Supabase dashboard - is the database online?
3. Check Vercel dashboard for error logs

---

## 📞 Need Help?

If something isn't working:
1. Check the error message carefully
2. Review the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) file
3. Check the [CODE_REVIEW.md](./CODE_REVIEW.md) for technical details
