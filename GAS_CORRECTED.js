/**
 * PETER PAN BOOKING SYSTEM - Google Apps Script (CORRECTED)
 * 
 * ACTUAL SHEET STRUCTURE (from your screenshot):
 * A: Timestamp
 * B: Code (Booking ID)
 * C: Primary Guest
 * D: Phone
 * E: Show
 * F: Total Seats
 * G: Total Price (EGP)
 * H: Payment Method
 * I: Status
 * J: Branch
 * K+: Individual Seats (Seat 1, Seat 2, etc.)
 * 
 * INSTALLATION:
 * 1. Open script.google.com
 * 2. Replace ALL code with this file
 * 3. Update SPREADSHEET_ID below
 * 4. Run setupSheets() once from the Run menu
 * 5. Deploy as web app
 * 6. Run testAll() to verify everything works
 */

// ═══════════════════════════════════════════════════════════════
//  CONFIGURATION - CHANGE THIS!
// ═══════════════════════════════════════════════════════════════
const SPREADSHEET_ID = '1AwEkRcyvB_OwRFsJfGhdZsA0gLUHXuIFl2-YMZ8h2rk';

const SHEET_NAMES = {
  1: 'Show1',
  2: 'Show2',
  3: 'Show3',
  4: 'Show4',
  5: 'Show5',
  pending: 'Pending'
};

// Column indices (0-based)
const COLUMNS = {
  timestamp: 0,   // A
  code: 1,        // B
  guest: 2,       // C
  phone: 3,       // D
  show: 4,        // E
  totalSeats: 5,  // F
  totalPrice: 6,  // G
  payment: 7,     // H
  status: 8,      // I
  branch: 9,      // J
  seat1: 10       // K (and onwards for seat details)
};

// ═══════════════════════════════════════════════════════════════
//  SETUP FUNCTION - RUN THIS ONCE
// ═══════════════════════════════════════════════════════════════
function setupSheets() {
  console.log('[SETUP] Initializing sheet structure...');
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Create Show sheets
  for (let i = 1; i <= 5; i++) {
    createSheetIfNotExists(ss, SHEET_NAMES[i], i);
  }
  
  // Create Pending sheet
  createSheetIfNotExists(ss, SHEET_NAMES.pending, null);
  
  console.log('[SETUP] ✅ All sheets ready!');
}

function createSheetIfNotExists(ss, sheetName, showNum) {
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    console.log(`[SETUP] Created sheet: ${sheetName}`);
  }
  
  // Ensure headers are set
  const headers = [
    'Timestamp', 'Code', 'Primary Guest', 'Phone', 'Show',
    'Total Seats', 'Total Price (EGP)', 'Payment Method', 'Status', 'Branch',
    'Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5',
    'Seat 1 Guest', 'Seat 2 Guest', 'Seat 3 Guest', 'Seat 4 Guest', 'Seat 5 Guest'
  ];
  
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  if (firstRow[0] !== 'Timestamp') {
    sheet.insertRows(1, 1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    console.log(`[SETUP] Added headers to ${sheetName}`);
  }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN ENTRY POINTS
// ═══════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    return handleRequest(payload);
  } catch (error) {
    console.error('[ERROR] doPost failed:', error);
    return sendJSON(false, 'Server error: ' + error.message);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    const show = parseInt(e.parameter.show) || null;
    
    if (action === 'getSeats') {
      return handleGetSeats(show);
    }
    
    return sendJSON(false, 'Unknown action: ' + action);
  } catch (error) {
    console.error('[ERROR] doGet failed:', error);
    return sendJSON(false, 'Server error: ' + error.message);
  }
}

function handleRequest(payload) {
  const { action, showNumber } = payload;
  console.log(`[REQUEST] ${action} for Show ${showNumber}`);
  
  switch (action) {
    case 'submit':
      return handleSubmit(payload);
    case 'confirm':
      return handleConfirm(payload);
    case 'cancel':
      return handleCancel(payload);
    case 'getPendingBookings':
      return handleGetPendingBookings(payload);
    case 'getShowSummary':
      return handleGetShowSummary(payload);
    case 'search':
      return handleSearch(payload);
    case 'searchGuest':
      return handleSearchGuest(payload);
    default:
      return sendJSON(false, 'Unknown action: ' + action);
  }
}

