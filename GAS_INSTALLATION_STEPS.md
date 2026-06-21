# Google Apps Script Installation Guide

## What You Need to Download/Copy

You only need **ONE FILE** from this repository:

### `GAS_CODE_COPY_PASTE.js`
This is the complete Google Apps Script code. Copy the entire content of this file.

## Installation Steps (5 minutes)

### Step 1: Open Google Apps Script Editor
1. Go to https://script.google.com
2. Open your existing Peter Pan Booking project

### Step 2: Clear Existing Code
1. In the Apps Script editor, select **ALL code** in the current file (Ctrl+A or Cmd+A)
2. **Delete everything**

### Step 3: Paste New Code
1. Copy the entire contents of `GAS_CODE_COPY_PASTE.js`
2. Paste it into the Apps Script editor
3. Save (Ctrl+S or Cmd+S)

### Step 4: Add Your Google Sheet ID
1. Find this line in the code:
   ```javascript
   const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE';
   ```

2. Replace `YOUR_GOOGLE_SHEET_ID_HERE` with your actual Google Sheet ID:
   - Open your Google Sheet
   - The URL looks like: `https://docs.google.com/spreadsheets/d/1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX9YZ/edit`
   - Copy the part between `/d/` and `/edit`: `1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX9YZ`
   - Paste it as: `const SPREADSHEET_ID = '1ABC2DEF3GHI4JKL5MNO6PQR7STU8VWX9YZ';`

### Step 5: Verify Sheet Names
The code expects these exact sheet names in your Google Sheet:
- `Show1` (for Show 1 bookings)
- `Show2` (for Show 2 bookings)
- `Show3` (for Show 3 bookings)
- `Show4` (for Show 4 bookings)
- `Show5` (for Show 5 bookings)
- `Pending` (for admin review)

**If your sheets have different names**, update the mapping at the top of the code:
```javascript
const SHOW_NAMES = {
  1: 'Show1',    // Change 'Show1' to your actual sheet name
  2: 'Show2',    // Change 'Show2' to your actual sheet name
  3: 'Show3',    // etc.
  4: 'Show4',
  5: 'Show5'
};
```

### Step 6: Deploy as Web App
1. Click **Deploy** (top right, red button)
2. Select **+ New deployment**
3. Choose **Type**: Select "Web app" from the dropdown
4. Set **Execute as**: Your email address
5. Set **Who has access**: "Anyone" (to allow the frontend to call it)
6. Click **Deploy**

### Step 7: Copy the Deployment URL
1. After deployment, Google will show you a URL that looks like:
   ```
   https://script.google.com/macros/s/AKfycbz.../exec
   ```
2. This URL is already in your frontend code (file: `createShowPage.tsx` line 11)

### Step 8: Test the Connection

Run this in the Apps Script editor console (Ctrl+Enter):
```javascript
testSubmit();
```

Check the logs (View → Logs) for:
- `[TEST] Submit response: ...`
- No errors

If successful, your bookings are now going to the correct show-specific sheets!

## Column Structure in Sheets

Each sheet (Show1-5 and Pending) should have these columns:

| Column | Header | Data Type | Notes |
|--------|--------|-----------|-------|
| A | Booking ID | Text | 8-character auto-generated |
| B | Date/Time | Timestamp | When booking was made |
| C | Show Number | Number | 1-5 |
| D | Primary Guest Name | Text | Customer name |
| E | Phone | Text | With country code |
| F | Payment Method | Text | e.g., "InstaPay" |
| G | Branch | Text | Maadi, New Cairo, etc. |
| H | Seats | Text | Comma-separated (A1, A2, B5) |
| I | Total Price | Number | Seats × 500 EGP |
| J | Status | Text | "Pending" or "Confirmed" |

## What Each Function Does

| Function | Called From | Purpose |
|----------|------------|---------|
| `handleSubmit()` | Frontend booking form | Creates new booking in correct show sheet |
| `handleConfirm()` | Admin panel | Approves pending booking |
| `handleCancel()` | Admin panel | Cancels pending booking |
| `handleGetPending()` | Admin panel | Gets all pending bookings for a show |
| `handleGetShowSummary()` | Admin dashboard | Gets totals for a show |
| `handleGetSeats()` | Frontend on page load | Gets all booked/held seats |
| `handleSearch()` | Admin search | Finds booking by ID or phone |
| `handleSearchGuest()` | Admin search | Finds booking by guest name |

## How It Works - Data Flow

```
User books seats on /show3
    ↓
Frontend sends: { action: 'submit', showNumber: 3, ... }
    ↓
GAS receives request in doPost()
    ↓
Extracts showNumber = 3
    ↓
Gets sheet name from SHOW_NAMES[3] = 'Show3'
    ↓
Opens 'Show3' sheet
    ↓
Appends booking to Show3 sheet ✅
    ↓
Also adds to 'Pending' sheet for admin review
    ↓
Returns booking confirmation code to frontend
```

## Troubleshooting

### "Sheet not found for show X"
- Check that your sheet names match exactly (case-sensitive)
- Make sure SPREADSHEET_ID is correct
- Verify the sheet exists in your Google Sheet

### "Invalid show number"
- Frontend is sending a show number outside 1-5
- Check that you're visiting /show1 through /show5 URLs

### Admin can't see pending bookings
- Make sure you have a 'Pending' sheet
- Check that bookings are actually being created

### Bookings still going to Sheet1
- SPREADSHEET_ID might be incorrect
- Sheet names might not match
- Apps Script might not be redeployed

## After Installation

1. All bookings from `/show1` now go to the `Show1` sheet ✅
2. All bookings from `/show2` now go to the `Show2` sheet ✅
3. Admin can see all pending bookings and confirm/cancel ✅
4. Mobile seats layout works smoothly ✅
5. No more 404 errors ✅

You're done! The booking system is now fully integrated. 🎉
