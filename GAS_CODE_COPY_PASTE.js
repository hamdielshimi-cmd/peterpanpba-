/**
 * PETER PAN BOOKING SYSTEM - Google Apps Script
 * 
 * This file contains the complete code to handle:
 * - Show-specific seat bookings (5 different shows)
 * - Pending bookings management
 * - Admin panel integration
 * 
 * INSTALLATION STEPS:
 * 1. Open your Google Apps Script at script.google.com
 * 2. Delete ALL existing code
 * 3. Copy and paste this entire file
 * 4. Update the SPREADSHEET_ID below with your actual Google Sheet ID
 * 5. Deploy as web app (new deployment, Execute as: your email, Anyone)
 * 
 * SPREADSHEET STRUCTURE REQUIRED:
 * - Sheet named "Show1" (for /show1 bookings)
 * - Sheet named "Show2" (for /show2 bookings)
 * - Sheet named "Show3" (for /show3 bookings)
 * - Sheet named "Show4" (for /show4 bookings)
 * - Sheet named "Show5" (for /show5 bookings)
 * - Sheet named "Pending" (for admin review)
 * 
 * Each sheet needs these columns:
 * A: Booking ID
 * B: Date/Time
 * C: Show Number
 * D: Primary Guest Name
 * E: Phone
 * F: Payment Method
 * G: Branch
 * H: Seats (comma-separated)
 * I: Total Price
 * J: Status
 */

// ========== CONFIGURATION ==========
const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // Replace with your actual Google Sheet ID
const SHOW_NAMES = {
  1: 'Show1',
  2: 'Show2',
  3: 'Show3',
  4: 'Show4',
  5: 'Show5'
};

// ========== MAIN ENTRY POINT ==========
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const showNumber = payload.showNumber;

    console.log('[GAS] Request received:', { action, showNumber });

    if (!showNumber || showNumber < 1 || showNumber > 5) {
      return sendResponse(false, 'Invalid show number');
    }

    switch (action) {
      case 'submit':
        return handleSubmit(payload);
      case 'confirm':
        return handleConfirm(payload);
      case 'cancel':
        return handleCancel(payload);
      case 'getPending':
        return handleGetPending(payload);
      case 'getShowSummary':
        return handleGetShowSummary(payload);
      case 'search':
        return handleSearch(payload);
      case 'searchGuest':
        return handleSearchGuest(payload);
      default:
        return sendResponse(false, 'Unknown action: ' + action);
    }
  } catch (error) {
    console.error('[GAS] Error in doPost:', error);
    return sendResponse(false, 'Server error: ' + error.message);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const showNumber = parseInt(e.parameter.show);

    if (!showNumber || showNumber < 1 || showNumber > 5) {
      return sendResponse(false, 'Invalid show number');
    }

    if (action === 'getSeats') {
      return handleGetSeats(showNumber);
    } else if (action === 'getPending') {
      return handleGetPending({ showNumber });
    }

    return sendResponse(false, 'Unknown action: ' + action);
  } catch (error) {
    console.error('[GAS] Error in doGet:', error);
    return sendResponse(false, 'Server error: ' + error.message);
  }
}

// ========== ACTION HANDLERS ==========

function handleSubmit(payload) {
  const { showNumber, primaryGuest, phone, paymentMethod, branch, seatGuestPairs } = payload;
  
  console.log('[GAS] Handling submit for Show:', showNumber);

  // Get the correct sheet for this show
  const sheetName = SHOW_NAMES[showNumber];
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

  if (!sheet) {
    return sendResponse(false, 'Sheet not found for show ' + showNumber);
  }

  // Generate booking ID
  const bookingId = generateBookingId();
  const timestamp = new Date();
  const seats = seatGuestPairs.map(pair => pair.seat).join(', ');
  const totalPrice = seatGuestPairs.length * 500;
  const status = 'Pending';

  // Add to show sheet
  sheet.appendRow([
    bookingId,
    timestamp,
    showNumber,
    primaryGuest,
    phone,
    paymentMethod,
    branch,
    seats,
    totalPrice,
    status
  ]);

  // Also add to Pending sheet for admin review
  const pendingSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Pending');
  if (pendingSheet) {
    pendingSheet.appendRow([
      bookingId,
      timestamp,
      showNumber,
      primaryGuest,
      phone,
      paymentMethod,
      branch,
      seats,
      totalPrice,
      status
    ]);
  }

  const whatsappLink = `https://wa.me/${phone}?text=Your booking code is ${bookingId}`;

  return sendResponse(true, 'Booking submitted', {
    code: bookingId,
    totalPrice,
    totalSeats: seatGuestPairs.length,
    whatsappLink
  });
}