// ═══════════════════════════════════════════════════════════════
//  BOOKING SUBMISSION
// ═══════════════════════════════════════════════════════════════
function handleSubmit(payload) {
  const { showNumber, primaryGuest, phone, paymentMethod, branch, seatGuestPairs } = payload;
  
  if (!showNumber || showNumber < 1 || showNumber > 5) {
    return sendJSON(false, 'Invalid show number');
  }
  
  const sheetName = SHEET_NAMES[showNumber];
  const sheet = getOrCreateSheet(sheetName, showNumber);
  
  if (!sheet) {
    return sendJSON(false, `Cannot access sheet for Show ${showNumber}`);
  }
  
  // Generate booking code
  const code = generateCode();
  const timestamp = new Date();
  const totalSeats = seatGuestPairs.length;
  const totalPrice = totalSeats * 500; // 500 EGP per seat
  const status = 'Pending';
  
  // Build row with seat data
  const row = [
    timestamp,
    code,
    primaryGuest,
    phone,
    showNumber,
    totalSeats,
    totalPrice,
    paymentMethod,
    status,
    branch
  ];
  
  // Add individual seats and guests
  for (let i = 0; i < 5; i++) {
    if (i < seatGuestPairs.length) {
      row.push(seatGuestPairs[i].seat); // Seat name
    } else {
      row.push('');
    }
  }
  
  for (let i = 0; i < 5; i++) {
    if (i < seatGuestPairs.length) {
      row.push(seatGuestPairs[i].guest); // Guest name
    } else {
      row.push('');
    }
  }
  
  // Write to show sheet
  sheet.appendRow(row);
  console.log(`[SUBMIT] Booking ${code} added to ${sheetName}`);
  
  // Also add to Pending sheet for admin
  const pendingSheet = getOrCreateSheet(SHEET_NAMES.pending, null);
  if (pendingSheet) {
    pendingSheet.appendRow(row);
  }
  
  return sendJSON(true, 'Booking submitted', {
    code,
    totalPrice,
    totalSeats,
    whatsappLink: `https://wa.me/${phone}?text=Your booking code is ${code}`
  });
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN ACTIONS
// ═══════════════════════════════════════════════════════════════
function handleConfirm(payload) {
  const { code, showNumber } = payload;
  
  const sheetName = SHEET_NAMES[showNumber];
  const sheet = getOrCreateSheet(sheetName, showNumber);
  
  if (!sheet) {
    return sendJSON(false, 'Sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.code] === code) {
      sheet.getRange(i + 1, COLUMNS.status + 1).setValue('Confirmed');
      removePendingBooking(code);
      console.log(`[CONFIRM] ${code} confirmed`);
      return sendJSON(true, 'Booking confirmed');
    }
  }
  
  return sendJSON(false, 'Booking not found');
}

function handleCancel(payload) {
  const { code, showNumber } = payload;
  
  const sheetName = SHEET_NAMES[showNumber];
  const sheet = getOrCreateSheet(sheetName, showNumber);
  
  if (!sheet) {
    return sendJSON(false, 'Sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.code] === code) {
      sheet.getRange(i + 1, COLUMNS.status + 1).setValue('Cancelled');
      removePendingBooking(code);
      console.log(`[CANCEL] ${code} cancelled`);
      return sendJSON(true, 'Booking cancelled');
    }
  }
  
  return sendJSON(false, 'Booking not found');
}

function removePendingBooking(code) {
  const sheet = getOrCreateSheet(SHEET_NAMES.pending, null);
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
//  ADMIN READS
// ═══════════════════════════════════════════════════════════════
function handleGetPendingBookings(payload) {
  const { showNumber } = payload;
  
  const sheet = getOrCreateSheet(SHEET_NAMES.pending, null);
  if (!sheet) {
    return sendJSON(true, 'Pending bookings', { results: [] });
  }
  
  const data = sheet.getDataRange().getValues();
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Filter by show if specified
    if (showNumber && row[COLUMNS.show] !== showNumber) continue;
    
    // Parse seats and guests
    const seats = [];
    for (let j = 0; j < 5; j++) {
      if (row[COLUMNS.seat1 + j]) {
        seats.push(row[COLUMNS.seat1 + j]);
      }
    }
    
    const createdTime = new Date(row[COLUMNS.timestamp]);
    const minutesLeft = Math.max(0, Math.floor((30 * 60 * 1000 - (Date.now() - createdTime)) / 60000));
    
    results.push({
      code: row[COLUMNS.code],
      primaryGuest: row[COLUMNS.guest],
      phone: row[COLUMNS.phone],
      showNumber: row[COLUMNS.show],
      showName: `Show ${row[COLUMNS.show]}`,
      branch: row[COLUMNS.branch],
      seats: seats,
      totalSeats: row[COLUMNS.totalSeats],
      totalPrice: row[COLUMNS.totalPrice],
      paymentMethod: row[COLUMNS.payment],
      status: row[COLUMNS.status],
      minutesLeft: minutesLeft,
      branchDisplay: row[COLUMNS.branch] || 'N/A'
    });
  }
  
  console.log(`[GET_PENDING] Found ${results.length} pending bookings`);
  return sendJSON(true, 'Pending bookings retrieved', { results });
}

function handleGetShowSummary(payload) {
  const { showNumber } = payload;
  
  if (showNumber) {
    // Single show summary
    const sheetName = SHEET_NAMES[showNumber];
    const sheet = getOrCreateSheet(sheetName, showNumber);
    
    if (!sheet) {
      return sendJSON(true, 'Show summary', { summary: [] });
    }
    
    const summary = getShowStats(sheet, showNumber);
    return sendJSON(true, 'Show summary', { summary: [summary] });
  } else {
    // All shows summary
    const summary = [];
    for (let i = 1; i <= 5; i++) {
      const sheetName = SHEET_NAMES[i];
      const sheet = getOrCreateSheet(sheetName, i);
      if (sheet) {
        summary.push(getShowStats(sheet, i));
      }
    }
    return sendJSON(true, 'All shows summary', { summary });
  }
}

function getShowStats(sheet, showNum) {
  const data = sheet.getDataRange().getValues();
  let confirmed = 0, pending = 0, totalSeats = 0, totalRevenue = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[COLUMNS.status];
    const seats = row[COLUMNS.totalSeats];
    const price = row[COLUMNS.totalPrice];
    
    if (status === 'Confirmed') confirmed++;
    if (status === 'Pending') pending++;
    totalSeats += seats || 0;
    totalRevenue += price || 0;
  }
  
  return {
    show: showNum,
    confirmed,
    pending,
    totalSeats,
    totalRevenue
  };
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════
function handleSearch(payload) {
  const { code, showNumber } = payload;
  
  const sheetName = SHEET_NAMES[showNumber];
  const sheet = getOrCreateSheet(sheetName, showNumber);
  
  if (!sheet) {
    return sendJSON(false, 'Sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][COLUMNS.code] === code) {
      const booking = parseBookingRow(data[i]);
      console.log(`[SEARCH] Found booking: ${code}`);
      return sendJSON(true, 'Booking found', { found: true, booking });
    }
  }
  
  return sendJSON(true, 'Not found', { found: false });
}

function handleSearchGuest(payload) {
  const { name, last4, showNumber } = payload;
  
  const results = [];
  
  for (let showNum = 1; showNum <= 5; showNum++) {
    if (showNumber && showNum !== showNumber) continue;
    
    const sheetName = SHEET_NAMES[showNum];
    const sheet = getOrCreateSheet(sheetName, showNum);
    
    if (!sheet) continue;
    
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const guestName = row[COLUMNS.guest] || '';
      const phone = row[COLUMNS.phone] || '';
      
      const nameMatch = name ? guestName.toLowerCase().includes(name.toLowerCase()) : true;
      const phoneMatch = last4 ? phone.toString().slice(-4) === last4 : true;
      
      if (nameMatch && phoneMatch) {
        results.push(parseBookingRow(row));
      }
    }
  }
  
  console.log(`[SEARCH_GUEST] Found ${results.length} bookings`);
  return sendJSON(true, 'Guest search completed', { results });
}

