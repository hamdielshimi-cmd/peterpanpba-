# Google Apps Script Installation - CORRECTED VERSION

## Problem We Fixed

Your data WAS in the sheet, but the GAS code was reading from the WRONG columns. The script expected:
- Column A = Booking ID
- Column B = Date  
- Column C = Show

But your sheet actually had:
- Column A = Timestamp
- Column B = Code (Booking ID)
- Column C = Primary Guest
- Column D = Phone
- Column E = Show

This caused the admin panel to read "0 bookings" even though 3 were there.

## The Solution

Use **GAS_CORRECTED.js** - it reads from the CORRECT columns that match your actual sheet structure.

---

## Installation Steps (5 minutes)

### Step 1: Open Google Apps Script
1. Go to https://script.google.com
2. Select your "Peter Pan Booking" project
3. Delete ALL existing code in the editor

### Step 2: Copy New Code
1. Go to the repository and download **`GAS_CORRECTED.js`**
2. Copy the entire file content
3. Paste it into script.google.com (replace everything)
4. Save (Ctrl+S)

### Step 3: Update Your Spreadsheet ID
1. In the code, find line 23:  
   ```javascript
   const SPREADSHEET_ID = '1AwEkRcyvB_OwRFsJfGhdZsA0gLUHXuIFl2-YMZ8h2rk';
   ```
2. Replace it with YOUR Google Sheet ID (get it from your sheet URL)

### Step 4: Initialize Sheets
1. Click the **Run** menu dropdown (top left)
2. Select **`setupSheets`**
3. Click **Run** - wait 10 seconds
4. Check the **Execution log** - you should see:  
   ```
   [SETUP] ✅ All sheets ready!
   ```

### Step 5: Deploy as Web App
1. Click **Deploy** (red button, top right)
2. Select **"New deployment"**
3. Choose **"Web app"** from the type dropdown
4. Set:
   - Execute as: **Your email**
   - Who has access: **Anyone**
5. Click **Deploy**
6. Copy the deployment URL shown (looks like: `https://script.google.com/macros/d/YOUR_ID/userweb`)

### Step 6: Run Tests (CRITICAL!)
1. Back in the code editor
2. Click the **Run** menu dropdown
3. Select **`testAll`**
4. Click **Run** and wait
5. Check the **Execution log** - you should see:
   ```
   ========== STARTING TEST SUITE ==========
   [TEST] ✅ Sheets initialized
   [TEST] ✅ Booking submitted: MAD-XXXX
   [TEST] ✅ Found X pending bookings
   [TEST] ✅ Found X booked seats
   ✅ ...
   ========== ALL TESTS COMPLETE ==========
   ```

If all tests pass with ✅, your GAS is ready!

---

## What Each Test Does

| Test | What It Checks |
|------|---------|
| `testSetup()` | Creates all 5 show sheets + Pending sheet |
| `testSubmitBooking()` | Books 2 seats in Show 1, checks it appears in Show1 sheet |
| `testGetPending()` | Reads pending bookings from Pending sheet |
| `testGetSeats()` | Gets list of booked seats for Show 1 |
| `testSearch()` | Searches for bookings by guest name |
| `testSummary()` | Gets summary stats (confirmed/pending/revenue) for all shows |

---

## After Successful Deployment

Your system should now work like this:

### Frontend → GAS → Sheets
1. User opens `/show1` and books 3 seats
2. Frontend sends to GAS with `showNumber: 1`
3. GAS writes to **"Show1"** sheet, NOT Sheet1
4. Admin panel loads and reads from Pending sheet
5. Admin clicks "Confirm" → booking moves to Confirmed status
6. Each show has its own sheet with its own data

### Sheet Structure
- **Show1** sheet: All bookings from `/show1`
- **Show2** sheet: All bookings from `/show2`
- **Show3** sheet: All bookings from `/show3`
- **Show4** sheet: All bookings from `/show4`
- **Show5** sheet: All bookings from `/show5`
- **Pending** sheet: All pending bookings (across all shows) for admin review

---

## Columns in Each Sheet (Match Frontend)

| Col | Header | Example |
|-----|--------|---------|
| A | Timestamp | 6/20/2026 11:45:31 |
| B | Code | MAD-K7XP |
| C | Primary Guest | Ahmed |
| D | Phone | 201234567890 |
| E | Show | 1 |
| F | Total Seats | 3 |
| G | Total Price (EGP) | 1500 |
| H | Payment Method | InstaPay |
| I | Status | Pending |
| J | Branch | Maadi |
| K-O | Seat 1-5 | A1, A2, A3, ... |
| P-T | Seat 1-5 Guest | Guest 1, Guest 2, ... |

---

## If Tests Fail

### "Sheet not found" error
- Run `setupSheets()` again
- Make sure sheets are named exactly: `Show1`, `Show2`, `Show3`, `Show4`, `Show5`, `Pending`

### "Invalid show number" error
- Make sure `showNumber` is 1-5 in the payload
- Check that frontend is sending it correctly

### "Failed to read column" error
- Your sheet might have extra columns before column A
- Delete any empty columns at the beginning
- Column A must be "Timestamp"

### Admin panel still shows "0 bookings"
- Make sure you deployed the web app (Deploy button)
- Check that the GAS_URL in admin.html matches your deployment URL
- Run `testAll()` to verify GAS works

---

## Reverting Old Code

If you need to go back to the old code, keep a backup in a separate Google Doc before replacing it.

---

## Testing Commands You Can Run Anytime

```javascript
// Test a single show's stats
testSummary();

// Test pending bookings
testGetPending();

// Test booked seats
testGetSeats();

// Run all tests
testAll();
```

---

## Need Help?

Check the **Execution log** (bottom of script editor) for detailed error messages. All functions include console.log() to help you debug.

---

**Status: ✅ All bookings will now go to the correct show sheets, admin panel will read correctly, and all 5 shows will be fully functional.**
