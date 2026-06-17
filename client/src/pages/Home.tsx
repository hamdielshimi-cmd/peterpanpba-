import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';
import { useLocation } from 'wouter';

// Constants
const TICKET_PRICE = 500; // EGP per seat
const NORMAL_HOLD_DURATION = 900; // 15 minutes in seconds
const INSTAPAY_LINK = 'https://ipn.eg/S/aliyehiapba6121/instapay/9Rxw7m';
const SUPPORT_EMAIL = 'hamdielshimi@gmail.com';
const HERO_IMAGE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663340831653/2Ktp4TNevcqWNNpdcRjkGW/peter-pan-hero-bg-LQ9yMucFTHQFuH579545zp.webp';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzW8zI8dei_QKpREErapvifv_ECrvrRtAl0M5kFRKr4b_Bke8nRPWtpTt-C_SGxtFFM/exec';

// Show dates (Cairo timezone)
const SHOW_DATES: Record<number, string> = {
  1: 'June 26, 2026 - 6:00 PM',
  2: 'June 26, 2026 - 8:30 PM',
  3: 'June 26, 2026 - 11:00 PM',
  4: 'June 27, 2026 - 6:00 PM',
  5: 'June 27, 2026 - 8:30 PM'
};

// Rows A–U, each 27 seats across all three blocks combined (7 + 13 + 7 = 27)
const ALL_ROWS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U'];
const RIGHT_SEATS  = 7;
const MIDDLE_SEATS = 13;
const LEFT_SEATS   = 7;

// Rows whose MIDDLE block should be fully blocked
const MIDDLE_BLOCKED_ROWS = new Set(['A', 'E', 'F']);

// Branch options
type BranchOption = 'Maadi' | 'New Cairo (The FamBam mall)' | 'New Giza' | 'Sheikh Zayed';

