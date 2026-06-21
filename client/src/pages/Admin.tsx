import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MessageCircle, Clock, CheckCircle, XCircle, ChevronLeft } from 'lucide-react';

const ADMIN_PASSWORD = 'peterpan2025';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzughNZylOlV2NTKfkt3WNrcfcbWPaDBvVeH0osmrkwp51tLuOESqe4Ss1hk42RNFuD/exec';

const SHOW_DATES: Record<number, string> = {
  1: 'Jun 26 · 6:00 PM',
  2: 'Jun 26 · 8:30 PM',
  3: 'Jun 26 · 11:00 PM',
  4: 'Jun 27 · 6:00 PM',
  5: 'Jun 27 · 8:30 PM',
};

interface BookingResult {
  code: string;
  primaryGuest: string;
  phone: string;
  showNumber: number;
  show?: number;
  branch?: string;
  paymentMethod: 'InstaPay' | 'Cash';
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  totalSeats: number;
  totalPrice: number;
  seatGuestPairs: Array<{ seat: string; guest: string }>;
  timestamp: string;
  whatsappLink?: string;
}

const s: Record<string, React.CSSProperties> = {
  page:     { minHeight: '100vh', backgroundColor: '#0f0a14', color: '#e8dcc8', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' },
  center:   { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card:     { backgroundColor: '#1a0f22', border: '1px solid #C9A84C44', borderRadius: '14px', padding: '24px 20px' },
  gold:     { color: '#C9A84C' },
  dim:      { color: '#a89070' },
  badge: (status: string): React.CSSProperties => ({
    display: 'inline-block', padding: '3px 12px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
    background: status === 'Confirmed' ? '#c8e6c9' : status === 'Cancelled' ? '#ffcdd2' : '#fff9c4',
    color:      status === 'Confirmed' ? '#1b5e20' : status === 'Cancelled' ? '#7f0000' : '#7a6000',
  }),
};

const gasPost = async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(body), mode: 'cors' });
  if (!res.ok) throw new Error('Service unavailable');
  return res.json();
};

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // Search state
  const [bookingCode, setBookingCode] = useState('');
  const [showNumber, setShowNumber]   = useState('');
  const [searchResult, setSearchResult] = useState<BookingResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pending panel state
  const [pendingOpen, setPendingOpen]   = useState(false);
  const [pendingList, setPendingList]   = useState<BookingResult[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selectedPending, setSelectedPending] = useState<BookingResult | null>(null);

  // ── AUTH ──────────────────────────────────────────────────────
  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) { setIsAuthenticated(true); setPassword(''); toast.success('Logged in'); }
    else { toast.error('Invalid password'); setPassword(''); }
  };

  // ── SEARCH ────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!bookingCode.trim()) { toast.error('Enter a booking code'); return; }
    setIsSearching(true);
    try {
      const res = await gasPost({ action: 'search', code: bookingCode.trim().toUpperCase(), showNumber: showNumber ? parseInt(showNumber) : null });
      if (res.success && res.booking) setSearchResult(res.booking as BookingResult);
      else { setSearchResult(null); toast.error('Booking not found'); }
    } catch { toast.error('Search failed'); }
    finally { setIsSearching(false); }
  };

  // ── CONFIRM ───────────────────────────────────────────────────
  const handleConfirm = async (booking: BookingResult, onSuccess: (updated: BookingResult) => void) => {
    setIsProcessing(true);
    try {
      const res = await gasPost({ action: 'confirm', code: booking.code, showNumber: booking.showNumber ?? booking.show });
      if (res.success) {
        toast.success('✅ Booking confirmed');
        onSuccess({ ...booking, status: 'Confirmed' });
        if (res.whatsappLink) setTimeout(() => window.open(res.whatsappLink as string, '_blank'), 400);
      } else toast.error('Failed to confirm');
    } catch { toast.error('Network error'); }
    finally { setIsProcessing(false); }
  };

  // ── CANCEL ────────────────────────────────────────────────────
  const handleCancel = async (booking: BookingResult, onSuccess: (updated: BookingResult) => void) => {
    if (!confirm(`Cancel booking ${booking.code}? Seats will be released.`)) return;
    setIsProcessing(true);
    try {
      const res = await gasPost({ action: 'cancel', code: booking.code, showNumber: booking.showNumber ?? booking.show });
      if (res.success) {
        toast.success('❌ Booking cancelled');
        onSuccess({ ...booking, status: 'Cancelled' });
      } else toast.error('Failed to cancel');
    } catch { toast.error('Network error'); }
    finally { setIsProcessing(false); }
  };

  // ── LOAD PENDING ──────────────────────────────────────────────
  const loadPending = async () => {
    setPendingLoading(true);
    setSelectedPending(null);
    try {
      const res = await gasPost({ action: 'getPending' });
      setPendingList((res.bookings as BookingResult[]) || []);
    } catch { toast.error('Failed to load pending bookings'); }
    finally { setPendingLoading(false); }
  };

  const openPendingPanel = () => { setPendingOpen(true); loadPending(); };
  const closePendingPanel = () => { setPendingOpen(false); setSelectedPending(null); setPendingList([]); };

  // WhatsApp
  const openWhatsApp = (booking: BookingResult) => {
    if (booking.whatsappLink) { window.open(booking.whatsappLink, '_blank'); return; }
    const msg = `✅ Confirmed — Hi ${booking.primaryGuest}, your booking for Show ${booking.showNumber ?? booking.show} is confirmed. Code: ${booking.code}. Seats: ${booking.totalSeats}. Total: ${booking.totalPrice} EGP.`;
    window.open(`https://wa.me/${booking.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── LOGIN SCREEN ──────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{ ...s.page, ...s.center, padding: '20px' }}>
        <div style={{ ...s.card, maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: '2rem', fontFamily: 'Cormorant Garamond, serif', ...s.gold, marginBottom: 28, textAlign: 'center' }}>
            🎭 Admin Panel
          </h1>
          <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', ...s.dim }}>Password</label>
          <Input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            style={{ backgroundColor: '#0f0a14', color: '#e8dcc8', border: '1px solid #C9A84C88', borderRadius: 8, padding: '12px', marginBottom: 16 }}
          />
          <Button onClick={handleLogin} style={{ width: '100%', backgroundColor: '#C9A84C', color: '#0f0a14', fontWeight: 700, padding: '13px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
            Login
          </Button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ─────────────────────────────────────────────────
  return (
    <div style={{ ...s.page, padding: '24px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={{ fontSize: '2rem', fontFamily: 'Cormorant Garamond, serif', ...s.gold }}>🎭 Admin Panel</h1>
          <button
            onClick={openPendingPanel}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              backgroundColor: '#7a6000', color: '#fff9c4',
              border: '1px solid #C9A84C88', borderRadius: 10,
              padding: '10px 18px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#C9A84C'; e.currentTarget.style.color = '#0f0a14'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#7a6000'; e.currentTarget.style.color = '#fff9c4'; }}
          >
            <Clock size={16} />
            Pending Requests
          </button>
        </div>

        {/* Search card */}
        <div style={{ ...s.card, marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontFamily: 'Cormorant Garamond, serif', ...s.gold, marginBottom: 18 }}>🔍 Search Booking</h2>

          <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', ...s.dim }}>Booking Code</label>
          <Input
            placeholder="e.g. X7K2PQ"
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ backgroundColor: '#0f0a14', color: '#e8dcc8', border: '1px solid #C9A84C88', borderRadius: 8, padding: '12px', marginBottom: 14 }}
          />

          <label style={{ display: 'block', marginBottom: 6, fontSize: '0.8rem', ...s.dim }}>Show Number (optional)</label>
          <Input
            type="number" min="1" max="5" placeholder="1–5"
            value={showNumber}
            onChange={(e) => setShowNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ backgroundColor: '#0f0a14', color: '#e8dcc8', border: '1px solid #C9A84C88', borderRadius: 8, padding: '12px', marginBottom: 18 }}
          />

          <Button onClick={handleSearch} disabled={isSearching} style={{ width: '100%', backgroundColor: '#C9A84C', color: '#0f0a14', fontWeight: 700, padding: '13px', borderRadius: 8, border: 'none', cursor: isSearching ? 'not-allowed' : 'pointer', opacity: isSearching ? 0.7 : 1 }}>
            {isSearching ? 'Searching…' : 'Search'}
          </Button>
        </div>

        {/* Search result */}
        {searchResult && (
          <BookingDetail
            booking={searchResult}
            isProcessing={isProcessing}
            onConfirm={(b) => handleConfirm(b, (updated) => setSearchResult(updated))}
            onCancel={(b)  => handleCancel(b,  (updated) => setSearchResult(updated))}
            onWhatsApp={openWhatsApp}
          />
        )}
      </div>

      {/* ── PENDING PANEL MODAL ─────────────────────────────────── */}
      {pendingOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closePendingPanel(); }}
        >
          <div style={{
            backgroundColor: '#1a0f22', border: '1px solid #C9A84C44',
            borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 600,
            maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px 32px',
            animation: 'slideUp 0.25s ease-out'
          }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              {selectedPending ? (
                <button onClick={() => setSelectedPending(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', ...s.gold, cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                  <ChevronLeft size={18} /> Back to list
                </button>
              ) : (
                <h2 style={{ fontSize: '1.2rem', fontFamily: 'Cormorant Garamond, serif', ...s.gold }}>
                  ⏳ Pending Requests
                </h2>
              )}
              <button onClick={closePendingPanel} style={{ background: '#0f0a14', border: '1px solid #C9A84C44', color: '#a89070', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            {/* List view */}
            {!selectedPending && (
              <>
                {pendingLoading && (
                  <div style={{ textAlign: 'center', padding: '40px 0', ...s.dim }}>
                    <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
                    Loading pending bookings…
                  </div>
                )}

                {!pendingLoading && pendingList.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', ...s.dim }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
                    No pending requests!
                  </div>
                )}

                {!pendingLoading && pendingList.length > 0 && (
                  <>
                    <p style={{ ...s.dim, fontSize: '0.85rem', marginBottom: 14 }}>{pendingList.length} pending booking{pendingList.length > 1 ? 's' : ''} — tap to review</p>
                    {pendingList.map((b) => (
                      <button
                        key={b.code}
                        onClick={() => setSelectedPending(b)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          width: '100%', background: '#0f0a14', border: '1px solid #C9A84C44',
                          borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                          cursor: 'pointer', transition: 'border-color 0.2s', textAlign: 'left',
                          color: '#e8dcc8'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#C9A84C44'; }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', ...s.gold, marginBottom: 4 }}>{b.primaryGuest}</div>
                          <div style={{ fontSize: '0.8rem', ...s.dim }}>{b.code} · Show {b.showNumber ?? b.show} · {SHOW_DATES[b.showNumber ?? b.show ?? 1]}</div>
                          <div style={{ fontSize: '0.8rem', ...s.dim, marginTop: 2 }}>{b.totalSeats} seat{b.totalSeats > 1 ? 's' : ''} · EGP {b.totalPrice}</div>
                        </div>
                        <div style={{ fontSize: '1.3rem', ...s.dim }}>›</div>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}

            {/* Detail view */}
            {selectedPending && (
              <BookingDetail
                booking={selectedPending}
                isProcessing={isProcessing}
                onConfirm={(b) => handleConfirm(b, (updated) => {
                  setSelectedPending(updated);
                  setPendingList(prev => prev.filter(p => p.code !== updated.code));
                })}
                onCancel={(b) => handleCancel(b, (updated) => {
                  setSelectedPending(updated);
                  setPendingList(prev => prev.filter(p => p.code !== updated.code));
                })}
                onWhatsApp={openWhatsApp}
              />
            )}
          </div>
        </div>
      )}

      {/* WhatsApp FAB */}
      <a href="https://wa.me/201000305053" target="_blank" rel="noopener noreferrer" style={{ position: 'fixed', bottom: 24, left: 24, width: 56, height: 56, backgroundColor: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
        <MessageCircle size={28} color="white" />
      </a>
    </div>
  );
}

// ── BOOKING DETAIL COMPONENT ──────────────────────────────────────
function BookingDetail({ booking, isProcessing, onConfirm, onCancel, onWhatsApp }: {
  booking: BookingResult;
  isProcessing: boolean;
  onConfirm: (b: BookingResult) => void;
  onCancel:  (b: BookingResult) => void;
  onWhatsApp: (b: BookingResult) => void;
}) {
  const showNum = booking.showNumber ?? booking.show ?? 0;
  const statusColor = booking.status === 'Confirmed' ? '#14B8A6' : booking.status === 'Cancelled' ? '#EF4444' : '#C9A84C';

  const row = (label: string, value: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #C9A84C22', fontSize: '0.9rem' }}>
      <span style={{ color: '#a89070' }}>{label}</span>
      <span style={{ color: '#e8dcc8', fontWeight: 600 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#0f0a14', border: '1px solid #C9A84C44', borderRadius: 14, padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem', color: '#C9A84C', fontWeight: 700 }}>{booking.code}</span>
        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', backgroundColor: booking.status === 'Confirmed' ? '#c8e6c9' : booking.status === 'Cancelled' ? '#ffcdd2' : '#fff9c4', color: booking.status === 'Confirmed' ? '#1b5e20' : booking.status === 'Cancelled' ? '#7f0000' : '#7a6000' }}>
          {booking.status}
        </span>
      </div>

      {row('Guest', booking.primaryGuest)}
      {row('Phone', booking.phone)}
      {row('Show', `Show ${showNum} — ${SHOW_DATES[showNum] || ''}`)}
      {row('Branch', booking.branch || '—')}
      {row('Payment', booking.paymentMethod)}
      {row('Seats', String(booking.totalSeats))}
      {row('Total', `EGP ${booking.totalPrice}`)}
      {booking.timestamp && row('Booked at', new Date(booking.timestamp).toLocaleString('en-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}

      {/* Seats list */}
      <div style={{ marginTop: 14, marginBottom: 18 }}>
        <div style={{ fontSize: '0.75rem', color: '#a89070', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Seats</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {booking.seatGuestPairs.map((p, i) => (
            <span key={i} style={{ background: '#C9A84C22', border: '1px solid #C9A84C44', borderRadius: 6, padding: '4px 10px', fontSize: '0.82rem', color: '#e8dcc8' }}>
              🪑 {p.seat}
            </span>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {booking.status !== 'Confirmed' && booking.status !== 'Cancelled' && (
          <button
            onClick={() => onConfirm(booking)}
            disabled={isProcessing}
            style={{ flex: 1, minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#2e7d32', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.6 : 1, fontSize: '0.9rem' }}
          >
            <CheckCircle size={16} /> Confirm
          </button>
        )}
        {booking.status !== 'Cancelled' && (
          <button
            onClick={() => onCancel(booking)}
            disabled={isProcessing}
            style={{ flex: 1, minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#c62828', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.6 : 1, fontSize: '0.9rem' }}
          >
            <XCircle size={16} /> Cancel
          </button>
        )}
        {(booking.status === 'Confirmed') && (
          <button
            onClick={() => onWhatsApp(booking)}
            style={{ flex: 1, minWidth: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#25D366', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}