function handleConfirm(payload) {
  const { bookingId, showNumber } = payload;

  console.log('[GAS] Confirming booking:', bookingId, 'for Show:', showNumber);

  const sheetName = SHOW_NAMES[showNumber];
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

  if (!sheet) {
    return sendResponse(false, 'Sheet not found for show ' + showNumber);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      sheet.getRange(i + 1, 10).setValue('Confirmed'); // Column J = Status
      removePendingBooking(bookingId);
      return sendResponse(true, 'Booking confirmed');
    }
  }

  return sendResponse(false, 'Booking not found');
}

function handleCancel(payload) {
  const { bookingId, showNumber } = payload;

  console.log('[GAS] Cancelling booking:', bookingId, 'for Show:', showNumber);

  const sheetName = SHOW_NAMES[showNumber];
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

  if (!sheet) {
    return sendResponse(false, 'Sheet not found for show ' + showNumber);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      sheet.getRange(i + 1, 10).setValue('Cancelled'); // Column J = Status
      removePendingBooking(bookingId);
      return sendResponse(true, 'Booking cancelled');
    }
  }

  return sendResponse(false, 'Booking not found');
}

function handleGetPending(payload) {
  const { showNumber } = payload;

  console.log('[GAS] Getting pending bookings for Show:', showNumber);

  const pendingSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Pending');
  if (!pendingSheet) {
    return sendResponse(true, 'No pending sheet', { bookings: [] });
  }

  const data = pendingSheet.getDataRange().getValues();
  const bookings = [];

  // Skip header row (row 0)
  for (let i = 1; i < data.length; i++) {
    // Filter by show number (column C, index 2)
    if (data[i][2] === showNumber) {
      bookings.push({
        bookingId: data[i][0],
        timestamp: data[i][1],
        showNumber: data[i][2],
        primaryGuest: data[i][3],
        phone: data[i][4],
        paymentMethod: data[i][5],
        branch: data[i][6],
        seats: data[i][7],
        totalPrice: data[i][8],
        status: data[i][9]
      });
    }
  }

  return sendResponse(true, 'Pending bookings retrieved', { bookings });
}

function handleGetShowSummary(payload) {
  const { showNumber } = payload;

  console.log('[GAS] Getting summary for Show:', showNumber);

  const sheetName = SHOW_NAMES[showNumber];
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

  if (!sheet) {
    return sendResponse(false, 'Sheet not found for show ' + showNumber);
  }

  const data = sheet.getDataRange().getValues();
  let totalBookings = 0;
  let totalRevenue = 0;
  let confirmedCount = 0;
  let pendingCount = 0;

  for (let i = 1; i < data.length; i++) {
    const status = data[i][9]; // Column J
    const price = data[i][8]; // Column I

    totalBookings++;
    totalRevenue += price || 0;

    if (status === 'Confirmed') confirmedCount++;
    if (status === 'Pending') pendingCount++;
  }

  return sendResponse(true, 'Summary retrieved', {
    totalBookings,
    totalRevenue,
    confirmedCount,
    pendingCount
  });
}

