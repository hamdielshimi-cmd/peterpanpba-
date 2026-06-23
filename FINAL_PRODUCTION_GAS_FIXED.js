// ============================================================================
// PETER PAN BALLET BOOKING SYSTEM - GOOGLE APPS SCRIPT (FIXED PRODUCTION)
// ============================================================================
// Fixes:
// 1. Added LockService to prevent concurrent booking race conditions.
// 2. Added server-side seat availability validation before submission.
// 3. Prevented internal duplicate seat selection in a single booking.
// 4. Added support for up to 6 seats (matching frontend limit).
// ============================================================================

const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // REPLACE WITH YOUR SHEET ID
const TICKET_PRICE = 500;
const HOLD_DURATION = 15 * 60; // 15 minutes in seconds

// ============================================================================
// INITIAL SETUP - RUN THIS ONCE OR AFTER UPDATING SEAT LIMITS
// ============================================================================
function setupProductionSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  // Updated headers to include Seat 6 and Seat 6 Guest
  const headers = [
    'Timestamp', 'Code', 'Primary Guest', 'Phone', 'Show', 'Total Seats', 'Total Price (EGP)', 
    'Payment Method', 'Status', 'Branch', 
    'Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 6',
    'Seat 1 Guest', 'Seat 2 Guest', 'Seat 3 Guest', 'Seat 4 Guest', 'Seat 5 Guest', 'Seat 6 Guest'
  ];

  const sheetNames = ['Show1', 'Show2', 'Show3', 'Show4', 'Show5', 'Pending'];
  
  for (const name of sheetNames) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    
    // Update headers
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    // Remove all existing protections to reset
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    for (const protection of protections) {
      if (protection.canEdit()) {
        protection.remove();
      }
    }
    
    // Protect all columns EXCEPT Status (I)
    const range1 = sheet.getRange('A:H');
    const protection1 = range1.protect();
    protection1.setDescription('Protected - data entry restricted');
    protection1.removeEditors(protection1.getEditors());
    protection1.addEditor(Session.getEffectiveUser());
    
    const range2 = sheet.getRange('J:V'); // Up to column V (Seat 6 Guest)
    const protection2 = range2.protect();
    protection2.setDescription('Protected - data entry restricted');
    protection2.removeEditors(protection2.getEditors());
    protection2.addEditor(Session.getEffectiveUser());
    
    // Add data validation to Status column (I)
    const lastRow = Math.max(1000, sheet.getLastRow());
    const statusValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pending', 'Confirmed', 'Cancelled'], true)
      .setAllowInvalid(false)
      .setHelpText('Select: Pending, Confirmed, or Cancelled')
      .build();
    sheet.getRange(`I2:I${lastRow}`).setDataValidation(statusValidation);
  }
  
  Logger.log('✅ Production sheets initialized with 6-seat support and protection.');
}

// ============================================================================
// MAIN HANDLER
// ============================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'submit') return handleSubmit(data);
    if (action === 'getSeats') return handleGetSeats(data);
    if (action === 'getPending') return handleGetPending();
    if (action === 'confirm') return handleConfirm(data);
    if (action === 'cancel') return handleCancel(data);
    if (action === 'search') return handleSearch(data);
    if (action === 'getSummary') return handleGetSummary(data);
    
    return error('Unknown action');
  } catch (e) {
    Logger.log('[ERROR] doPost: ' + e.message);
    return error(e.message);
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getSeats') return handleGetSeats(e.parameter);
    if (action === 'getPending') return handleGetPending();
    if (action === 'getSummary') return handleGetSummary(e.parameter);
    return error('Unknown action');
  } catch (e) {
    return error(e.message);
  }
}