// ═══════════════════════════════════════════════════════════════
//  SEATS
// ═══════════════════════════════════════════════════════════════
function handleGetSeats(showNumber) {
  if (!showNumber || showNumber < 1 || showNumber > 5) {
    return sendJSON(false, 'Invalid show number');
  }
  
  const sheetName = SHEET_NAMES[showNumber];
  const sheet = getOrCreateSheet(sheetName, showNumber);
  
  if (!sheet) {
    return sendJSON(false, 'Sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  const bookedSeats = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[COLUMNS.status];
    
    if (status === 'Confirmed' || status === 'Pending') {
      for (let j = 0; j < 5; j++) {
        const seat = row[COLUMNS.seat1 + j];
        if (seat) bookedSeats.push(seat);
      }
    }
  }
  
  console.log(`[GET_SEATS] Show ${showNumber}: ${bookedSeats.length} seats booked`);
  return sendJSON(true, 'Seats retrieved', { heldSeats: [], bookedSeats });
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function parseBookingRow(row) {
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
    seats: seats,
    totalSeats: row[COLUMNS.totalSeats],
    totalPrice: row[COLUMNS.totalPrice],
    paymentMethod: row[COLUMNS.payment],
    status: row[COLUMNS.status]
  };
}

function getOrCreateSheet(sheetName, showNum) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    createSheetIfNotExists(ss, sheetName, showNum);
    sheet = ss.getSheetByName(sheetName);
  }
  
  return sheet;
}

