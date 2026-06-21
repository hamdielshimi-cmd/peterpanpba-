# FINAL 11 - Complete Setup Guide (5 Minutes)

## Step 1: Update Google Apps Script (2 minutes)

### 1.1 Open the Script
- Go to https://script.google.com
- Open your "Peter Pan Booking" project
- You should see the old code

### 1.2 Replace the Code
- Press **Ctrl+A** to select ALL code
- Delete everything
- Download `FINAL_11_GoogleAppsScript.js` from this repository
- Copy ALL content from that file
- Paste into script.google.com
- Press **Ctrl+S** to save

### 1.3 Update Your Spreadsheet ID
- Find line 27: `const SPREADSHEET_ID = '...'`
- Go to your Google Sheet
- Copy the ID from the URL: `docs.google.com/spreadsheets/d/YOUR_ID_HERE/edit`
- Replace the value on line 27

### 1.4 Initialize Sheets
- At top of page, find the dropdown that says "Select function"
- Choose **setupSheets**
- Click the **Run** button (play icon)
- Check the execution logs - you should see: `[SETUP] ✅ All sheets created and headers set!`

---

## Step 2: Deploy the Google Apps Script (2 minutes)

### 2.1 Deploy
- Click the **Deploy** button (red button, top right)
- Choose "New deployment"
- Select "Web app"
- Set:
  - **Execute as:** Your email address
  - **Who has access:** Anyone
- Click **Deploy**
- You'll get a deployment URL

### 2.2 Copy the URL
- You should see: `https://script.google.com/macros/s/AKfycbz.../exec`
- **Copy this URL** (already in frontend, but verify below)

### 2.3 Verify Frontend Has the URL
- Open `/vercel/share/v0-project/client/src/pages/createShowPage.tsx`
- Find line 11: `const GAS_URL = '...'`
- Make sure it matches the URL you just copied
- If different, update it
- Build: `npm run build`
- Deploy frontend

---

## Step 3: Test Everything (1 minute)

### 3.1 Test Booking
1. Open `YOUR_FRONTEND_URL/show1`
2. Hold 3 seats → Enter name, phone → Book
3. Go to Google Sheet
4. Click **Show1** tab
5. Your booking should be there ✅

### 3.2 Test Admin Panel
1. Open `YOUR_FRONTEND_URL/admin`
2. Click **Show 1** tab
3. You should see your pending booking
4. Click the booking
5. Click **Confirm**
6. Check Google Sheet - status should change to "Confirmed" ✅

### 3.3 Test All 5 Shows
- Repeat step 3.1 for `/show2`, `/show3`, `/show4`, `/show5`
- Each booking should go to its own sheet
- Admin should show all in Pending tab

---

## The 5 Show Links

Once deployed, share these links:

1. **Show 1** → `https://YOUR_SITE.com/show1`
2. **Show 2** → `https://YOUR_SITE.com/show2`
3. **Show 3** → `https://YOUR_SITE.com/show3`
4. **Show 4** → `https://YOUR_SITE.com/show4`
5. **Show 5** → `https://YOUR_SITE.com/show5`

**Admin Panel** → `https://YOUR_SITE.com/admin`

---

## If Something Breaks

### Admin Panel Shows "Failed to load"
- Check GAS URL in frontend matches deployment
- Run setupSheets() again in script.google.com
- Check Google Sheet has Show1-Show5 tabs

### Bookings Don't Appear in Sheet
- Check the correct show number is being sent
- Open browser DevTools (F12) → Network
- Look for requests to GAS URL
- Should see `show1`, `show2`, etc in the request

### 404 Error
- Make sure frontend URL is correct
- Make sure GAS deployment URL is correct
- Rebuild and redeploy frontend: `npm run build`

---

## Data Structure

Each booking creates:
- **Row in Show1-5 sheet**: All booking details + seat info
- **Row in Pending sheet**: Same data, removed when confirmed/cancelled

Columns:
```
A: Timestamp
B: Code (MAD-XXXX)
C: Primary Guest
D: Phone
E: Show (1-5)
F: Total Seats (1-5)
G: Total Price (500 EGP × seats)
H: Payment Method (InstaPay, Cash, etc)
I: Status (Pending → Confirmed/Cancelled)
J: Branch (Maadi, etc)
K-O: Individual seat names (A1, A2, etc)
P-T: Guest names for each seat
```

---

## Success Checklist

- [ ] Downloaded FINAL_11_GoogleAppsScript.js
- [ ] Replaced code in script.google.com
- [ ] Updated SPREADSHEET_ID on line 27
- [ ] Ran setupSheets() and saw success message
- [ ] Deployed as Web app
- [ ] Updated GAS_URL in frontend if needed
- [ ] Built and deployed frontend
- [ ] Tested Show1 booking
- [ ] Booking appeared in Show1 sheet
- [ ] Admin panel showed pending booking
- [ ] Confirmed booking updated status
- [ ] All 5 shows tested and working

---

## Support

If issues persist:
1. Check the execution logs in script.google.com
2. Verify Google Sheet ID is correct
3. Make sure tabs are named: Show1, Show2, Show3, Show4, Show5, Pending
4. Delete any Sheet1 or Sheet2 that aren't needed

That's it! ✅