// ============================================================================
// SUBMIT BOOKING - WITH LOCK AND VALIDATION
// ============================================================================
function handleSubmit(data) {
  const lock = LockService.getScriptLock();
  try {
    // Try to get the lock for 30 seconds
    lock.waitLock(30000);
    
    const showNumber = parseInt(data.showNumber);
    const sheetName = `Show${showNumber}`;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) return error(`Show ${showNumber} sheet not found`);
    
    const requestedSeats = (data.seats || []).map(s => String(s).trim()).filter(s => s);
    const seatsCount = requestedSeats.length;
    
    if (seatsCount === 0 || seatsCount > 6) return error('Invalid seat count (1-6)');

    // 1. Check for internal duplicates in the request
    const uniqueRequestedSeats = [...new Set(requestedSeats)];
    if (uniqueRequestedSeats.length !== requestedSeats.length) {
      return error('Duplicate seats found in your selection.');
    }

    // 2. Check if any requested seat is already taken (Confirmed or Active Pending)
    const rows = sheet.getDataRange().getValues();
    const takenSeats = new Set();
    
    for (let i = 1; i < rows.length; i++) {
      const status = rows[i][8]; // Column I
      if (status === 'Cancelled') continue;
      
      const timestamp = rows[i][0];
      if (status === 'Pending' && !isWithinHoldWindow(timestamp)) continue;

      // Check Seat 1 to Seat 6 (Columns K to P, indices 10 to 15)
      const currentBookingSeats = rows[i].slice(10, 16);
      currentBookingSeats.forEach(s => {
        if (s) takenSeats.add(String(s).trim());
      });
    }

    const alreadyTaken = requestedSeats.filter(s => takenSeats.has(s));
    if (alreadyTaken.length > 0) {
      return error(`Sorry, the following seats were just taken: ${alreadyTaken.join(', ')}`);
    }

    // 3. All clear, proceed with booking
    const code = generateBookingCode();
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
    const expiresAt = new Date(now.getTime() + HOLD_DURATION * 1000);
    
    const row = [
      timestamp,
      code,
      data.primaryGuest || '',
      data.phone || '',
      showNumber,
      seatsCount,
      seatsCount * TICKET_PRICE,
      data.paymentMethod || 'InstaPay',
      'Pending',
      data.branch || 'Maadi',
      // Seats 1-6 (Columns K-P)
      ...requestedSeats.slice(0, 6),
      ...Array(6 - Math.min(6, seatsCount)).fill(''),
      // Guest names 1-6 (Columns Q-V)
      ...(data.seatGuests || []).slice(0, 6),
      ...Array(6 - Math.min(6, (data.seatGuests || []).length)).fill('')
    ];
    
    sheet.appendRow(row);
    
    // Update Pending sheet
    const pendingSheet = ss.getSheetByName('Pending');
    if (pendingSheet) {
      pendingSheet.appendRow(row.slice(0, 10));
    }
    
    const totalPrice = seatsCount * TICKET_PRICE;
    const whatsappMessage = `كود الحجز: ${code} | الاسم: ${data.primaryGuest} | المقاعد: ${seatsCount} | المبلغ: ${totalPrice} جنيه`;
    const whatsappLink = `https://wa.me/20${data.phone}?text=${encodeURIComponent(whatsappMessage)}`;
    
    return success({
      code,
      totalPrice,
      totalSeats: seatsCount,
      whatsappLink,
      expiresAt: expiresAt.toISOString(),
      message: whatsappMessage
    });

  } catch (e) {
    Logger.log('[ERROR] handleSubmit: ' + e.message);
    return error('Server busy or error: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// GET BOOKED SEATS
// ============================================================================
function handleGetSeats(data) {
  const showNumber = parseInt(data.showNumber || data.show);
  const sheetName = `Show${showNumber}`;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return error(`Sheet not found`);
  
  const rows = sheet.getDataRange().getValues();
  const confirmed = new Set();
  const pending = new Set();
  
  for (let i = 1; i < rows.length; i++) {
    const status = rows[i][8];
    if (status === 'Cancelled') continue;
    
    const seatsData = rows[i].slice(10, 16).filter(s => s);
    if (status === 'Confirmed') {
      seatsData.forEach(s => confirmed.add(s));
    } else if (status === 'Pending') {
      if (isWithinHoldWindow(rows[i][0])) {
        seatsData.forEach(s => pending.add(s));
      }
    }
  }
  
  return success({ 
    confirmed: Array.from(confirmed), 
    pending: Array.from(pending),
    blocked: []
  });
}

// ============================================================================
// OTHER HANDLERS (ADMIN)
// ============================================================================
function handleGetPending() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const pendingSheet = ss.getSheetByName('Pending');
  if (!pendingSheet) return error('Pending sheet not found');
  const rows = pendingSheet.getDataRange().getValues();
  const bookings = rows.slice(1).map(r => ({
    code: r[1], guest: r[2], phone: r[3], show: r[4],
    seats: r[5], price: r[6], payment: r[7], status: r[8], branch: r[9]
  }));
  return success({ bookings });
}

function handleConfirm(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(`Show${data.showNumber}`);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === data.code) {
      sheet.getRange(i + 1, 9).setValue('Confirmed');
      break;
    }
  }
  const pendingSheet = ss.getSheetByName('Pending');
  const pRows = pendingSheet.getDataRange().getValues();
  for (let i = pRows.length - 1; i >= 1; i--) {
    if (pRows[i][1] === data.code) { pendingSheet.deleteRow(i + 1); break; }
  }
  return success({ message: 'Confirmed' });
}

function handleCancel(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(`Show${data.showNumber}`);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === data.code) {
      sheet.getRange(i + 1, 9).setValue('Cancelled');
      break;
    }
  }
  const pendingSheet = ss.getSheetByName('Pending');
  const pRows = pendingSheet.getDataRange().getValues();
  for (let i = pRows.length - 1; i >= 1; i--) {
    if (pRows[i][1] === data.code) { pendingSheet.deleteRow(i + 1); break; }
  }
  return success({ message: 'Cancelled' });
}

function handleSearch(data) {
  const query = data.query.toLowerCase();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = [];
  ['Show1', 'Show2', 'Show3', 'Show4', 'Show5'].forEach(name => {
    const rows = ss.getSheetByName(name).getDataRange().getValues();
    rows.slice(1).forEach(r => {
      if (r[1].toLowerCase().includes(query) || String(r[3]).includes(query)) {
        results.push({ code: r[1], guest: r[2], phone: r[3], show: r[4], seats: r[5], status: r[8] });
      }
    });
  });
  return success({ results });
}

function handleGetSummary(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const summary = {};
  for (let i = 1; i <= 5; i++) {
    const rows = ss.getSheetByName(`Show${i}`).getDataRange().getValues();
    let c = 0, p = 0, x = 0;
    rows.slice(1).forEach(r => {
      if (r[8] === 'Confirmed') c++;
      else if (r[8] === 'Pending') p++;
      else if (r[8] === 'Cancelled') x++;
    });
    summary[`Show${i}`] = { confirmed: c, pending: p, cancelled: x };
  }
  return success({ summary });
}

// ============================================================================
// HELPERS
// ============================================================================
function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'MAD-';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

function isWithinHoldWindow(timestamp) {
  try {
    const diff = (new Date() - new Date(timestamp)) / 1000;
    return diff < HOLD_DURATION;
  } catch { return false; }
}

function success(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(message) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
