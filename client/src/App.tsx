<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <title>🎭 Peter Pan Gala — Admin</title>
  <style>
    /* ═══════════════════════════════════════════════════════════ */
    /*  RESET & BASE                                              */
    /* ═══════════════════════════════════════════════════════════ */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

    :root {
      --gold: #C9A84C;
      --gold-dim: #C9A84C44;
      --bg: #0f0a14;
      --bg-card: #1a0f22;
      --bg-input: #0f0a14;
      --text: #e8dcc8;
      --text-dim: #a89070;
      --green: #2e7d32;
      --green-bg: #c8e6c9;
      --green-text: #1b5e20;
      --red: #c62828;
      --red-bg: #ffcdd2;
      --red-text: #7f0000;
      --yellow-bg: #fff9c4;
      --yellow-text: #7a6000;
      --gray-bg: #f5f5f5;
      --gray-text: #666;
    }

    html { font-size: 16px; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      -webkit-font-smoothing: antialiased;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  HEADER                                                    */
    /* ═══════════════════════════════════════════════════════════ */
    header {
      background: #1A0911;
      border-bottom: 1px solid var(--gold-dim);
      padding: 14px 16px;
      position: sticky;
      top: 0;
      z-index: 50;
    }
    header h1 { 
      color: var(--gold); 
      font-size: 1.05rem; 
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    header .subtitle {
      color: var(--text-dim);
      font-size: 0.75rem;
      margin-top: 2px;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  LAYOUT                                                    */
    /* ═══════════════════════════════════════════════════════════ */
    .container { max-width: 960px; margin: 0 auto; padding: 16px; }

    /* ═══════════════════════════════════════════════════════════ */
    /*  SHOW SELECTOR (Quick Switch) + PENDING BUTTON             */
    /* ═══════════════════════════════════════════════════════════ */
    .show-tabs-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0 12px;
    }

    .show-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      flex: 1;
      min-width: 0;
    }
    .show-tabs::-webkit-scrollbar { display: none; }

    .show-tab {
      flex-shrink: 0;
      padding: 10px 18px;
      border-radius: 10px;
      border: 1px solid var(--gold-dim);
      background: var(--bg-card);
      color: var(--text-dim);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      min-width: 70px;
    }
    .show-tab.active {
      background: var(--gold);
      color: #0f0a14;
      border-color: var(--gold);
    }
    .show-tab .show-date {
      display: block;
      font-size: 0.65rem;
      font-weight: 400;
      margin-top: 2px;
      opacity: 0.8;
    }

    .pending-btn {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 10px 16px;
      border-radius: 10px;
      border: 1px solid var(--gold);
      background: var(--bg-card);
      color: var(--gold);
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      -webkit-appearance: none;
    }
    .pending-btn:active { transform: scale(0.98); }

    .pending-badge {
      background: var(--red);
      color: #fff;
      border-radius: 20px;
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      font-size: 0.72rem;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
    }
    .pending-badge.zero { background: var(--gold-dim); color: var(--text-dim); }

    /* ═══════════════════════════════════════════════════════════ */
    /*  SUMMARY CARDS                                             */
    /* ═══════════════════════════════════════════════════════════ */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }
    @media (min-width: 600px) {
      .summary-grid { grid-template-columns: repeat(4, 1fr); }
    }

    .summary-card {
      background: var(--bg-card);
      border: 1px solid var(--gold-dim);
      border-radius: 12px;
      padding: 14px 12px;
      text-align: center;
    }
    .summary-card .number {
      font-size: 1.6rem;
      font-weight: 700;
      color: var(--gold);
      line-height: 1;
    }
    .summary-card .label {
      font-size: 0.7rem;
      color: var(--text-dim);
      margin-top: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  CARDS                                                     */
    /* ═══════════════════════════════════════════════════════════ */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--gold-dim);
      border-radius: 14px;
      padding: 18px 16px;
      margin-bottom: 14px;
    }
    .card-title {
      color: var(--gold);
      font-size: 0.95rem;
      font-weight: 700;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  FORM FIELDS                                               */
    /* ═══════════════════════════════════════════════════════════ */
    .field { margin-bottom: 12px; }
    .field:last-child { margin-bottom: 0; }

    .field label {
      display: block;
      font-size: 0.78rem;
      color: var(--text-dim);
      margin-bottom: 5px;
      font-weight: 500;
    }

    .field input, .field select {
      width: 100%;
      padding: 13px 14px;
      background: var(--bg-input);
      border: 1px solid var(--gold-dim);
      border-radius: 10px;
      color: var(--text);
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
      -webkit-appearance: none;
    }
    .field input:focus, .field select:focus {
      border-color: var(--gold);
    }
    .field input::placeholder { color: #5a4a3a; }

    /* ═══════════════════════════════════════════════════════════ */
    /*  BUTTONS                                                   */
    /* ═══════════════════════════════════════════════════════════ */
    .btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      -webkit-appearance: none;
    }
    .btn:active { transform: scale(0.98); }

    .btn-gold {
      background: var(--gold);
      color: #0f0a14;
    }
    .btn-green {
      background: var(--green);
      color: #fff;
    }
    .btn-red {
      background: var(--red);
      color: #fff;
    }
    .btn-ghost {
      background: transparent;
      border: 1px solid var(--gold-dim);
      color: var(--gold);
    }
    .btn-sm {
      padding: 8px 14px;
      font-size: 0.8rem;
      width: auto;
    }
    .btn-row {
      display: flex;
      gap: 8px;
    }
    .btn-row .btn { flex: 1; }

    /* ═══════════════════════════════════════════════════════════ */
    /*  SEARCH SECTIONS                                           */
    /* ═══════════════════════════════════════════════════════════ */
    .search-section {
      border-top: 1px solid var(--gold-dim);
      padding-top: 14px;
      margin-top: 14px;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  RESULTS                                                   */
    /* ═══════════════════════════════════════════════════════════ */
    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 0 4px;
    }
    .results-header h2 {
      font-size: 0.9rem;
      color: var(--text-dim);
    }

    /* Result Card (Mobile-first) */
    .result-card {
      background: var(--bg-card);
      border: 1px solid var(--gold-dim);
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 10px;
    }
    .result-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .result-card-code {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--gold);
    }
    .result-card-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 12px;
      font-size: 0.82rem;
      margin-bottom: 10px;
    }
    .result-card-meta div {
      color: var(--text-dim);
    }
    .result-card-meta div strong {
      color: var(--text);
      font-weight: 600;
    }
    .result-card-seats {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .seat-chip {
      background: var(--gold-dim);
      border: 1px solid var(--gold-dim);
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 0.78rem;
      color: var(--text);
    }
    .result-card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .result-card-actions .btn {
      flex: 1;
      min-width: 100px;
    }

    /* Status Badge */
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-pending   { background: var(--yellow-bg); color: var(--yellow-text); }
    .badge-confirmed { background: var(--green-bg); color: var(--green-text); }
    .badge-cancelled { background: var(--red-bg); color: var(--red-text); }

    /* ═══════════════════════════════════════════════════════════ */
    /*  PENDING LIST (inside Pending modal)                       */
    /* ═══════════════════════════════════════════════════════════ */
    .pending-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      background: var(--bg-input);
      border: 1px solid var(--gold-dim);
      border-radius: 10px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .pending-item:active { border-color: var(--gold); }
    .pending-item-name {
      font-weight: 600;
      color: var(--text);
      font-size: 0.9rem;
    }
    .pending-item-meta {
      color: var(--text-dim);
      font-size: 0.72rem;
      margin-top: 2px;
    }
    .pending-item-code {
      color: var(--gold);
      font-size: 0.85rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  DETAIL MODAL + PENDING MODAL (shared overlay styling)      */
    /* ═══════════════════════════════════════════════════════════ */
    #modal, #pendingModal {
      display: none;
      position: fixed;
      inset: 0;
      background: #000000dd;
      z-index: 100;
      align-items: flex-end;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    #modal.open, #pendingModal.open { display: flex; }

    .modal-box {
      background: var(--bg-card);
      border: 1px solid var(--gold-dim);
      border-radius: 20px 20px 0 0;
      padding: 24px 20px 28px;
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      animation: slideUp 0.25s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .modal-close {
      position: absolute;
      top: 14px; right: 14px;
      background: var(--bg);
      border: 1px solid var(--gold-dim);
      color: var(--text-dim);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-box h2 {
      color: var(--gold);
      margin-bottom: 18px;
      font-size: 1.1rem;
      padding-right: 40px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid var(--gold-dim);
      font-size: 0.9rem;
    }
    .detail-row span:first-child { color: var(--text-dim); }
    .detail-row span:last-child  { color: var(--text); font-weight: 600; }

    .seats-list { margin-top: 14px; }
    .seats-list-title {
      color: var(--text-dim);
      font-size: 0.75rem;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .modal-actions .btn { flex: 1; min-width: 120px; }

    /* ═══════════════════════════════════════════════════════════ */
    /*  TOAST                                                     */
    /* ═══════════════════════════════════════════════════════════ */
    #toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--gold);
      color: #0f0a14;
      padding: 14px 24px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.9rem;
      opacity: 0;
      transition: all 0.3s;
      z-index: 200;
      white-space: nowrap;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    #toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    #toast.error { background: var(--red); color: #fff; }
    #toast.success { background: var(--green); color: #fff; }

    /* ═══════════════════════════════════════════════════════════ */
    /*  LOADING                                                   */
    /* ═══════════════════════════════════════════════════════════ */
    .spinner {
      display: inline-block;
      width: 18px; height: 18px;
      border: 2px solid var(--gold-dim);
      border-top-color: var(--gold);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ═══════════════════════════════════════════════════════════ */
    /*  EMPTY STATE                                               */
    /* ═══════════════════════════════════════════════════════════ */
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-dim);
    }
    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 12px;
      opacity: 0.5;
    }
    .empty-state-text {
      font-size: 0.9rem;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  SCROLLBAR                                                 */
    /* ═══════════════════════════════════════════════════════════ */
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--gold-dim); border-radius: 4px; }
  </style>
<base target="_blank">
</head>
<body>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--  HEADER                                                      -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<header>
  <h1>🎭 Peter Pan Gala</h1>
  <div class="subtitle">Admin Panel — Seat Bookings</div>
</header>

<div class="container">

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!--  SHOW TABS + PENDING BUTTON                                -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="show-tabs-row">
    <div class="show-tabs" id="showTabs">
      <div class="show-tab active" data-show="all" onclick="switchShow('all')">
        All Shows
      </div>
      <div class="show-tab" data-show="1" onclick="switchShow(1)">
        Show 1
        <span class="show-date">June 26</span>
      </div>
      <div class="show-tab" data-show="2" onclick="switchShow(2)">
        Show 2
        <span class="show-date">June 26</span>
      </div>
      <div class="show-tab" data-show="3" onclick="switchShow(3)">
        Show 3
        <span class="show-date">June 26</span>
      </div>
      <div class="show-tab" data-show="4" onclick="switchShow(4)">
        Show 4
        <span class="show-date">June 27</span>
      </div>
      <div class="show-tab" data-show="5" onclick="switchShow(5)">
        Show 5
        <span class="show-date">June 27</span>
      </div>
    </div>

    <button class="pending-btn" id="btnPendingTab" onclick="openPendingModal()">
      ⏳ Pending <span class="pending-badge zero" id="pendingBadge">0</span>
    </button>
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!--  SUMMARY CARDS                                             -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="summary-grid" id="summaryGrid">
    <div class="summary-card">
      <div class="number" id="sumConfirmed">—</div>
      <div class="label">Confirmed</div>
    </div>
    <div class="summary-card">
      <div class="number" id="sumPending">—</div>
      <div class="label">Pending</div>
    </div>
    <div class="summary-card">
      <div class="number" id="sumSeats">—</div>
      <div class="label">Seats Sold</div>
    </div>
    <div class="summary-card">
      <div class="number" id="sumRevenue">—</div>
      <div class="label">Revenue (EGP)</div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!--  SEARCH CARD                                               -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div class="card">
    <div class="card-title">🔍 Search Bookings</div>

    <!-- Guest Search: Name + Last 4 digits -->
    <div class="field">
      <label>Guest Name</label>
      <input type="text" id="searchName" placeholder="e.g. Ahmed" />
    </div>
    <div class="field">
      <label>Last 4 digits of phone</label>
      <input type="tel" id="searchLast4" placeholder="e.g. 5678" maxlength="4" inputmode="numeric" />
    </div>
    <button class="btn btn-gold" onclick="searchGuest()" id="btnSearchGuest">
      Search by Name
    </button>

    <!-- Code Search -->
    <div class="search-section">
      <div class="field">
        <label>Or search by Booking Code</label>
        <input type="text" id="searchCode" placeholder="e.g. MAD-K7XP" style="text-transform:uppercase" />
      </div>
      <div class="field">
        <label>Show # (optional, speeds up search)</label>
        <select id="searchShow">
          <option value="">All shows</option>
          <option value="1">Show 1 — June 26</option>
          <option value="2">Show 2 — June 26</option>
          <option value="3">Show 3 — June 26</option>
          <option value="4">Show 4 — June 27</option>
          <option value="5">Show 5 — June 27</option>
        </select>
      </div>
      <button class="btn btn-ghost" onclick="searchByCode()" id="btnSearchCode">
        Search by Code
      </button>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════ -->
  <!--  RESULTS                                                   -->
  <!-- ═══════════════════════════════════════════════════════════ -->
  <div id="resultsSection" style="display:none;">
    <div class="results-header">
      <h2 id="resultsLabel">Results</h2>
      <button class="btn btn-ghost btn-sm" onclick="clearResults()">✕ Clear</button>
    </div>
    <div id="resultsBody"></div>
  </div>

</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--  DETAIL MODAL                                                -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div id="modal">
  <div class="modal-box">
    <button class="modal-close" onclick="closeModal()">✕</button>
    <h2 id="modalTitle">Booking Details</h2>
    <div id="modalBody"></div>
    <div class="modal-actions" id="modalActions"></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--  PENDING REQUESTS MODAL                                      -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div id="pendingModal">
  <div class="modal-box">
    <button class="modal-close" onclick="closePendingModal()">✕</button>
    <h2>⏳ Pending Requests</h2>
    <div id="pendingListBody"></div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════════ -->
<!--  TOAST                                                       -->
<!-- ═══════════════════════════════════════════════════════════════ -->
<div id="toast"></div>

<script>
// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyEnTJFB8_YgD69jR-wOTRhTGJPOUt5RuTORJz5378HO4_rxAIc9YsP4qscImpM3AND/exec'; // ← PASTE YOUR DEPLOYED APPS SCRIPT URL

// Show dates mapping (update these with actual times)
const SHOW_DATES = {
  1: 'June 26, 2026',
  2: 'June 26, 2026',
  3: 'June 26, 2026',
  4: 'June 27, 2026',
  5: 'June 27, 2026'
};

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════
let currentShow = 'all';
let currentBooking = null;
let lastSearch = { type: null, params: null };
let pendingList = [];

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadSummary();
});