// Types
interface Seat {
  id: string;       // e.g. "A1" … "A27"
  row: string;
  block: 'R' | 'M' | 'L';
  globalNumber: number;   // 1-27 across the whole row
  blockNumber: number;    // 1-based within its block
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

// Utility
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isLateNightBooking = () => {
  const cairoTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  const hour = new Date(cairoTime).getHours();
  return hour >= 22;
};

const getLateNightHoldUntil = () => {
  const cairoTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  const tomorrow = new Date(cairoTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 15, 0, 0);
  return tomorrow.getTime() - new Date(cairoTime).getTime();
};

// Build seats: A1–A27, B1–B27 … U1–U27
// Layout: R(1-7) | M(8-20) | L(21-27)
const initializeSeats = (): Seat[] => {
  const seats: Seat[] = [];
  ALL_ROWS.forEach(row => {
    // Right block: global seats 1-7
    for (let i = 1; i <= RIGHT_SEATS; i++) {
      seats.push({
        id: `${row}${i}`,
        row,
        block: 'R',
        globalNumber: i,
        blockNumber: i,
        state: 'available'
      });
    }
    // Middle block: global seats 8-20
    for (let i = 1; i <= MIDDLE_SEATS; i++) {
      const globalNum = RIGHT_SEATS + i;
      seats.push({
        id: `${row}${globalNum}`,
        row,
        block: 'M',
        globalNumber: globalNum,
        blockNumber: i,
        state: MIDDLE_BLOCKED_ROWS.has(row) ? 'blocked' : 'available'
      });
    }
    // Left block: global seats 21-27
    for (let i = 1; i <= LEFT_SEATS; i++) {
      const globalNum = RIGHT_SEATS + MIDDLE_SEATS + i;
      seats.push({
        id: `${row}${globalNum}`,
        row,
        block: 'L',
        globalNumber: globalNum,
        blockNumber: i,
        state: 'available'
      });
    }
  });
  return seats;
};

export default function Home() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] || '');
  const showNumber = params.get('show') || '1';

  const [phase, setPhase] = useState<1 | 2 | 3>(1);

  const [seats, setSeats] = useState<Seat[]>(initializeSeats());
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [confirmedSeats, setConfirmedSeats] = useState<string[]>([]);
  const [pendingSeats, setPendingSeats] = useState<string[]>([]);
  const [blockedSeats, setBlockedSeats] = useState<string[]>([]);

  const [phone, setPhone] = useState('');
  const [primaryGuest, setPrimaryGuest] = useState('');
  const [paymentMethod] = useState<'InstaPay'>('InstaPay');
  const [branch, setBranch] = useState<BranchOption>('Maadi');

  const [bookingCode, setBookingCode] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(NORMAL_HOLD_DURATION);
  const [isLateNight, setIsLateNight] = useState(false);
  const [holdUntilTime, setHoldUntilTime] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seatError, setSeatError] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  // Poll seat availability
  useEffect(() => {
    const pollSeats = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${GAS_URL}?show=${showNumber}`, {
          signal: controller.signal,
          mode: 'cors'
        });
        clearTimeout(timeoutId);
        if (!response.ok) return;
        const data = await response.json();
        setConfirmedSeats(data.confirmed || []);
        setPendingSeats(data.pending || []);
        setBlockedSeats(data.blocked || []);
        setSeats(prevSeats => prevSeats.map(seat => {
          // Preserve locally-blocked middle rows
          if (MIDDLE_BLOCKED_ROWS.has(seat.row) && seat.block === 'M') return { ...seat, state: 'blocked' };
          if (data.blocked?.includes(seat.id)) return { ...seat, state: 'blocked' };
          if (data.confirmed?.includes(seat.id)) return { ...seat, state: 'booked' };
          if (data.pending?.includes(seat.id)) return { ...seat, state: 'held' };
          if (selectedSeats.some(s => s.id === seat.id)) return { ...seat, state: 'selected' };
          return { ...seat, state: 'available' };
        }));
      } catch {
        // Silent fail
      }
    };
    pollSeats();
    const interval = setInterval(pollSeats, 30000);
    return () => clearInterval(interval);
  }, [showNumber]);

  // Hold timer
  useEffect(() => {
    if (phase !== 3 || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setPhase(1);
          toast.error('Hold time expired. Please book again.');
          return NORMAL_HOLD_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeRemaining, isLateNight]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.state === 'held' || seat.state === 'booked' || seat.state === 'blocked') return;
    setSeatError('');
    if (seat.state === 'selected') {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
      setSeats(seats.map(s => s.id === seat.id ? { ...s, state: 'available' } : s));
    } else {
      if (selectedSeats.length >= 6) {
        setSeatError('Maximum 6 seats per booking');
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
      setSeats(seats.map(s => s.id === seat.id ? { ...s, state: 'selected' } : s));
    }
  };

  const handleSubmitBooking = async () => {
    if (!phone.trim() || !primaryGuest.trim() || selectedSeats.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }

    setIsSubmitting(true);
    setDuplicateError('');

    try {
      const sortedSeats = [...selectedSeats].sort((a, b) => {
        if (a.row !== b.row) return a.row.localeCompare(b.row);
        return a.globalNumber - b.globalNumber;
      });

      const seatGuestPairs = sortedSeats.map((seat, idx) => ({
        seat: seat.id,
        guest: idx === 0 ? primaryGuest : `Guest ${idx + 1}`
      }));

      const lateNight = isLateNightBooking();
      setIsLateNight(lateNight);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'submit',
          showNumber: parseInt(showNumber),
          primaryGuest,
          phone,
          paymentMethod,
          branch,
          seatGuestPairs
        }),
        signal: controller.signal,
        mode: 'cors'
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Booking service unavailable');

      const result: BookingResponse = await response.json();

      if (!result.success) {
        if (result.message && result.message.includes('already has a booking')) {
          setDuplicateError(result.message);
          setSeatError('');
          toast.error('Phone number already has a booking for this show');
        } else {
          setSeatError(result.error || result.message || 'Booking failed. Some seats may have been taken.');
          setDuplicateError('');
        }
        setIsSubmitting(false);
        return;
      }

      setBookingCode(result.code || '');
      setTotalPrice(result.totalPrice || selectedSeats.length * TICKET_PRICE);
      setWhatsappLink(result.whatsappLink || '');

      if (lateNight) {
        const holdMs = getLateNightHoldUntil();
        setTimeRemaining(Math.floor(holdMs / 1000));
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setHoldUntilTime(`tomorrow at ${tomorrow.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' })}`);
      } else {
        setTimeRemaining(NORMAL_HOLD_DURATION);
        setHoldUntilTime('');
      }

      setPhase(3);
      toast.success('Booking saved! Proceeding to payment...');
    } catch (error) {
      console.error('Booking error:', error);
      setSeatError('Network error. Please try again.');
      setDuplicateError('');
      toast.error('Failed to submit booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── HERO PHASE ───────────────────────────────────────────────────────────
  if (phase === 1) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: `url(${HERO_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(135deg, rgba(20,8,20,0.7) 0%, rgba(40,15,35,0.6) 50%, rgba(20,8,20,0.7) 100%)'
        }}></div>
        <div style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '300',
            letterSpacing: '0.15em',
            color: '#C9A84C',
            marginBottom: '1rem',
            textShadow: '0 4px 20px rgba(0,0,0,0.5)',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            Peter Pan Ballet Gala
          </h1>
          <p style={{
            fontSize: '1.3rem',
            color: '#E8E8E8',
            maxWidth: '600px',
            marginBottom: '1rem',
            lineHeight: '1.6',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            fontFamily: 'Lato, sans-serif'
          }}>
            {SHOW_DATES[parseInt(showNumber)] || 'Show Date TBD'}
          </p>
          <p style={{
            fontSize: '1rem',
            color: '#E8E8E8',
            maxWidth: '600px',
            marginBottom: '3rem',
            lineHeight: '1.6',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            fontFamily: 'Lato, sans-serif'
          }}>
            Experience the magic of Neverland. Reserve your premium seat for an unforgettable evening.
          </p>
          <Button
            onClick={() => setPhase(2)}
            style={{
              backgroundColor: '#C9A84C',
              color: '#140814',
              padding: '1rem 2.5rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 24px rgba(201, 168, 76, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#DDB76F';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(201, 168, 76, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#C9A84C';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(201, 168, 76, 0.3)';
            }}
          >
            RESERVE YOUR SEAT →
          </Button>
        </div>

        {/* WhatsApp Button */}
        <a
          href="https://wa.me/201000305053"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '2rem',
            width: '60px',
            height: '60px',
            backgroundColor: '#25D366',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(37, 211, 102, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            zIndex: 50
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 211, 102, 0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.4)';
          }}
        >
          <MessageCircle size={32} color="white" />
        </a>
      </div>
    );
  }

  // ─── SEATING PHASE ────────────────────────────────────────────────────────
  if (phase === 2) {
    const seatButton = (seat: Seat) => {
      const isSelected = selectedSeats.some(s => s.id === seat.id);
      let bgColor = '#2a1a2a';
      let borderColor = '#4a3a4a';
      let cursor = 'pointer';
      if (isSelected) { bgColor = '#FFD700'; borderColor = '#C9A84C'; }
      else if (seat.state === 'booked')  { bgColor = '#8B0000'; borderColor = '#FF0000'; cursor = 'not-allowed'; }
      else if (seat.state === 'held')    { bgColor = '#FF6B35'; borderColor = '#FF8C42'; cursor = 'not-allowed'; }
      else if (seat.state === 'blocked') { bgColor = '#1a1a1a'; borderColor = '#333333'; cursor = 'not-allowed'; }

      return (
        <button
          key={seat.id}
          onClick={() => handleSeatClick(seat)}
          disabled={seat.state !== 'available' && seat.state !== 'selected'}
          title={seat.id}
          style={{
            width: '32px',
            height: '32px',
            backgroundColor: bgColor,
            border: `2px solid ${borderColor}`,
            borderRadius: '0.25rem',
            color: isSelected ? '#140814' : '#999',
            fontSize: '0.6rem',
            fontWeight: '600',
            cursor,
            transition: 'all 0.2s ease',
            boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'none',
            padding: 0
          }}
          onMouseEnter={(e) => {
            if (seat.state === 'available' || seat.state === 'selected')
              e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {seat.globalNumber}
        </button>
      );
    };

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#140814', color: '#E8E8E8', padding: '2rem', fontFamily: 'Lato, sans-serif' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem', fontWeight: '300', letterSpacing: '0.1em',
            color: '#C9A84C', marginBottom: '2rem', textAlign: 'center',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            Select Your Seats
          </h2>

          {/* Seat Map */}
          <div style={{
            backgroundColor: '#1a0f1a', padding: '2rem', borderRadius: '0.5rem',
            marginBottom: '2rem', border: '1px solid #3a2a3a', overflowX: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-block', padding: '0.5rem 1rem',
                backgroundColor: '#2a1a2a', borderRadius: '0.25rem',
                fontSize: '0.9rem', color: '#999'
              }}>
                🎭 STAGE 🎭
              </div>
            </div>

            {ALL_ROWS.map(row => {
              const rightSeats  = seats.filter(s => s.row === row && s.block === 'R');
              const middleSeats = seats.filter(s => s.row === row && s.block === 'M');
              const leftSeats   = seats.filter(s => s.row === row && s.block === 'L');

              return (
                <div key={row} style={{
                  display: 'flex', justifyContent: 'center', gap: '2rem',
                  marginBottom: '0.75rem', alignItems: 'center'
                }}>
                  {/* Row label */}
                  <div style={{ width: '30px', textAlign: 'right', fontSize: '0.9rem', color: '#999', fontWeight: '600' }}>
                    {row}
                  </div>

                  {/* Right block */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {rightSeats.map(seatButton)}
                  </div>

                  {/* Middle block */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {middleSeats.map(seatButton)}
                  </div>

                  {/* Left block */}
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {leftSeats.map(seatButton)}
                  </div>

                  {/* Row label (right side) */}
                  <div style={{ width: '30px', textAlign: 'left', fontSize: '0.9rem', color: '#999', fontWeight: '600' }}>
                    {row}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            {[
              { color: '#2a1a2a', border: '#4a3a4a', label: 'Available' },
              { color: '#FFD700', border: '#C9A84C', label: 'Selected' },
              { color: '#FF6B35', border: '#FF8C42', label: 'On Hold' },
              { color: '#8B0000', border: '#FF0000', label: 'Booked' },
              { color: '#1a1a1a', border: '#333333', label: 'Blocked' },
            ].map(({ color, border, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: color, border: `2px solid ${border}`, borderRadius: '0.25rem' }}></div>
                <span>{label}</span>
              </div>
            ))}
          </div>

          {/* Booking Form */}
          {selectedSeats.length > 0 && (
            <div style={{
              backgroundColor: '#1a0f1a', padding: '1.5rem', borderRadius: '0.5rem',
              marginBottom: '2rem', border: '1px solid #3a2a3a'
            }}>
              <h3 style={{ color: '#C9A84C', marginBottom: '1rem', fontFamily: 'Cormorant Garamond, serif' }}>
                Booking Details
              </h3>

              {/* Branch */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: '0.9rem' }}>Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value as BranchOption)}
                  style={{
                    width: '100%', padding: '0.75rem',
                    backgroundColor: '#2a1a2a', color: '#E8E8E8',
                    border: '1px solid #4a3a4a', borderRadius: '0.25rem',
                    fontFamily: 'Lato, sans-serif'
                  }}
                >
                  <option value="Maadi">Maadi</option>
                  <option value="New Cairo (The FamBam mall)">New Cairo (The FamBam mall)</option>
                  <option value="New Giza">New Giza</option>
                  <option value="Sheikh Zayed">Sheikh Zayed</option>
                </select>
              </div>

              {/* Primary Guest */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: '0.9rem' }}>Primary Guest Name *</label>
                <Input
                  value={primaryGuest}
                  onChange={(e) => setPrimaryGuest(e.target.value)}
                  placeholder="Your name"
                  style={{ backgroundColor: '#2a1a2a', color: '#E8E8E8', border: '1px solid #4a3a4a', borderRadius: '0.25rem', padding: '0.75rem' }}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: '0.9rem' }}>Phone Number *</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  style={{ backgroundColor: '#2a1a2a', color: '#E8E8E8', border: '1px solid #4a3a4a', borderRadius: '0.25rem', padding: '0.75rem' }}
                />
              </div>

              {/* Errors */}
              {duplicateError && (
                <div style={{ backgroundColor: '#8B0000', color: '#FFB6C6', padding: '1rem', borderRadius: '0.25rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  {duplicateError}
                </div>
              )}
              {seatError && (
                <div style={{ backgroundColor: '#8B0000', color: '#FFB6C6', padding: '1rem', borderRadius: '0.25rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  {seatError}
                </div>
              )}

              {/* Submit */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #3a2a3a' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#999', marginBottom: '0.25rem' }}>
                    Total: {selectedSeats.length} seats × {TICKET_PRICE} EGP
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#C9A84C', fontWeight: '600' }}>
                    {selectedSeats.length * TICKET_PRICE} EGP
                  </div>
                </div>
                <Button
                  onClick={handleSubmitBooking}
                  disabled={isSubmitting}
                  style={{
                    backgroundColor: '#C9A84C', color: '#140814',
                    padding: '0.75rem 1.5rem', fontWeight: '600',
                    borderRadius: '0.25rem', border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                >
                  {isSubmitting ? 'Processing...' : 'HOLD MY SEATS'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── PAYMENT PHASE ────────────────────────────────────────────────────────
  if (phase === 3) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#140814', color: '#E8E8E8', padding: '2rem', fontFamily: 'Lato, sans-serif' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem', fontWeight: '300', letterSpacing: '0.1em',
            color: '#C9A84C', marginBottom: '2rem', textAlign: 'center',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            Complete Your Payment
          </h2>

          <div style={{
            backgroundColor: '#1a0f1a', padding: '2rem', borderRadius: '0.5rem',
            border: '1px solid #3a2a3a', marginBottom: '2rem'
          }}>
            {/* Booking Code */}
            <div style={{ backgroundColor: '#2a1a2a', padding: '1.5rem', borderRadius: '0.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Booking Code</div>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: '#C9A84C', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                {bookingCode}
              </div>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid #3a2a3a', marginBottom: '1rem' }}>
              <span style={{ color: '#999' }}>Total Amount:</span>
              <span style={{ fontSize: '1.3rem', color: '#C9A84C', fontWeight: '600' }}>{totalPrice} EGP</span>
            </div>

            {/* Hold timer */}
            <div style={{ backgroundColor: '#2a1a2a', padding: '1rem', borderRadius: '0.25rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#999', lineHeight: '1.6' }}>
              <strong style={{ color: '#C9A84C' }}>⏱️ Hold Duration:</strong> {formatTime(timeRemaining)}
              <br />
              {isLateNight
                ? `Your seats are held until ${holdUntilTime}.`
                : 'Your seats are held for 15 minutes. Complete payment before time expires.'}
            </div>

            {/* InstaPay instructions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ backgroundColor: '#2a1a2a', padding: '1rem', borderRadius: '0.25rem', fontSize: '0.9rem', color: '#E8E8E8', lineHeight: '1.6' }}>
                <strong style={{ color: '#C9A84C' }}>💳 Payment Instructions:</strong>
                <br />
                Send <strong>{totalPrice} EGP</strong> via InstaPay, then confirm below.
              </div>

              <a
                href={INSTAPAY_LINK}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  backgroundColor: '#8B5CF6', color: 'white', padding: '1rem',
                  borderRadius: '0.25rem', fontWeight: '600', textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7C3AED'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#8B5CF6'; }}
              >
                💳 Pay via InstaPay
              </a>

              <button
                onClick={() => {
                  const waMessage = `I've completed payment for booking ${bookingCode}. Total: ${totalPrice} EGP. Please confirm my reservation.`;
                  window.open(`https://wa.me/201000305053?text=${encodeURIComponent(waMessage)}`, '_blank');
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  backgroundColor: '#25D366', color: 'white', padding: '1rem',
                  borderRadius: '0.25rem', border: 'none', fontWeight: '600',
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#20BA5A'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#25D366'; }}
              >
                <MessageCircle size={20} />
                Confirm Payment on WhatsApp
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: '#2a1a2a', padding: '1rem', borderRadius: '0.25rem',
            fontSize: '0.85rem', color: '#999', lineHeight: '1.6', textAlign: 'center'
          }}>
            After payment, please confirm via WhatsApp. Your seats will be reserved once payment is verified.
          </div>
        </div>
      </div>
    );
  }

  return null;
}
