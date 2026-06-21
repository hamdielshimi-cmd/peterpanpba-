# Peter Pan Booking System - 5 Show Links

## Frontend Deployment URL
Replace `YOUR_FRONTEND_URL` with your actual deployed URL (from Vercel)

---

## Show 1 - Peter Pan Cast 1
**Link:**
```
YOUR_FRONTEND_URL/show1
```
**Details:** Friday, June 26 | 1:30 PM
**Data Sheet:** Show1 (in Google Sheet)
**Admin Tab:** "Cast 1"

---

## Show 2 - Peter Pan Cast 2
**Link:**
```
YOUR_FRONTEND_URL/show2
```
**Details:** Friday, June 26 | 6:00 PM
**Data Sheet:** Show2 (in Google Sheet)
**Admin Tab:** "Cast 2"

---

## Show 3 - Peter Pan Cast 3
**Link:**
```
YOUR_FRONTEND_URL/show3
```
**Details:** Saturday, June 27 | 12:00 PM
**Data Sheet:** Show3 (in Google Sheet)
**Admin Tab:** "Cast 3"

---

## Show 4 - Contemporary SURVIVAL 1
**Link:**
```
YOUR_FRONTEND_URL/show4
```
**Details:** Saturday, June 27 | 6:00 PM
**Data Sheet:** Show4 (in Google Sheet)
**Admin Tab:** "SURVIVAL"

---

## Show 5 - Contemporary SURVIVAL 2
**Link:**
```
YOUR_FRONTEND_URL/show5
```
**Details:** Saturday, June 27 | 8:00 PM
**Data Sheet:** Show5 (in Google Sheet)
**Admin Tab:** "SURVIVAL"

---

## Admin Panel
**Link:**
```
YOUR_FRONTEND_URL/admin
```
**Features:**
- View all pending bookings across shows
- Filter by show
- Search by guest name or phone
- Confirm/Cancel bookings
- View summary statistics

---

## How It Works (Data Flow)

```
User visits /show1
          ↓
Books seats + enters details
          ↓
Sends to Google Apps Script (GAS)
          ↓
GAS writes to "Show1" sheet + "Pending" sheet
          ↓
Admin clicks "Show 1" tab
          ↓
Fetches from Pending sheet for Show1
          ↓
Admin confirms booking
          ↓
GAS updates status to "Confirmed" in Show1 sheet
          ↓
Booking removed from Pending sheet
          ↓
Done! ✅
```

---

## Data Storage

| Show | Sheet Name | Location |
|------|-----------|----------|
| Show 1 | Show1 | Google Sheet tab 1 |
| Show 2 | Show2 | Google Sheet tab 2 |
| Show 3 | Show3 | Google Sheet tab 3 |
| Show 4 | Show4 | Google Sheet tab 4 |
| Show 5 | Show5 | Google Sheet tab 5 |
| Pending | Pending | Google Sheet tab 6 |

---

## Important: Replace URLs

Before using, replace `YOUR_FRONTEND_URL` with your actual deployment URL:
- If deployed on Vercel: `https://your-project.vercel.app`
- If local testing: `http://localhost:5173`

---

## GAS Deployment

The Google Apps Script URL is:
```
https://script.google.com/macros/s/AKfycbzughNZylOlV2NTKfkt3WNrcfcbWPaDBvVeH0osmrkwp51tLuOESqe4Ss1hk42RNFuD/exec
```

This is already configured in the frontend code.