// ═══════════════════════════════════════════════════════════════
//  SHOW SWITCHER
// ═══════════════════════════════════════════════════════════════
function switchShow(show) {
  currentShow = show;
  document.querySelectorAll('.show-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.show === String(show));
  });
  loadSummary();
  clearResults();
}

// ═══════════════════════════════════════════════════════════════
//  LOAD SUMMARY
// ═══════════════════════════════════════════════════════════════
async function loadSummary() {
  const showNum = currentShow === 'all' ? null : parseInt(currentShow);

  setSummaryLoading(true);

  const res = await post({ action: 'getShowSummary', showNumber: showNum });

  setSummaryLoading(false);

  if (!res.success) {
    toast('Failed to load summary', true);
    return;
  }

  let confirmed = 0, pending = 0, seats = 0, revenue = 0;

  res.summary.forEach(s => {
    confirmed += s.confirmed;
    pending += s.pending;
    seats += s.totalSeats;
    revenue += s.totalRevenue;
  });

  document.getElementById('sumConfirmed').textContent = confirmed;
  document.getElementById('sumPending').textContent = pending;
  document.getElementById('sumSeats').textContent = seats;
  document.getElementById('sumRevenue').textContent = 'EGP ' + revenue.toLocaleString();

  // Pending button badge reflects total pending across ALL shows,
  // regardless of which show tab is currently selected.
  updatePendingBadge();
}

