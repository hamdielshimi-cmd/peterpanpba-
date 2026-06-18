import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';

const TICKET_PRICE = 500;
const NORMAL_HOLD_DURATION = 900;
const INSTAPAY_LINK = 'https://ipn.eg/S/aliyehiapba6121/instapay/9Rxw7m';
const HERO_IMAGE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663340831653/2Ktp4TNevcqWNNpdcRjkGW/peter-pan-hero-bg-LQ9yMucFTHQFuH579545zp.webp';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzW8zI8dei_QKpREErapvifv_ECrvrRtAl0M5kFRKr4b_Bke8nRPWtpTt-C_SGxtFFM/exec';
const WHATSAPP_NUMBER = '201000305053';

// Show names — these are the actual show names, accessed via ?show=1..5
const SHOW_INFO: Record<number, { name: string; date: string; time: string }> = {
  1: { name: 'Peter Pan Cast 1',            date: 'Saturday, June 28',  time: '1:30 PM' },
  2: { name: 'Peter Pan Cast 2',            date: 'Saturday, June 28',  time: '6:00 PM' },
  3: { name: 'Peter Pan Cast 3 Contemporary', date: 'Sunday, June 29', time: '12:00 PM' },
  4: { name: 'SURVIVAL',                    date: 'Sunday, June 29',   time: '6:00 PM'  },
  5: { name: 'SURVIVAL',                    date: 'Sunday, June 29',   time: '8:00 PM'  },
};

const ALL_ROWS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'];
const RIGHT_SEATS  = 7;
const MIDDLE_SEATS = 13;
const LEFT_SEATS   = 7;
const MIDDLE_BLOCKED_ROWS = new Set(['A', 'E', 'F']);

type BranchOption = 'Maadi' | 'New Cairo (The FamBam mall)' | 'New Giza' | 'Sheikh Zayed';

interface Seat {
  id: string;
  row: string;
  block: 'R' | 'M' | 'L';
  globalNumber: number;
  blockNumber: number;
  state: 'available' | 'selected' | 'held' | 'booked' | 'blocked';
}

interface BookingResponse {
  success: boolean;
  code?: string;
  totalPrice?: number;
  totalSeats?: number;
  whatsappLink?: string;
  error?: string;
  message?: string;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Read show number from /show1-5 path OR ?show=1-5 query param
const getShowNumber = (): number => {
  const pathMatch = window.location.pathname.match(/\/show([1-5])$/);
  if (pathMatch) return parseInt(pathMatch[1], 10);
  const params = new URLSearchParams(window.location.search);
  const n = parseInt(params.get('show') || '1', 10);
  return (n >= 1 && n <= 5) ? n : 1;
};

const initializeSeats = (): Seat[] => {
  const seats: Seat[] = [];
  ALL_ROWS.forEach(row => {
    for (let i = 1; i <= RIGHT_SEATS; i++) {
      seats.push({ id: `${row}${i}`, row, block: 'R', globalNumber: i, blockNumber: i, state: 'available' });
    }
    for (let i = 1; i <= MIDDLE_SEATS; i++) {
      const g = RIGHT_SEATS + i;
      seats.push({ id: `${row}${g}`, row, block: 'M', globalNumber: g, blockNumber: i, state: MIDDLE_BLOCKED_ROWS.has(row) ? 'blocked' : 'available' });
    }
    for (let i = 1; i <= LEFT_SEATS; i++) {
      const g = RIGHT_SEATS + MIDDLE_SEATS + i;
      seats.push({ id: `${row}${g}`, row, block: 'L', globalNumber: g, blockNumber: i, state: 'available' });
    }
  });
  return seats;
};

export default function Home() {
  const showNumber = getShowNumber();
  const showInfo   = SHOW_INFO[showNumber];

  const [phase, setPhase]               = useState<1 | 2 | 3>(1);
  const [seats, setSeats]               = useState<Seat[]>(initializeSeats());
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);

  const [phone, setPhone]               = useState('');
  const [primaryGuest, setPrimaryGuest] = useState('');
  const [branch, setBranch]             = useState<BranchOption>('Maadi');

