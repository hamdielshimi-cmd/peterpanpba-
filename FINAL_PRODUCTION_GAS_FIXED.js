// ============================================================================
// PETER PAN BALLET BOOKING SYSTEM - GOOGLE APPS SCRIPT (PRODUCTION)
// ============================================================================
// Features:
// - Show-specific sheet routing (Show1-Show5)
// - 15-minute seat hold timer
// - 6-seat limit per booking
// - Status column (I) with dropdown: Pending (extends 15min) / Confirmed (locks)
// - All columns locked from manual editing except Status (I)
// - Automatic seat expiration after hold time
// ============================================================================

const SPREADSHEET_ID = 'YOUR_GOOGLE_SHEET_ID_HERE'; // REPLACE WITH YOUR SHEET ID
const TICKET_PRICE = 500;
const HOLD_DURATION = 15 * 60; // 15 minutes in seconds

// ============================================================================
// INITIAL SETUP - RUN THIS ONCE
// ============================================================================
function setupProductionSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const headers = ['Timestamp', 'Code', 'Primary Guest', 'Phone', 'Show', 'Total Seats', 'Total Price (EGP)', 'Payment Method', 'Status', 'Branch', 'Seat 1', 'Seat 2', 'Seat 3', 'Seat 4', 'Seat 5', 'Seat 1 Guest', 'Seat 2 Guest', 'Seat 3 Guest', 'Seat 4 Guest', 'Seat 5 Guest'];

  // Create/verify all sheets
  const sheetNames = ['Show1', 'Show2', 'Show3', 'Show4', 'Show5', 'Pending'];
  
  for (const name of sheetNames) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    
    // Add headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }
    
    // Remove all existing protections
    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    for (const protection of protections) {
      if (protection.canEdit()) {
        protection.remove();
      }
    }
    
    // Protect all columns EXCEPT Status (I)
    // Strategy: Protect columns A-H and J-T (everything except I)
    const lastColumn = sheet.getLastColumn();
    
    // Protect A-H (columns 1-8)
    if (lastColumn >= 8) {
      const range1 = sheet.getRange('A:H');
      const protection1 = range1.protect();
      protection1.setDescription('Protected - data entry restricted');
      protection1.removeEditors(protection1.getEditors());
      protection1.addEditor(Session.getEffectiveUser());
    }
    
    // Protect J onwards (column 10+)
    if (lastColumn >= 10) {
      const range2 = sheet.getRange('J:Z');
      const protection2 = range2.protect();
      protection2.setDescription('Protected - data entry restricted');
      protection2.removeEditors(protection2.getEditors());
      protection2.addEditor(Session.getEffectiveUser());
    }
    
    // Column I (Status) is unprotected - can be edited by anyone
    Logger.log(`✅ ${name}: Protected (only Status/Column I editable)`);
    
    // Add data validation to Status column (I)
    const lastRow = Math.max(1000, sheet.getLastRow()); // Validate up to row 1000
    const statusValidation = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Pending', 'Confirmed', 'Cancelled'], true)
      .setAllowInvalid(false)
      .setHelpText('Select: Pending (extends 15min) or Confirmed (locks) or Cancelled (releases)')
      .build();
    sheet.getRange(`I2:I${lastRow}`).setDataValidation(statusValidation);
  }
  
  Logger.log('✅ Production sheets initialized with protection - Status column only editable');
}

// ============================================================================
// MAIN HANDLER - Receives requests from frontend
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
// GET SHOW NAME - Helper to get display name for show number
// ============================================================================
function getShowName(showNumber) {
  const showNames = {
    1: 'Peter Pan Cast 1 (Friday 1:30 PM)',
    2: 'Peter Pan Cast 2 (Friday 6:00 PM)',
    3: 'Peter Pan Cast 3 (Saturday 12:00 PM)',
    4: 'Contemporary SURVIVAL 1 (Saturday 6:00 PM)',
    5: 'Contemporary SURVIVAL 2 (Saturday 8:00 PM)'
  };
  return showNames[showNumber] || `Show ${showNumber}`;
}

// ============================================================================
// SUBMIT BOOKING - Create new booking with 15-minute hold
// ============================================================================
function handleSubmit(data) {
  const showNumber = parseInt(data.showNumber);
  const sheetName = `Show${showNumber}`;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return error(`Show ${showNumber} sheet not found`);
  
  // Validate
  const seatsCount = (data.seats || []).length;
  if (seatsCount === 0 || seatsCount > 6) return error('Invalid seat count (1-6)');
  
  // Generate booking code
  const code = generateBookingCode();
  const now = new Date();
  const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy HH:mm:ss');
  
  // Calculate hold expiration (15 minutes from now)
  const expiresAt = new Date(now.getTime() + HOLD_DURATION * 1000);
  
  // Build row
  const row = [
    timestamp,
    code,
    data.primaryGuest || '',
    data.phone || '',
    showNumber,
    seatsCount,
    seatsCount * TICKET_PRICE,
    data.paymentMethod || 'InstaPay',
    'Pending',  // Status column starts as Pending
    data.branch || 'Maadi',
    ...(data.seats || []).slice(0, 5),
    ...Array(5 - Math.min(5, seatsCount)).fill(''),
    ...(data.seatGuests || []).slice(0, 5),
    ...Array(5 - Math.min(5, (data.seatGuests || []).length)).fill('')
  ];
  
  sheet.appendRow(row);
  
  // Also add to Pending sheet
  const pendingSheet = ss.getSheetByName('Pending');
  const pendingRow = row.slice(0, 10); // First 10 columns
  pendingSheet.appendRow(pendingRow);
  
  // Create WhatsApp message with booking details pre-filled (Arabic)
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
}