function setSummaryLoading(loading) {
  const nums = ['sumConfirmed', 'sumPending', 'sumSeats', 'sumRevenue'];
  nums.forEach(id => {
    document.getElementById(id).textContent = loading ? '…' : '—';
  });
}

async function updatePendingBadge() {
  const res = await post({ action: 'getShowSummary' }); // no showNumber = all shows
  if (!res.success) return;
  const total = res.summary.reduce((sum, s) => sum + s.pending, 0);
  const badge = document.getElementById('pendingBadge');
  badge.textContent = total;
  badge.classList.toggle('zero', total === 0);
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH: Guest Name + Last4
// ═══════════════════════════════════════════════════════════════
async function searchGuest() {
  const name  = document.getElementById('searchName').value.trim();
  const last4 = document.getElementById('searchLast4').value.trim();

  if (!name && !last4) return toast('Enter name or last 4 digits', true);

  setBtnLoading('btnSearchGuest', true, 'Searching…');

  const res = await post({ action: 'searchGuest', name, last4 });

  setBtnLoading('btnSearchGuest', false, 'Search by Name');

  if (!res.success) return toast(res.error || 'Search error', true);

  lastSearch = { type: 'guest', params: { name, last4 } };
  renderResults(res.results, `Found ${res.results.length} booking(s)`);
}

// ═══════════════════════════════════════════════════════════════
//  SEARCH: Booking Code
// ═══════════════════════════════════════════════════════════════
async function searchByCode() {
  const code = document.getElementById('searchCode').value.trim().toUpperCase();
  const show = document.getElementById('searchShow').value;

  if (!code) return toast('Enter a booking code', true);

  setBtnLoading('btnSearchCode', true, 'Searching…');

  const res = await post({ 
    action: 'search', 
    code, 
    showNumber: show ? parseInt(show) : null 
  });

  setBtnLoading('btnSearchCode', false, 'Search by Code');

  if (!res.success) return toast(res.error || 'Search error', true);

  if (!res.found) return toast('No booking found for ' + code, true);

  lastSearch = { type: 'code', params: { code, show } };
  renderResults([res.booking], 'Booking found');
}

// ═══════════════════════════════════════════════════════════════
//  RENDER RESULTS (Mobile Cards)
// ═══════════════════════════════════════════════════════════════
function renderResults(bookings, label) {
  document.getElementById('resultsLabel').textContent = label;
  document.getElementById('resultsSection').style.display = 'block';

  const body = document.getElementById('resultsBody');

  if (bookings.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <div class="empty-state-text">No bookings found</div>
      </div>`;
    return;
  }

  body.innerHTML = bookings.map(b => `
    <div class="result-card">
      <div class="result-card-header">
        <div class="result-card-code">${b.code}</div>
        <span class="badge badge-${b.status.toLowerCase()}">${b.status}</span>
      </div>
      <div class="result-card-meta">
        <div><strong>${b.primaryGuest}</strong></div>
        <div>${b.phone}</div>
        <div>Show <strong>${b.show}</strong></div>
        <div>${b.branchDisplay}</div>
        <div>${b.totalSeats} seat${b.totalSeats > 1 ? 's' : ''}</div>
        <div>EGP ${b.totalPrice}</div>
      </div>
      <div class="result-card-seats">
        ${b.seatGuestPairs.map(p => `<span class="seat-chip">🪑 ${p.seat}</span>`).join('')}
      </div>
      <div class="result-card-actions">
        <button class="btn btn-ghost btn-sm" onclick='openModal(${JSON.stringify(b).replace(/'/g, "\'")})'>
          👁 View Details
        </button>
        ${b.status === 'Pending' ? `
          <button class="btn btn-green btn-sm" onclick='confirmBooking("${b.code}", ${b.show})'>
            ✅ Confirm
          </button>
        ` : ''}
        ${(b.status === 'Pending' || b.status === 'Confirmed') ? `
          <button class="btn btn-red btn-sm" onclick='cancelBooking("${b.code}", ${b.show})'>
            ❌ Cancel
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Scroll to results
  document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function clearResults() {
  document.getElementById('resultsSection').style.display = 'none';
  document.getElementById('resultsBody').innerHTML = '';
  document.getElementById('searchName').value = '';
  document.getElementById('searchLast4').value = '';
  document.getElementById('searchCode').value = '';
  document.getElementById('searchShow').value = '';
  lastSearch = { type: null, params: null };
}

// ═══════════════════════════════════════════════════════════════
//  PENDING REQUESTS MODAL
// ═══════════════════════════════════════════════════════════════
async function openPendingModal() {
  document.getElementById('pendingModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('pendingListBody').innerHTML =
    '<div class="empty-state"><span class="spinner"></span>Loading…</div>';

  const res = await post({ action: 'getPendingBookings' });

  if (!res.success) {
    document.getElementById('pendingListBody').innerHTML =
      '<div class="empty-state"><div class="empty-state-text">Failed to load pending requests</div></div>';
    return;
  }

  pendingList = res.results;
  renderPendingList();
}

function renderPendingList() {
  const body = document.getElementById('pendingListBody');

  if (pendingList.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✨</div>
        <div class="empty-state-text">No pending requests</div>
      </div>`;
    return;
  }

  body.innerHTML = pendingList.map((b, i) => `
    <div class="pending-item" onclick="selectPending(${i})">
      <div>
        <div class="pending-item-name">${b.primaryGuest}</div>
        <div class="pending-item-meta">Show ${b.show} · ${b.branchDisplay}</div>
      </div>
      <div class="pending-item-code">${b.code}</div>
    </div>
  `).join('');
}