function handleGetSeats(showNumber) {
  console.log('[GAS] Getting seats for Show:', showNumber);

  const sheetName = SHOW_NAMES[showNumber];
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

  if (!sheet) {
    return sendResponse(false, 'Sheet not found for show ' + showNumber);
  }

  const data = sheet.getDataRange().getValues();
  const heldSeats = [];
  const bookedSeats = [];

  for (let i = 1; i < data.length; i++) {
    const status = data[i][9]; // Column J = Status
    const seats = data[i][7]; // Column H = Seats

    if (seats) {
      const seatList = seats.split(',').map(s => s.trim());
      if (status === 'Pending' || status === 'Confirmed') {
        bookedSeats.push(...seatList);
      }
    }
  }

  return sendResponse(true, 'Seats retrieved', {
    heldSeats,
    bookedSeats
  });
}

function handleSearch(payload) {
  const { showNumber, query } = payload;

  console.log('[GAS] Searching for:', query, 'in Show:', showNumber);

  const sheetName = SHOW_NAMES[showNumber];
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

  if (!sheet) {
    return sendResponse(false, 'Sheet not found for show ' + showNumber);
  }

  const data = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    // Search in booking ID (column A) or phone (column E)
    if (data[i][0].toString().includes(query) || data[i][4].toString().includes(query)) {
      results.push({
        bookingId: data[i][0],
        timestamp: data[i][1],
        showNumber: data[i][2],
        primaryGuest: data[i][3],
        phone: data[i][4],
        paymentMethod: data[i][5],
        branch: data[i][6],
        seats: data[i][7],
        totalPrice: data[i][8],
        status: data[i][9]
      });
    }
  }

  return sendResponse(true, 'Search completed', { results });
}

function handleSearchGuest(payload) {
  const { showNumber, guestName } = payload;

  console.log('[GAS] Searching for guest:', guestName, 'in Show:', showNumber);

  const sheetName = SHOW_NAMES[showNumber];
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);

  if (!sheet) {
    return sendResponse(false, 'Sheet not found for show ' + showNumber);
  }

  const data = sheet.getDataRange().getValues();
  const results = [];

  for (let i = 1; i < data.length; i++) {
    // Search in primary guest name (column D)
    if (data[i][3].toString().toLowerCase().includes(guestName.toLowerCase())) {
      results.push({
        bookingId: data[i][0],
        timestamp: data[i][1],
        showNumber: data[i][2],
        primaryGuest: data[i][3],
        phone: data[i][4],
        paymentMethod: data[i][5],
        branch: data[i][6],
        seats: data[i][7],
        totalPrice: data[i][8],
        status: data[i][9]
      });
    }
  }

  return sendResponse(true, 'Guest search completed', { results });
}

// ========== HELPER FUNCTIONS ==========

function removePendingBooking(bookingId) {
  const pendingSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Pending');
  if (!pendingSheet) return;

  const data = pendingSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingId) {
      pendingSheet.deleteRow(i + 1);
      return;
    }
  }
}

function generateBookingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sendResponse(success, message, data = {}) {
  const response = {
    success,
    message,
    ...data
  };

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ========== TESTING HELPERS ==========

function testSubmit() {
  const testPayload = {
    action: 'submit',
    showNumber: 1,
    primaryGuest: 'Test User',
    phone: '+201234567890',
    paymentMethod: 'InstaPay',
    branch: 'Maadi',
    seatGuestPairs: [
      { seat: 'A1', guest: 'Guest 1' },
      { seat: 'A2', guest: 'Guest 2' }
    ]
  };

  const e = {
    postData: {
      contents: JSON.stringify(testPayload)
    }
  };

  console.log('[TEST] Submit response:', doPost(e));
}

function testGetPending() {
  const e = {
    postData: {
      contents: JSON.stringify({
        action: 'getPending',
        showNumber: 1
      })
    }
  };

  console.log('[TEST] Pending bookings:', doPost(e));
}

function testGetSeats() {
  const url = doGet({
    parameter: {
      action: 'getSeats',
      show: '1'
    }
  });

  console.log('[TEST] Seats response:', url);
}
