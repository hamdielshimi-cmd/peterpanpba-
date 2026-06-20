## ACTION PLAN - DO THIS NOW (5 Minutes)

### What Was Wrong
```
[ERROR] TypeError: doPost(...).getContentText is not a function
```

**Cause:** Test functions were incorrectly calling `doPost()` and `doGet()` with `.getContentText()` chain.
**Status:** FIXED ✅

---

## Step 1: Fix the Test Functions (2 minutes)

### Option A: Quick Fix (Recommended)
1. Download: `GAS_FIXED_TESTS.js` from the repo
2. Go to: https://script.google.com → Your project
3. Scroll down in the code editor and find the old test functions:
   - `testAll()`
   - `testSubmitBooking()`
   - `testGetSeats()`
   - `testGetPendingBookings()`
   - `testSearchBooking()`
   - `testGetSummary()`

4. **Delete** all these old test functions (just the functions, not anything else)
5. **Paste** the entire contents of `GAS_FIXED_TESTS.js` at the bottom
6. Click **Save** (Ctrl+S)

### Option B: Full Replacement
- Download entire `GAS_CORRECTED.js` (with new test functions built in)
- Delete all code in script.google.com
- Paste entire file
- Update SPREADSHEET_ID at line 23
- Save

---

## Step 2: Run the Tests (1 minute)

1. At the top of script.google.com, click the dropdown that says "Select function"
2. Choose `testAll`
3. Click the **Run** button (play icon)
4. Wait for execution to complete
5. Click on **Execution log** at the bottom to see results

### Expected Output
```
========== STARTING TEST SUITE ==========

[TEST] ✅ Sheets initialized
[TEST] ✅ Booking submitted: MAD-XXXX
[TEST] ✅ Retrieved all booked seats
[TEST] ✅ Retrieved pending bookings
[TEST] ✅ Search working
[TEST] ✅ Summary retrieved

========== ALL TESTS COMPLETE ✅ ==========
```

If you see ✅ for all tests → **SUCCESS!**

---

## Step 3: Verify Real Bookings Work (2 minutes)

1. Go to your app: `/show1` (or any show link)
2. Hold some seats (e.g., A1, A2)
3. Fill in guest details
4. Click "Book Now"
5. Should see confirmation with booking code

### Check Sheet
1. Go to Google Sheet
2. Click the **Show1** tab (not Sheet1!)
3. You should see your booking in there
4. NOT in Sheet1 ✅

### Check Admin Panel
1. Go to admin panel
2. Click "Refresh" or reload
3. Should show your pending booking
4. NOT showing "0 bookings" ✅

---

## What Was Updated

- ✅ **Frontend GAS_URL**: Updated to your new deployment URL
  - All bookings will go to correct deployment now
  - File: `client/src/pages/createShowPage.tsx`

- ✅ **GAS Test Functions**: Fixed to call internal functions directly
  - All 6 tests now work without errors
  - File: `GAS_FIXED_TESTS.js`

---

## If Something Still Goes Wrong

### Problem: Tests still show errors
**Solution:** Make sure you:
- Deleted ALL the old test functions completely
- Pasted the entire `GAS_FIXED_TESTS.js` file
- Saved the file (Ctrl+S)
- Selected `testAll` from dropdown before clicking Run

### Problem: Bookings still going to Show1 only
**Solution:** Make sure:
- SPREADSHEET_ID is correct (line 23)
- You actually deployed (not just saved)
- Frontend updated to new GAS_URL (it is, we just did it)

### Problem: Admin panel still shows "read 0"
**Solution:** Check:
- Run `testGetPendingBookings()` to see if data is retrievable
- Check that the Show1, Show2, etc. sheets exist (setupSheets should create them)
- Make sure you clicked "Refresh" in admin panel

### Problem: Still confused?
**Read:** `FIX_EXPLANATION.md` - explains exactly what was wrong and why

---

## Final Checklist

- [ ] Downloaded GAS_FIXED_TESTS.js or GAS_CORRECTED.js
- [ ] Updated test functions in script.google.com
- [ ] Saved the file
- [ ] Ran testAll()
- [ ] Saw ✅ marks in the log
- [ ] Made a real booking on /show1
- [ ] Checked booking appears in Show1 sheet (not Sheet1)
- [ ] Checked admin panel shows the booking
- [ ] Confirmed admin can approve/deny it

Once all checkboxes are done → **You're finished!** 🎉

---

## Questions?

Read these files in order:
1. **FIX_EXPLANATION.md** - Understand what went wrong
2. **GAS_INSTALLATION_FINAL.md** - Detailed installation guide
3. **QUICK_FIX_GUIDE.md** - Quick reference

Or just follow this ACTION_PLAN_NOW.md file - it's all you need!
