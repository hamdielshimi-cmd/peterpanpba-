# Google Apps Script Configuration

## Setup Instructions

The Peter Pan Ballet Gala booking app integrates with Google Apps Script for backend booking management.

### 1. Deploy Google Apps Script

Create a new Google Apps Script project with the following endpoints:

#### GET Endpoint - Fetch Seat Availability
```
GET ?show=N
```

Returns:
```json
{
  "confirmed": ["A1", "B5", ...],
  "pending": ["C3", "C4", ...]
}
```

- `confirmed`: Seats that are booked (dark red, unclickable)
- `pending`: Seats held by others (gray, unclickable)
- All others: Available (teal outline, clickable)

#### POST Endpoint - Submit Booking

Request body:
```json
{
  "action": "submit",
  "showNumber": 1,
  "primaryGuest": "Ahmed Mohamed",
  "phone": "201012345678",
  "paymentMethod": "InstaPay",
  "seatGuestPairs": [
    { "seat": "A5", "guest": "Ahmed Mohamed" },
    { "seat": "A6", "guest": "Companion 1" }
  ]
}
```

Response:
```json
{
  "success": true,
  "code": "X7K2PQ",
  "totalPrice": 1000,
  "totalSeats": 2,
  "whatsappLink": "https://wa.me/..."
}
```

#### POST Endpoint - Confirm Booking

Request body:
```json
{
  "action": "confirm",
  "code": "X7K2PQ",
  "showNumber": 1
}
```

#### POST Endpoint - Cancel Booking

Request body:
```json
{
  "action": "cancel",
  "code": "X7K2PQ",
  "showNumber": 1
}
```

#### GET Endpoint - Search Booking

```
GET ?action=search&code=X7K2PQ&show=1
```

Returns full booking details for admin panel.

### 2. Update Configuration

Replace the `GAS_URL` in the following files with your deployed Google Apps Script URL:

- `client/src/pages/Home.tsx` (line ~15)
- `client/src/pages/Admin.tsx` (line ~10)

Example:
```typescript
const GAS_URL = 'https://script.google.com/macros/d/YOUR_SCRIPT_ID/usercache/v1';
```

### 3. Google Sheet Structure

The Google Apps Script should maintain a Google Sheet with the following columns:

| Column | Type | Description |
|--------|------|-------------|
| Booking Code | Text | Unique 6-character code |
| Show Number | Number | 1-5 |
| Primary Guest | Text | Lead booker name |
| Phone | Text | Contact phone number |
| Payment Method | Text | "InstaPay" or "Cash" |
| Status | Text | "Pending", "Confirmed", or "Cancelled" |
| Seats | Text | Comma-separated seat labels (e.g., "A5,A6,B3") |
| Guests | Text | Comma-separated guest names |
| Total Price | Number | Total booking amount in EGP |
| Timestamp | DateTime | Booking creation time |

### 4. Polling

The app polls the GET endpoint every 30 seconds to refresh seat availability in real-time.

---

## Testing

Once deployed, test the booking flow:

1. Navigate to `/show1` (or `/show2`, etc.)
2. Select seats
3. Fill in guest details
4. Choose payment method
5. Submit booking
6. Verify data appears in Google Sheet
7. Use `/admin` panel to search and confirm bookings

---

## Support

For issues with the Google Apps Script integration, check:
- CORS settings are enabled
- Script is deployed as a web app with "Execute as" set to your account
- Google Sheet has proper sharing permissions
