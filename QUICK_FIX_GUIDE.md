# Quick Fix Guide - Read This First

## Your Problem
- Bookings from Show1, Show2, Show3, Show4, Show5 all appeared in **Show1 sheet only**
- Admin panel showed **"read 0 from 3 bookings"** even though data was there
- Columns misaligned between what GAS expected vs what your sheet had

## The Root Cause
The previous GAS code read from WRONG column indices:
- Expected: Column A = Booking ID, Column B = Date, Column C = Show
- Actual: Column A = Timestamp, Column B = Code, Column C = Guest

## The Solution (One File)
Download and use: **`GAS_CORRECTED.js`**

This file:
- ✅ Reads from CORRECT columns matching your sheet
- ✅ Routes Show1 bookings → Show1 sheet (not Show1 sheet)
- ✅ Routes Show2 bookings → Show2 sheet
- ✅ Routes Show3 bookings → Show3 sheet
- ✅ Routes Show4 bookings → Show4 sheet
- ✅ Routes Show5 bookings → Show5 sheet
- ✅ Makes admin panel work (reads from Pending sheet correctly)
- ✅ Includes built-in tests to verify it works

## Installation (Copy-Paste, 5 Minutes)

```
1. Go to script.google.com
2. Open your project
3. Select ALL code and DELETE it
4. Download GAS_CORRECTED.js from the repo
5. Paste the entire file content
6. Save (Ctrl+S)
7. Find line 23: const SPREADSHEET_ID = '...'
8. Replace with YOUR Google Sheet ID
9. Click Run dropdown → setupSheets → Run
10. Wait for success ✅
11. Click Deploy → New deployment
12. Web app → Execute as: your email → Anyone
13. Deploy
14. Run testAll() and check logs
15. Done! ✅
```

## How to Know It Works

Open the execution log (bottom of script editor) and look for:
```
[TEST] ✅ Sheets initialized
[TEST] ✅ Booking submitted: MAD-XXXX
[TEST] ✅ Found X pending bookings
[TEST] ✅ Found X booked seats
========== ALL TESTS COMPLETE ==========
```

If you see ✅ for all tests → Your GAS is fixed!

## After Deployment

1. **Make a test booking** on `/show3` (hold 2 seats)
2. **Check your sheet** → Go to Show3 sheet tab
3. **Should see** → Your booking in Show3 sheet (not Show1!)
4. **Open admin panel** → You should see the pending booking
5. **Click Confirm** → Booking moves to Confirmed status
6. **Check Show3 sheet again** → Status changed to Confirmed ✅

## New Test Commands Available

```javascript
testAll()           // Run all 6 tests
testSetup()         // Verify sheets exist
testSubmitBooking() // Test booking flow
testGetPending()    // Test admin read
testGetSeats()      // Test seat availability
testSearch()        // Test search function
testSummary()       // Test show summaries
```

## If It Still Doesn't Work

### Problem: "Sheet not found"
- Run setupSheets() again
- Check sheet names: Show1, Show2, Show3, Show4, Show5, Pending

### Problem: "Admin still shows 0 bookings"
- Did you deploy the NEW code as web app? (Deploy button)
- Did you update SPREADSHEET_ID?
- Did testGetPending() show any bookings in execution log?

### Problem: Bookings still going to Show1 only
- Check frontend is sending `showNumber` (should be 1-5)
- Did you deploy the NEW web app? (not old URL)
- Did testSubmitBooking() create booking in Show1 sheet?

## Column Reference

Your sheet now correctly maps to:

| Column | Name | Example |
|--------|------|---------|
| A | Timestamp | 6/21/2026 10:30:45 |
| B | Code | MAD-K7XP |
| C | Primary Guest | Ahmed Mohamed |
| D | Phone | 201234567890 |
| E | Show | 1 |
| F | Total Seats | 3 |
| G | Total Price (EGP) | 1500 |
| H | Payment Method | InstaPay |
| I | Status | Pending |
| J | Branch | Maadi |
| K+ | Seat 1, 2, 3, ... | A1, A2, A3, ... |

## Support

- See `GAS_INSTALLATION_FINAL.md` for full installation guide
- Check `GAS_CORRECTED.js` line 1-50 for configuration options
- All functions have console.log() for debugging

---

**Summary**: Replace old GAS code with `GAS_CORRECTED.js` → Update SPREADSHEET_ID → Run setupSheets() → Deploy → testAll() → Done! ✅

Your booking system will work correctly across all 5 shows!