// ============================================================================
// GET BOOKED SEATS - Show which seats are held/booked
// ============================================================================
function handleGetSeats(data) {
  const showNumber = parseInt(data.showNumber || data.show);
  const sheetName = `Show${showNumber}`;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) return error(`Sheet not found`);
  
  const rows = sheet.getDataRange().getValues();
  const confirmed = [];
  const pending = [];
  const blocked = [];
  
  // Skip header, process data rows
  for (let i = 1; i < rows.length; i++) {
    const status = rows[i][8]; // Column I (Status)
    const seatsData = rows[i].slice(10, 15); // Columns K-O (Seat 1-5)
    
    if (status === 'Confirmed') {
      confirmed.push(...seatsData.filter(s => s));
    } else if (status === 'Pending') {
      const timestamp = rows[i][0];
      if (isWithinHoldWindow(timestamp)) {
        pending.push(...seatsData.filter(s => s));
      }
    } else if (status === 'Cancelled') {
      // Don't add cancelled seats to any list
    }
  }
  
  return success({ 
    confirmed: [...new Set(confirmed)], 
    pending: [...new Set(pending)],
    blocked: [...new Set(blocked)]
  });
}

// ============================================================================
// GET PENDING BOOKINGS - For admin panel
// ============================================================================
function handleGetPending() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const pendingSheet = ss.getSheetByName('Pending');
  
  if (!pendingSheet) return error('Pending sheet not found');
  
  const rows = pendingSheet.getDataRange().getValues();
  const bookings = [];
  
  // Skip header
  for (let i = 1; i < rows.length; i++) {
    bookings.push({
      code: rows[i][1],
      guest: rows[i][2],
      phone: rows[i][3],
      show: rows[i][4],
      seats: rows[i][5],
      price: rows[i][6],
      payment: rows[i][7],
      status: rows[i][8],
      branch: rows[i][9]
    });
  }
  
  return success({ bookings });
}

// ============================================================================
// CONFIRM BOOKING - Lock seats and update status
// ============================================================================
function handleConfirm(data) {
  const code = data.code;
  const showNumber = data.showNumber;
  const sheetName = `Show${showNumber}`;
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const pendingSheet = ss.getSheetByName('Pending');
  
  // Find and update in show sheet
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === code) {
      sheet.getRange(i + 1, 9).setValue('Confirmed'); // Status column
      break;
    }
  }
  
  // Remove from Pending sheet
  const pendingRows = pendingSheet.getDataRange().getValues();
  for (let i = pendingRows.length - 1; i >= 1; i--) {
    if (pendingRows[i][1] === code) {
      pendingSheet.deleteRow(i + 1);
      break;
    }
  }
  
  return success({ message: 'Booking confirmed and seats locked' });
}

// ============================================================================
// CANCEL BOOKING - Release seats
// ============================================================================
function handleCancel(data) {
  const code = data.code;
  const showNumber = data.showNumber;
  const sheetName = `Show${showNumber}`;
  
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const pendingSheet = ss.getSheetByName('Pending');
  
  // Mark as Cancelled in show sheet
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === code) {
      sheet.getRange(i + 1, 9).setValue('Cancelled');
      break;
    }
  }
  
  // Remove from Pending sheet
  const pendingRows = pendingSheet.getDataRange().getValues();
  for (let i = pendingRows.length - 1; i >= 1; i--) {
    if (pendingRows[i][1] === code) {
      pendingSheet.deleteRow(i + 1);
      break;
    }
  }
  
  return success({ message: 'Booking cancelled and seats released' });
}

// ============================================================================
// SEARCH BOOKING - Find by code or phone
// ============================================================================
function handleSearch(data) {
  const query = data.query.toLowerCase();
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const shows = ['Show1', 'Show2', 'Show3', 'Show4', 'Show5'];
  const results = [];
  
  for (const showName of shows) {
    const sheet = ss.getSheetByName(showName);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      const code = rows[i][1];
      const phone = rows[i][3];
      if (code.toLowerCase().includes(query) || phone.includes(query)) {
        results.push({
          code, guest: rows[i][2], phone, show: rows[i][4],
          seats: rows[i][5], status: rows[i][8]
        });
      }
    }
  }
  
  return success({ results });
}

// ============================================================================
// GET SUMMARY - Stats for each show
// ============================================================================
function handleGetSummary(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const summary = {};
  
  for (let i = 1; i <= 5; i++) {
    const sheet = ss.getSheetByName(`Show${i}`);
    const rows = sheet.getDataRange().getValues();
    
    let confirmed = 0, pending = 0, cancelled = 0;
    for (let j = 1; j < rows.length; j++) {
      const status = rows[j][8];
      if (status === 'Confirmed') confirmed++;
      else if (status === 'Pending') pending++;
      else if (status === 'Cancelled') cancelled++;
    }
    
    summary[`Show${i}`] = { confirmed, pending, cancelled };
  }
  
  return success({ summary });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateBookingCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'MAD-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isWithinHoldWindow(timestamp) {
  try {
    const bookingTime = new Date(timestamp);
    const now = new Date();
    const diffSeconds = (now - bookingTime) / 1000;
    return diffSeconds < HOLD_DURATION;
  } catch {
    return false;
  }
}

function success(data) {
  return ContentService.createTextOutput(JSON.stringify({ success: true, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function error(message) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}