// Open the existing booking-detail modal using the data we already
// fetched for the pending list — no second network round-trip needed.
function selectPending(index) {
  const booking = pendingList[index];
  closePendingModal();
  openModal(booking);
}

function closePendingModal() {
  document.getElementById('pendingModal').classList.remove('open');
  document.body.style.overflow = '';
}

// Close pending modal on backdrop click
document.getElementById('pendingModal').addEventListener('click', (e) => {
  if (e.target.id === 'pendingModal') closePendingModal();
});

// ═══════════════════════════════════════════════════════════════
//  DETAIL MODAL
// ═══════════════════════════════════════════════════════════════
function openModal(booking) {
  currentBooking = booking;
  document.getElementById('modalTitle').textContent = `Booking ${booking.code}`;

  const dateStr = booking.timestamp 
    ? new Date(booking.timestamp).toLocaleString('en-EG', { 
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : '—';

  document.getElementById('modalBody').innerHTML = `
    <div class="detail-row"><span>Guest</span><span>${booking.primaryGuest}</span></div>
    <div class="detail-row"><span>Phone</span><span>${booking.phone}</span></div>
    <div class="detail-row"><span>Show</span><span>Show ${booking.show} — ${SHOW_DATES[booking.show] || ''}</span></div>
    <div class="detail-row"><span>Branch</span><span>${booking.branchDisplay}</span></div>
    <div class="detail-row"><span>Payment</span><span>${booking.paymentMethod}</span></div>
    <div class="detail-row"><span>Total</span><span>EGP ${booking.totalPrice}</span></div>
    <div class="detail-row"><span>Status</span>
      <span><span class="badge badge-${booking.status.toLowerCase()}">${booking.status}</span></span>
    </div>
    <div class="detail-row"><span>Booked at</span><span>${dateStr}</span></div>
    <div class="seats-list">
      <div class="seats-list-title">Seats & Guests</div>
      ${booking.seatGuestPairs.map(p => `<span class="seat-chip">🪑 ${p.seat} — ${p.guest}</span>`).join('')}
    </div>
  `;

  const actions = document.getElementById('modalActions');
  actions.innerHTML = '';

  if (booking.status === 'Pending') {
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-green';
    confirmBtn.innerHTML = '✅ Confirm Booking';
    confirmBtn.onclick = () => confirmBooking(booking.code, booking.show);
    actions.appendChild(confirmBtn);
  }

  if (booking.status === 'Pending' || booking.status === 'Confirmed') {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-red';
    cancelBtn.innerHTML = '❌ Cancel Booking';
    cancelBtn.onclick = () => cancelBooking(booking.code, booking.show);
    actions.appendChild(cancelBtn);

    const waBtn = document.createElement('button');
    waBtn.className = 'btn btn-ghost';
    waBtn.innerHTML = '💬 WhatsApp Guest';
    waBtn.onclick = () => {
      if (booking.whatsappLink) window.open(booking.whatsappLink, '_blank');
      else toast('No WhatsApp link available', true);
    };
    actions.appendChild(waBtn);
  }

  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
  document.body.style.overflow = '';
  currentBooking = null;
}

// Close modal on backdrop click
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
});

