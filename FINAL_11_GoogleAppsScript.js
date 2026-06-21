/**
 * PETER PAN BOOKING SYSTEM - FINAL 11 - Google Apps Script
 * 
 * PRODUCTION READY - Copy and paste this entire file into script.google.com
 * 
 * SHEET STRUCTURE:
 * - Sheets: Show1, Show2, Show3, Show4, Show5, Pending
 * - Columns: Timestamp | Code | Primary Guest | Phone | Show | Total Seats | Price | Payment | Status | Branch | Seat1-5 | Guest1-5
 * 
 * SETUP (1 minute):
 * 1. Open script.google.com
 * 2. Replace ALL code with this file
 * 3. Find line: const SPREADSHEET_ID = '...'
 * 4. Replace with YOUR Google Sheet ID
 * 5. Click Run -> setupSheets() from dropdown
 * 6. Deploy -> New Deployment -> Web app
 * 7. Done! No more changes needed.
 */

// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION - UPDATE THIS ONLY
// ═══════════════════════════════════════════════════════════════
const SPREADSHEET_ID = '1vSmOyJ_I6802WD-v6yeGbI6R3Oe6myPTImuFlIgFIAw'; // CHANGE THIS TO YOUR SHEET ID

const SHEET_NAMES = {
  1: 'Show1',
  2: 'Show2',
  3: 'Show3',
  4: 'Show4',
  5: 'Show5',
  pending: 'Pending'
};

const COLUMNS = {
  timestamp: 0,    // A
  code: 1,         // B
  guest: 2,        // C
  phone: 3,        // D
  show: 4,         // E
  totalSeats: 5,   // F
  totalPrice: 6,   // G
  payment: 7,      // H
  status: 8,       // I
  branch: 9,       // J
  seat1: 10        // K onwards (5 seat columns)
};

// ═══════════════════════════════════════════════════════════════
//  SETUP - RUN THIS ONCE
// ═══════════════════════════════════════════════════════════════
function setupSheets() {
  console.log('[SETUP] Starting initialization...');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Setup Show sheets
  for (let i = 1; i <= 5; i++) {
    ensureSheet(ss, SHEET_NAMES[i]);
  }
  
  // Setup Pending sheet
  ensureSheet(ss, SHEET_NAMES.pending);
  
  console.log('[SETUP] ✅ All sheets created and headers set!');
}

function ensureSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    console.log(`[SETUP] Created sheet: ${sheetName}`);
  }
  
  // Check if headers exist
  const firstRow = sheet.getRange(1, 1, 1, 20).getValues()[0];
  if (!firstRow[0] || firstRow[0] !== 'Timestamp') {
    const headers = [
      'Timestamp', 'Code', 'Primary Guest', 'Phone', 'Show',
      'Total Seats', 'Total Price (EGP)', 'Payment Method', 'Status', 'Branch',
      'Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5',
      'Seat 1 Guest', 'Seat 2 Guest', 'Seat 3 Guest', 'Seat 4 Guest', 'Seat 5 Guest'
    ];
    
    if (sheet.getMaxRows() === 1 && sheet.getMaxColumns() === 1) {
      // New sheet, just set headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      // Sheet has data, insert row at top
      sheet.insertRows(1, 1);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    console.log(`[SETUP] Headers set for ${sheetName}`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN HANDLERS - doPost and doGet
// ═══════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    
    console.log(`[${new Date().toLocaleTimeString()}] ${action} - Show ${payload.showNumber || 'N/A'}`);
    
    switch (action) {
      case 'submit':
        return submitBooking(payload);
      case 'confirm':
        return confirmBooking(payload);
      case 'cancel':
        return cancelBooking(payload);
      case 'getPendingBookings':
        return getPendingBookings(payload);
      case 'getShowSummary':
        return getShowSummary(payload);
      case 'search':
        return searchByCode(payload);
      case 'searchGuest':
        return searchByGuest(payload);
      default:
        return response(false, 'Unknown action: ' + action);
    }
  } catch (err) {
    console.error('[ERROR]', err.message);
    return response(false, 'Server error');
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const showNum = parseInt(e.parameter.show) || null;
    
    if (action === 'getSeats') {
      return getBookedSeats(showNum);
    }
    
    return response(false, 'Unknown action');
  } catch (err) {
    console.error('[ERROR]', err.message);
    return response(false, 'Server error');
  }
}

// ═══════════════════════════════════════════════════════════════
//  BOOKING SUBMISSION
// ═══════════════════════════════════════════════════════════════
function submitBooking(payload) {
  const { showNumber, primaryGuest, phone, paymentMethod, branch, seatGuestPairs } = payload;
  
  if (!showNumber || showNumber < 1 || showNumber > 5) {
    return response(false, 'Invalid show number');
  }
  
  const sheetName = SHEET_NAMES[showNumber];
  const sheet = getSheet(sheetName);
  if (!sheet) return response(false, 'Sheet error');
  
  const code = generateCode();
  const timestamp = new Date();
  const totalSeats = seatGuestPairs ? seatGuestPairs.length : 0;
  const totalPrice = totalSeats * 500; // EGP per seat
  
  // Build row
  const row = [
    timestamp,
    code,
    primaryGuest,
    phone,
    showNumber,
    totalSeats,
    totalPrice,
    paymentMethod,
    'Pending',
    branch
  ];
  
  // Add seat names
  for (let i = 0; i < 5; i++) {
    row.push(seatGuestPairs && seatGuestPairs[i] ? seatGuestPairs[i].seat : '');
  }
  
  // Add guest names
  for (let i = 0; i < 5; i++) {
    row.push(seatGuestPairs && seatGuestPairs[i] ? seatGuestPairs[i].guest : '');
  }
  
  // Write to Show sheet
  sheet.appendRow(row);
  console.log(`[SUBMIT] ${code} -> ${sheetName}`);
  
  // Also add to Pending sheet
  const pendingSheet = getSheet(SHEET_NAMES.pending);
  if (pendingSheet) pendingSheet.appendRow(row);
  
  return response(true, 'Booking submitted', {
    code,
    totalPrice,
    totalSeats
  });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN ACTIONS - Confirm & Cancel
// ═══════════════════════════════════════════════════════════════
function confirmBooking(payload) {
  const { code, showNumber } = payload;
  
  const sheet = getSheet(SHEET_NAMES[showNumber]);
  if (!sheet) return response(false, 'Sheet not found');
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.code] === code) {
      sheet.getRange(i + 1, COLUMNS.status + 1).setValue('Confirmed');
      removePending(code);
      console.log(`[CONFIRM] ${code}`);
      return response(true, 'Booking confirmed');
    }
  }
  
  return response(false, 'Booking not found');
}

function cancelBooking(payload) {
  const { code, showNumber } = payload;
  
  const sheet = getSheet(SHEET_NAMES[showNumber]);
  if (!sheet) return response(false, 'Sheet not found');
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.code] === code) {
      sheet.getRange(i + 1, COLUMNS.status + 1).setValue('Cancelled');
      removePending(code);
      console.log(`[CANCEL] ${code}`);
      return response(true, 'Booking cancelled');
    }
  }
  
  return response(false, 'Booking not found');
}

function removePending(code) {
  const sheet = getSheet(SHEET_NAMES.pending);
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][COLUMNS.code] === code) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN READS - Pending & Summary
// ═══════════════════════════════════════════════════════════════
function getPendingBookings(payload) {
  const { showNumber } = payload;
  
  const sheet = getSheet(SHEET_NAMES.pending);
  if (!sheet) return response(true, '', { results: [] });
  
  const data = sheet.getDataRange().getValues();
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (showNumber && row[COLUMNS.show] !== showNumber) continue;
    
    const seats = [];
    for (let j = 0; j < 5; j++) {
      if (row[COLUMNS.seat1 + j]) seats.push(row[COLUMNS.seat1 + j]);
    }
    
    const created = new Date(row[COLUMNS.timestamp]);
    const minutesLeft = Math.max(0, Math.floor((30 * 60 * 1000 - (Date.now() - created)) / 60000));
    
    results.push({
      code: row[COLUMNS.code],
      primaryGuest: row[COLUMNS.guest],
      phone: row[COLUMNS.phone],
      showNumber: row[COLUMNS.show],
      showName: `Show ${row[COLUMNS.show]}`,
      totalSeats: row[COLUMNS.totalSeats],
      totalPrice: row[COLUMNS.totalPrice],
      seats,
      status: row[COLUMNS.status],
      branch: row[COLUMNS.branch],
      branchDisplay: row[COLUMNS.branch] || 'N/A',
      minutesLeft
    });
  }
  
  console.log(`[PENDING] ${results.length} bookings`);
  return response(true, '', { results });
}