  const [bookingCode, setBookingCode]   = useState('');
  const [totalPrice, setTotalPrice]     = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(NORMAL_HOLD_DURATION);
  const [whatsappLink, setWhatsappLink] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seatError, setSeatError]       = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  // Poll seat availability
  useEffect(() => {
    const poll = async () => {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${GAS_URL}?show=${showNumber}`, { signal: controller.signal, mode: 'cors' });
        clearTimeout(tid);
        if (!res.ok) return;
        const data = await res.json();
        setSeats(prev => prev.map(seat => {
          if (MIDDLE_BLOCKED_ROWS.has(seat.row) && seat.block === 'M') return { ...seat, state: 'blocked' };
          if ((data.blocked  || []).includes(seat.id)) return { ...seat, state: 'blocked' };
          if ((data.confirmed || []).includes(seat.id)) return { ...seat, state: 'booked' };
          if ((data.pending   || []).includes(seat.id)) return { ...seat, state: 'held' };
          if (selectedSeats.some(s => s.id === seat.id))  return { ...seat, state: 'selected' };
          return { ...seat, state: 'available' };
        }));
      } catch { /* silent */ }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [showNumber]);

  // Hold countdown
  useEffect(() => {
    if (phase !== 3 || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { setPhase(1); toast.error('Hold expired. Please book again.'); return NORMAL_HOLD_DURATION; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeRemaining]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.state === 'held' || seat.state === 'booked' || seat.state === 'blocked') return;
    setSeatError('');
    if (seat.state === 'selected') {
      setSelectedSeats(prev => prev.filter(s => s.id !== seat.id));
      setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, state: 'available' } : s));
    } else {
      if (selectedSeats.length >= 6) { setSeatError('Maximum 6 seats per booking'); return; }
      setSelectedSeats(prev => [...prev, seat]);
      setSeats(prev => prev.map(s => s.id === seat.id ? { ...s, state: 'selected' } : s));
    }
  };

  const handleSubmitBooking = async () => {
    if (!phone.trim() || !primaryGuest.trim() || selectedSeats.length === 0) {
      toast.error('Please fill all required fields'); return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      toast.error('Phone number must be at least 10 digits'); return;
    }
    setIsSubmitting(true);
    setDuplicateError('');
    setSeatError('');
    try {
      const sorted = [...selectedSeats].sort((a, b) =>
        a.row !== b.row ? a.row.localeCompare(b.row) : a.globalNumber - b.globalNumber
      );
      const seatGuestPairs = sorted.map((seat, idx) => ({
        seat: seat.id,
        guest: idx === 0 ? primaryGuest : `Guest ${idx + 1}`
      }));

      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'submit', showNumber, primaryGuest, phone, paymentMethod: 'InstaPay', branch, seatGuestPairs }),
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(tid);
      if (!res.ok) throw new Error('Service unavailable');

      const result: BookingResponse = await res.json();
      if (!result.success) {
        if (result.message?.includes('already has a booking')) setDuplicateError(result.message);
        else setSeatError(result.error || result.message || 'Booking failed');
        return;
      }
      setBookingCode(result.code || '');
      setTotalPrice(result.totalPrice || selectedSeats.length * TICKET_PRICE);
      setWhatsappLink(result.whatsappLink || '');
      setTimeRemaining(NORMAL_HOLD_DURATION);
      setPhase(3);
      toast.success('Seats held! Complete payment now.');
    } catch { setSeatError('Network error. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  // ─── SHARED STYLES ───────────────────────────────────────────
  const bg    = '#140814';
  const card  = { backgroundColor: '#1a0f1a', border: '1px solid #3a2a3a', borderRadius: '0.75rem' };
  const gold  = '#C9A84C';
  const dim   = '#999';

  // ─── PHASE 1: HERO ───────────────────────────────────────────
  if (phase === 1) return (
    <div style={{ minHeight: '100vh', position: 'relative', backgroundImage: `url(${HERO_IMAGE})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,4,14,0.72)' }} />
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: gold, letterSpacing: '0.2em', fontSize: '0.9rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Peter Pan Ballet Gala</p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 300, color: '#fff', marginBottom: '0.75rem', lineHeight: 1.2 }}>
          {showInfo.name}
        </h1>
        <p style={{ color: gold, fontSize: '1.1rem', marginBottom: '0.4rem' }}>{showInfo.date}</p>
        <p style={{ color: '#ccc', fontSize: '1rem', marginBottom: '2.5rem' }}>{showInfo.time}</p>
        <Button onClick={() => setPhase(2)} style={{ backgroundColor: gold, color: '#140814', padding: '0.9rem 2.5rem', fontSize: '1rem', fontWeight: 700, borderRadius: '0.5rem', border: 'none', cursor: 'pointer', letterSpacing: '0.1em' }}>
          CHOOSE YOUR SEATS →
        </Button>
      </div>
      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
        style={{ position: 'fixed', bottom: '1.5rem', left: '1.5rem', width: 56, height: 56, backgroundColor: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
        <MessageCircle size={28} color="white" />
      </a>
    </div>
  );

  // ─── PHASE 2: SEAT MAP ────────────────────────────────────────
  if (phase === 2) {
    const SeatBtn = ({ seat }: { seat: Seat }) => {
      const sel = seat.state === 'selected';
      const bgMap: Record<string, string> = { available: '#2a1a2a', selected: '#FFD700', held: '#FF6B35', booked: '#6b1a1a', blocked: '#1a1a1a' };
      const bMap:  Record<string, string> = { available: '#4a3a4a', selected: '#C9A84C', held: '#FF8C42',  booked: '#8B0000', blocked: '#2a2a2a' };
      return (
        <button
          onClick={() => handleSeatClick(seat)}
          disabled={seat.state !== 'available' && seat.state !== 'selected'}
          title={seat.id}
          style={{ width: 30, height: 30, backgroundColor: bgMap[seat.state] || '#2a1a2a', border: `2px solid ${bMap[seat.state] || '#4a3a4a'}`, borderRadius: 4, color: sel ? '#140814' : '#777', fontSize: '0.55rem', fontWeight: 700, cursor: (seat.state === 'available' || sel) ? 'pointer' : 'not-allowed', padding: 0, transition: 'transform 0.1s', flexShrink: 0 }}
        >
          {seat.globalNumber}
        </button>
      );
    };

    return (
      <div style={{ minHeight: '100vh', backgroundColor: bg, color: '#e8e8e8', padding: '1.5rem 1rem', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ color: dim, fontSize: '0.85rem', marginBottom: 4 }}>Peter Pan Ballet Gala</p>
            <h2 style={{ fontFamily: 'Georgia,serif', color: gold, fontSize: 'clamp(1.3rem,3vw,2rem)', fontWeight: 300, marginBottom: 4 }}>{showInfo.name}</h2>
            <p style={{ color: '#ccc', fontSize: '0.9rem' }}>{showInfo.date} · {showInfo.time}</p>
          </div>

          {/* Stage */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-block', padding: '0.4rem 2rem', background: '#2a1a2a', border: `1px solid ${gold}44`, borderRadius: 6, color: dim, fontSize: '0.8rem', letterSpacing: '0.15em' }}>🎭 STAGE</div>
          </div>

          {/* Seat grid */}
          <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
            {ALL_ROWS.map(row => {
              const R = seats.filter(s => s.row === row && s.block === 'R');
              const M = seats.filter(s => s.row === row && s.block === 'M');
              const L = seats.filter(s => s.row === row && s.block === 'L');
              return (
                <div key={row} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: 6 }}>
                  <span style={{ width: 22, textAlign: 'right', color: dim, fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>{row}</span>
                  <div style={{ display: 'flex', gap: 4 }}>{R.map(s => <SeatBtn key={s.id} seat={s} />)}</div>
                  <div style={{ display: 'flex', gap: 4 }}>{M.map(s => <SeatBtn key={s.id} seat={s} />)}</div>
                  <div style={{ display: 'flex', gap: 4 }}>{L.map(s => <SeatBtn key={s.id} seat={s} />)}</div>
                  <span style={{ width: 22, textAlign: 'left', color: dim, fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>{row}</span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem', margin: '1.5rem 0', fontSize: '0.8rem' }}>
            {[['#2a1a2a','#4a3a4a','Available'],['#FFD700','#C9A84C','Selected'],['#FF6B35','#FF8C42','On Hold'],['#6b1a1a','#8B0000','Booked'],['#1a1a1a','#2a2a2a','Blocked']].map(([bg2,br,lbl]) => (
              <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 18, height: 18, background: bg2, border: `2px solid ${br}`, borderRadius: 3 }} />
                <span style={{ color: dim }}>{lbl}</span>
              </div>
            ))}
          </div>

          {/* Booking form */}
          {selectedSeats.length > 0 && (
            <div style={{ ...card, padding: '1.5rem', maxWidth: 520, margin: '0 auto' }}>
              <h3 style={{ color: gold, fontFamily: 'Georgia,serif', marginBottom: '1.25rem', fontWeight: 400 }}>Your Booking</h3>

              <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#2a1a2a', borderRadius: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedSeats.map(s => (
                  <span key={s.id} style={{ background: gold + '33', border: `1px solid ${gold}66`, borderRadius: 4, padding: '3px 8px', fontSize: '0.8rem', color: gold }}>{s.id}</span>
                ))}
              </div>

              {/* Branch */}
              <label style={{ display: 'block', color: dim, fontSize: '0.8rem', marginBottom: 4 }}>Branch</label>
              <select value={branch} onChange={e => setBranch(e.target.value as BranchOption)}
                style={{ width: '100%', padding: '0.75rem', background: '#2a1a2a', color: '#e8e8e8', border: '1px solid #4a3a4a', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                <option>Maadi</option>
                <option>New Cairo (The FamBam mall)</option>
                <option>New Giza</option>
                <option>Sheikh Zayed</option>
              </select>

              {/* Name */}
              <label style={{ display: 'block', color: dim, fontSize: '0.8rem', marginBottom: 4 }}>Your Name *</label>
              <Input value={primaryGuest} onChange={e => setPrimaryGuest(e.target.value)} placeholder="Full name"
                style={{ background: '#2a1a2a', color: '#e8e8e8', border: '1px solid #4a3a4a', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' }} />

              {/* Phone */}
              <label style={{ display: 'block', color: dim, fontSize: '0.8rem', marginBottom: 4 }}>Phone Number *</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="01XXXXXXXXX"
                style={{ background: '#2a1a2a', color: '#e8e8e8', border: '1px solid #4a3a4a', borderRadius: 6, padding: '0.75rem', marginBottom: '0.75rem' }} />

              {duplicateError && <div style={{ background: '#4a0000', color: '#ffb0b0', padding: '0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.85rem' }}>{duplicateError}</div>}
              {seatError      && <div style={{ background: '#4a0000', color: '#ffb0b0', padding: '0.75rem', borderRadius: 6, marginBottom: '0.75rem', fontSize: '0.85rem' }}>{seatError}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #3a2a3a', paddingTop: '1rem' }}>
                <div>
                  <div style={{ color: dim, fontSize: '0.8rem' }}>{selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} × {TICKET_PRICE} EGP</div>
                  <div style={{ color: gold, fontSize: '1.4rem', fontWeight: 700 }}>{selectedSeats.length * TICKET_PRICE} EGP</div>
                </div>
                <Button onClick={handleSubmitBooking} disabled={isSubmitting}
                  style={{ background: gold, color: '#140814', fontWeight: 700, padding: '0.8rem 1.5rem', borderRadius: 8, border: 'none', cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}>
                  {isSubmitting ? 'Holding…' : 'HOLD SEATS'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PHASE 3: PAYMENT ─────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', backgroundColor: bg, color: '#e8e8e8', padding: '2rem 1rem', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ color: dim, fontSize: '0.85rem', marginBottom: 4 }}>{showInfo.name}</p>
          <h2 style={{ fontFamily: 'Georgia,serif', color: gold, fontWeight: 300, fontSize: '1.8rem' }}>Complete Payment</h2>
        </div>

        <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem' }}>
          {/* Booking code */}
          <div style={{ background: '#2a1a2a', borderRadius: 8, padding: '1.25rem', textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ color: dim, fontSize: '0.8rem', marginBottom: 6 }}>Your Booking Code</div>
            <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, color: gold, letterSpacing: '0.15em' }}>{bookingCode}</div>
          </div>

          {/* Timer */}
          <div style={{ background: '#2a1a2a', borderRadius: 8, padding: '0.9rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: dim, fontSize: '0.85rem' }}>⏱ Seats held for</span>
            <span style={{ color: timeRemaining < 120 ? '#FF6B35' : gold, fontWeight: 700, fontSize: '1.1rem', fontFamily: 'monospace' }}>{formatTime(timeRemaining)}</span>
          </div>

          {/* Amount */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #3a2a3a', marginBottom: '1.25rem' }}>
            <span style={{ color: dim }}>Total to pay</span>
            <span style={{ color: gold, fontWeight: 700, fontSize: '1.2rem' }}>{totalPrice} EGP</span>
          </div>

          {/* Step 1: Pay */}
          <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: '#2a1a2a', borderRadius: 8, fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
            <strong style={{ color: gold }}>Step 1 — Pay via InstaPay</strong><br />
            Send exactly <strong>{totalPrice} EGP</strong> and keep your payment receipt screenshot.
          </div>
          <a href={INSTAPAY_LINK} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C3AED', color: '#fff', padding: '0.9rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', marginBottom: '0.75rem' }}>
            💳 Open InstaPay
          </a>

          {/* Step 2: Confirm on WhatsApp */}
          <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', background: '#2a1a2a', borderRadius: 8, fontSize: '0.85rem', color: '#ccc', lineHeight: 1.6 }}>
            <strong style={{ color: gold }}>Step 2 — Send receipt on WhatsApp</strong><br />
            Tap below, attach your payment screenshot. We'll confirm your seats once we verify.
          </div>
          <button
            onClick={() => {
              const msg = `🎭 Peter Pan Ballet Gala — Payment Done\n\nBooking Code: ${bookingCode}\nShow: ${showInfo.name} (${showInfo.date} ${showInfo.time})\nTotal Paid: ${totalPrice} EGP\nName: ${primaryGuest}\nPhone: ${phone}\n\nPlease find my payment receipt attached.`;
              window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#25D366', color: '#fff', padding: '0.9rem', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer', width: '100%' }}>
            <MessageCircle size={20} /> Send Receipt on WhatsApp
          </button>
        </div>

        <p style={{ textAlign: 'center', color: dim, fontSize: '0.78rem', lineHeight: 1.6 }}>
          Your seats are held for 15 minutes. Once we verify your payment, your booking will be confirmed.
        </p>
      </div>
    </div>
  );
}