// ═══════════════════════════════════════════════════════════════
//  CONFIRM BOOKING
// ═══════════════════════════════════════════════════════════════
async function confirmBooking(code, showNumber) {
  if (!confirm(`Confirm booking ${code}?`)) return;

  toast('Confirming…');

  const res = await post({ action: 'confirm', code, showNumber });

  if (res.success) {
    toast('✅ Booking confirmed!', false, 'success');
    closeModal();
    refreshSearch();
    loadSummary();

    // Auto-open WhatsApp to notify user
    if (res.whatsappLink) {
      setTimeout(() => window.open(res.whatsappLink, '_blank'), 500);
    }
  } else {
    toast(res.message || 'Error confirming', true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  CANCEL BOOKING
// ═══════════════════════════════════════════════════════════════
async function cancelBooking(code, showNumber) {
  if (!confirm(`Cancel booking ${code}? Seats will be released immediately.`)) return;

  toast('Cancelling…');

  const res = await post({ action: 'cancel', code, showNumber });

  if (res.success) {
    toast('❌ Booking cancelled. Seats released.', false, 'success');
    closeModal();
    refreshSearch();
    loadSummary();
  } else {
    toast(res.message || 'Error cancelling', true);
  }
}

// ═══════════════════════════════════════════════════════════════
//  REFRESH SEARCH AFTER ACTION
// ═══════════════════════════════════════════════════════════════
function refreshSearch() {
  if (!lastSearch.type) return;

  if (lastSearch.type === 'guest') {
    searchGuest();
  } else if (lastSearch.type === 'code') {
    searchByCode();
  }
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
async function post(body) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch (e) {
    toast('Network error — check connection', true);
    return { success: false };
  }
}

function setBtnLoading(id, loading, text) {
  const btn = document.getElementById(id);
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>' + text;
  } else {
    btn.disabled = false;
    btn.textContent = text;
  }
}

function toast(msg, isError = false, type = null) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'show' + (isError ? ' error' : type ? ' ' + type : '');
  setTimeout(() => el.className = '', 3000);
}

// Enter key triggers search
document.getElementById('searchName').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchGuest();
});
document.getElementById('searchLast4').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchGuest();
});
document.getElementById('searchCode').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchByCode();
});
</script>
</body>
</html>