function generateCode() {
  const prefix = 'MAD'; // Your city prefix
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + '-' + code;
}

function sendJSON(success, message, data = {}) {
  const response = { success, message, ...data };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════════════════════════
//  TESTING FUNCTIONS - RUN THESE TO VERIFY
// ═══════════════════════════════════════════════════════════════
function testAll() {
  console.log('\n========== STARTING TEST SUITE ==========\n');
  
  testSetup();
  testSubmitBooking();
  testGetPending();
  testGetSeats();
  testSearch();
  testSummary();
  
  console.log('\n========== ALL TESTS COMPLETE ==========\n');
}

function testSetup() {
  console.log('[TEST] Checking sheet structure...');
  setupSheets();
  console.log('[TEST] ✅ Sheets initialized');
}

function testSubmitBooking() {
  console.log('[TEST] Submitting test booking...');
  
  const payload = {
    action: 'submit',
    showNumber: 1,
    primaryGuest: 'Test User',
    phone: '201234567890',
    paymentMethod: 'InstaPay',
    branch: 'Maadi',
    seatGuestPairs: [
      { seat: 'A1', guest: 'Guest 1' },
      { seat: 'A2', guest: 'Guest 2' }
    ]
  };
  
  const e = { postData: { contents: JSON.stringify(payload) } };
  const result = JSON.parse(doPost(e).getContentText());
  
  if (result.success) {
    console.log(`[TEST] ✅ Booking submitted: ${result.code}`);
    return result.code;
  } else {
    console.log(`[TEST] ❌ Booking failed: ${result.message}`);
    return null;
  }
}

function testGetPending() {
  console.log('[TEST] Getting pending bookings...');
  
  const payload = { action: 'getPendingBookings', showNumber: 1 };
  const e = { postData: { contents: JSON.stringify(payload) } };
  const result = JSON.parse(doPost(e).getContentText());
  
  if (result.success) {
    console.log(`[TEST] ✅ Found ${result.results.length} pending bookings`);
    result.results.forEach(b => {
      console.log(`  - ${b.code}: ${b.primaryGuest} (${b.totalSeats} seats, EGP ${b.totalPrice})`);
    });
  } else {
    console.log(`[TEST] ❌ Get pending failed: ${result.message}`);
  }
}

function testGetSeats() {
  console.log('[TEST] Getting booked seats...');
  
  const e = { parameter: { action: 'getSeats', show: '1' } };
  const result = JSON.parse(doGet(e).getContentText());
  
  if (result.success) {
    console.log(`[TEST] ✅ Found ${result.bookedSeats.length} booked seats`);
    console.log(`  Seats: ${result.bookedSeats.join(', ')}`);
  } else {
    console.log(`[TEST] ❌ Get seats failed: ${result.message}`);
  }
}

function testSearch() {
  console.log('[TEST] Searching by guest name...');
  
  const payload = { action: 'searchGuest', name: 'Test', showNumber: null };
  const e = { postData: { contents: JSON.stringify(payload) } };
  const result = JSON.parse(doPost(e).getContentText());
  
  if (result.success) {
    console.log(`[TEST] ✅ Found ${result.results.length} bookings matching "Test"`);
  } else {
    console.log(`[TEST] ❌ Search failed: ${result.message}`);
  }
}

function testSummary() {
  console.log('[TEST] Getting show summaries...');
  
  const payload = { action: 'getShowSummary', showNumber: null };
  const e = { postData: { contents: JSON.stringify(payload) } };
  const result = JSON.parse(doPost(e).getContentText());
  
  if (result.success) {
    console.log(`[TEST] ✅ Got summaries for ${result.summary.length} shows`);
    result.summary.forEach(s => {
      console.log(`  Show ${s.show}: ${s.confirmed} confirmed, ${s.pending} pending, ${s.totalSeats} seats sold, EGP ${s.totalRevenue}`);
    });
  } else {
    console.log(`[TEST] ❌ Summary failed: ${result.message}`);
  }
}
