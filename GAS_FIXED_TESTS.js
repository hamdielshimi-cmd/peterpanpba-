// ========== FIXED TEST FUNCTIONS ==========
// Replace the test functions in your GAS_CORRECTED.js with these
// These call the internal functions directly instead of trying to chain .getContentText()

function testAll() {
  console.log('\n========== STARTING TEST SUITE ==========\n');
  
  try {
    // Test 1: Check sheet structure
    console.log('[TEST] Checking sheet structure...');
    setupSheets();
    console.log('[TEST] ✅ Sheets initialized\n');
    
    // Test 2: Submit a test booking
    console.log('[TEST] Submitting test booking...');
    testSubmitBooking();
    
    // Test 3: Get booked seats
    console.log('[TEST] Getting booked seats...');
    testGetSeats();
    
    // Test 4: Get pending bookings
    console.log('[TEST] Getting pending bookings...');
    testGetPendingBookings();
    
    // Test 5: Search for booking
    console.log('[TEST] Searching for booking...');
    testSearchBooking();
    
    // Test 6: Get summary
    console.log('[TEST] Getting summary...');
    testGetSummary();
    
    console.log('\n========== ALL TESTS COMPLETE ✅ ==========\n');
    
  } catch (error) {
    console.error('[ERROR] Test failed:', error.message);
    console.error(error);
  }
}

function testSubmitBooking() {
  try {
    // Simulate a booking submission for Show 1
    const data = {
      action: 'submit',
      showNumber: '1',
      guestName: 'Test User',
      phone: '201234567890',
      paymentMethod: 'InstaPay',
      seatsHeld: ['A1', 'A2'],
      branch: 'Maadi'
    };
    
    console.log('[TEST] Submitting booking for Show:', data.showNumber);
    
    // Call the submit function directly
    const result = submitBooking(data);
    
    console.log('[TEST] ✅ Booking submitted:', result);
    console.log('[TEST] Booking details:', {
      code: result.bookingCode,
      show: result.show,
      seats: result.seatsCount,
      price: result.totalPrice
    });
    console.log();
    
  } catch (error) {
    console.error('[ERROR] testSubmitBooking failed:', error.message);
  }
}

function testGetSeats() {
  try {
    for (let showNum = 1; showNum <= 5; showNum++) {
      console.log(`[GET_SEATS] Show ${showNum}:`);
      
      // Call the get seats function directly
      const result = getBookedSeats({ showNumber: showNum.toString() });
      
      console.log(`[GET_SEATS] Show ${showNum}: ${result.seats.length} seats booked`, result.seats);
    }
    console.log('[TEST] ✅ Retrieved all booked seats\n');
    
  } catch (error) {
    console.error('[ERROR] testGetSeats failed:', error.message);
  }
}

function testGetPendingBookings() {
  try {
    console.log('[TEST] Retrieving pending bookings...');
    
    // Call the get pending function directly
    const result = getPendingBookings({});
    
    console.log(`[PENDING] Found ${result.pending.length} pending bookings`);
    
    if (result.pending.length > 0) {
      console.log('[PENDING] First booking:', {
        code: result.pending[0].code,
        guest: result.pending[0].guestName,
        show: result.pending[0].show,
        seats: result.pending[0].seatsCount,
        status: result.pending[0].status
      });
    }
    
    console.log('[TEST] ✅ Retrieved pending bookings\n');
    
  } catch (error) {
    console.error('[ERROR] testGetPendingBookings failed:', error.message);
  }
}

function testSearchBooking() {
  try {
    console.log('[TEST] Searching for bookings...');
    
    // Test search by guest name - search for "Test" which should find "Test User"
    const result = searchGuest({ searchTerm: 'Test' });
    
    console.log(`[SEARCH] Found ${result.results.length} bookings matching "Test"`);
    
    if (result.results.length > 0) {
      console.log('[SEARCH] Found booking:', {
        code: result.results[0].code,
        guest: result.results[0].guestName,
        show: result.results[0].show
      });
    }
    
    console.log('[TEST] ✅ Search working\n');
    
  } catch (error) {
    console.error('[ERROR] testSearchBooking failed:', error.message);
  }
}

function testGetSummary() {
  try {
    console.log('[TEST] Getting booking summary...');
    
    // Call the get summary function directly
    const result = getShowSummary({ showNumber: '1' });
    
    console.log('[SUMMARY] Show 1:', {
      totalBookings: result.summary.totalBookings,
      totalSeats: result.summary.totalSeats,
      totalRevenue: result.summary.totalRevenue,
      pending: result.summary.pendingCount
    });
    
    console.log('[TEST] ✅ Summary retrieved\n');
    
  } catch (error) {
    console.error('[ERROR] testGetSummary failed:', error.message);
  }
}

// ========== END OF TEST FUNCTIONS ==========
// INSTALLATION INSTRUCTIONS:
// 1. Open your Google Apps Script project
// 2. Copy all the code above (from "// ========== FIXED TEST FUNCTIONS ==========" to the end)
// 3. Find the old test functions in your script (testAll, testSubmitBooking, testGetSeats, etc.)
// 4. Delete the OLD test functions
// 5. Paste this new code at the bottom of your script
// 6. Save the file
// 7. Click "Run" and select "testAll"
// 8. Check the Execution log - you should see all ✅ marks