function getShowSummary(payload) {
  const { showNumber } = payload;
  const summary = [];
  
  const shows = showNumber ? [showNumber] : [1, 2, 3, 4, 5];
  
  for (const show of shows) {
    const sheet = getSheet(SHEET_NAMES[show]);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    let confirmed = 0, pending = 0, totalSeats = 0, totalRevenue = 0;
    
    for (let i = 1; i < data.length; i++) {
      const status = data[i][COLUMNS.status];
      const seats = data[i][COLUMNS.totalSeats] || 0;
      const price = data[i][COLUMNS.totalPrice] || 0;
      
      if (status === 'Confirmed') confirmed++;
      if (status === 'Pending') pending++;
      totalSeats += seats;
      totalRevenue += price;
    }
    
    summary.push({
      show,
      confirmed,
      pending,
      totalSeats,
      totalRevenue
    });
  }
  
  console.log(`[SUMMARY] ${summary.length} shows`);
  return response(true, '', { summary });
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════
function searchByCode(payload) {
  const { code, showNumber } = payload;
  
  const sheet = getSheet(SHEET_NAMES[showNumber]);
  if (!sheet) return response(false, 'Sheet not found');
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.code] === code) {
      const booking = parseRow(data[i]);
      console.log(`[SEARCH] Found ${code}`);
      return response(true, '', { found: true, booking });
    }
  }
  
  return response(true, '', { found: false });
}

function searchByGuest(payload) {
  const { name, last4, showNumber } = payload;
  const results = [];
  
  const shows = showNumber ? [showNumber] : [1, 2, 3, 4, 5];
  
  for (const show of shows) {
    const sheet = getSheet(SHEET_NAMES[show]);
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const guestName = data[i][COLUMNS.guest] || '';
      const phone = data[i][COLUMNS.phone] || '';
      
      const nameMatch = !name || guestName.toLowerCase().includes(name.toLowerCase());
      const phoneMatch = !last4 || phone.toString().slice(-4) === last4;
      
      if (nameMatch && phoneMatch) {
        results.push(parseRow(data[i]));
      }
    }
  }
  
  console.log(`[SEARCH_GUEST] Found ${results.length}`);
  return response(true, '', { results });
}

// ═══════════════════════════════════════════════════════════════
//  SEATS - Get booked seats for each show
// ═══════════════════════════════════════════════════════════════
function getBookedSeats(showNumber) {
  if (!showNumber || showNumber < 1 || showNumber > 5) {
    return response(false, 'Invalid show');
  }
  
  const sheet = getSheet(SHEET_NAMES[showNumber]);
  if (!sheet) return response(false, 'Sheet not found');
  
  const data = sheet.getDataRange().getValues();
  const bookedSeats = [];
  
  for (let i = 1; i < data.length; i++) {
    const status = data[i][COLUMNS.status];
    if (status === 'Confirmed' || status === 'Pending') {
      for (let j = 0; j < 5; j++) {
        const seat = data[i][COLUMNS.seat1 + j];
        if (seat) bookedSeats.push(seat);
      }
    }
  }
  
  console.log(`[SEATS] Show ${showNumber}: ${bookedSeats.length} booked`);
  return response(true, '', { bookedSeats, heldSeats: [] });
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function getSheet(sheetName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.warn(`[WARN] Sheet not found: ${sheetName}`);
      return null;
    }
    return sheet;
  } catch (err) {
    console.error('[ERROR] getSheet failed:', err.message);
    return null;
  }
}

function parseRow(row) {
  const seats = [];
  for (let i = 0; i < 5; i++) {
    if (row[COLUMNS.seat1 + i]) seats.push(row[COLUMNS.seat1 + i]);
  }
  
  return {
    code: row[COLUMNS.code],
    timestamp: row[COLUMNS.timestamp],
    primaryGuest: row[COLUMNS.guest],
    phone: row[COLUMNS.phone],
    showNumber: row[COLUMNS.show],
    branch: row[COLUMNS.branch],
    seats,
    totalSeats: row[COLUMNS.totalSeats],
    totalPrice: row[COLUMNS.totalPrice],
    paymentMethod: row[COLUMNS.payment],
    status: row[COLUMNS.status]
  };
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'MAD-';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function response(success, message, data = {}) {
  return ContentService.createTextOutput(JSON.stringify({
    success,
    message,
    ...data
  })).setMimeType(ContentService.MimeType.JSON);
}
