import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MessageCircle, Mail, Upload } from 'lucide-react';
import { useLocation } from 'wouter';

// Constants
const TICKET_PRICE = 500; // EGP per seat
const NORMAL_HOLD_DURATION = 900; // 15 minutes in seconds
const INSTAPAY_LINK = 'https://ipn.eg/S/h.shimi/instapay/1IXe5g';
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

// Blocked seats: only middle section of rows A, E, F
const BLOCKED_ROWS = ['A', 'E', 'F'];

// Branches with their codes
const BRANCHES = [
  { label: 'Maadi', code: 'MAD' },
  { label: 'New Cairo (The FamBam mall)', code: 'FAM' },
  { label: 'New Giza', code: 'GIZ' },
  { label: 'Sheikh Zayed', code: 'ZAY' }
];

// Types
interface Seat {
  id: string; // e.g., "A1", "A2", etc.
  row: string;
  number: number;
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

// Utility functions
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isLateNightBooking = () => {
  const cairoTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  const hour = new Date(cairoTime).getHours();
  return hour >= 22; // 10 PM or later
};

const getLateNightHoldUntil = () => {
  const cairoTime = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
  const tomorrow = new Date(cairoTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 15, 0, 0);
  return tomorrow.getTime() - new Date(cairoTime).getTime();
};

// Initialize seats: 27 seats per row (left 7, middle 13, right 7)
// Rows V-ZA have wider middle section (gate)
const initializeSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const allRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'ZA'];
  
  allRows.forEach(row => {
    for (let i = 1; i <= 27; i++) {
      const seatId = `${row}${i}`;
      let state: 'available' | 'blocked' = 'available';
      
      // Block middle seats (8-20) for rows A, E, F
      if (BLOCKED_ROWS.includes(row) && i >= 8 && i <= 20) {
        state = 'blocked';
      }
      
      seats.push({ id: seatId, row, number: i, state });
    }
  });
  
  return seats;
};

export default function Home() {
  const [location] = useLocation();
  
  // Extract show number from URL (e.g., ?show=1 → 1)
  const params = new URLSearchParams(location.split('?')[1] || '');
  const showNumber = params.get('show') || '1';
  
  // Phase state: 1 = hero, 2 = seating + form, 3 = payment
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  
  // Seating state
  const [seats, setSeats] = useState<Seat[]>(initializeSeats());
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [confirmedSeats, setConfirmedSeats] = useState<string[]>([]);
  const [pendingSeats, setPendingSeats] = useState<string[]>([]);
  
  // Booking form state
  const [phone, setPhone] = useState('');
  const [primaryGuest, setPrimaryGuest] = useState('');
  const [branch, setBranch] = useState('Maadi');
  
  // Payment state
  const [bookingCode, setBookingCode] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(NORMAL_HOLD_DURATION);
  const [isLateNight, setIsLateNight] = useState(false);
  const [holdUntilTime, setHoldUntilTime] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seatError, setSeatError] = useState('');
  const [duplicateError, setDuplicateError] = useState('');

  // Poll seat availability every 30 seconds
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
        
        if (!response.ok) {
          return;
        }
        
        const data = await response.json();
        setConfirmedSeats(data.confirmed || []);
        setPendingSeats(data.pending || []);
        
        setSeats(prevSeats => prevSeats.map(seat => {
          if (BLOCKED_ROWS.includes(seat.row) && seat.number >= 8 && seat.number <= 20) {
            return { ...seat, state: 'blocked' };
          }
          if (data.confirmed?.includes(seat.id)) return { ...seat, state: 'booked' };
          if (data.pending?.includes(seat.id)) return { ...seat, state: 'held' };
          return { ...seat, state: 'available' };
        }));
      } catch (error) {
        // Silently fail - app works with local state
      }
    };

    pollSeats();
    const interval = setInterval(pollSeats, 30000);
    return () => clearInterval(interval);
  }, [showNumber]);

  // Hold timer countdown
  useEffect(() => {
    if (phase !== 3 || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setPhase(1);
          toast.error(isLateNight ? 'Hold time expired. Please book again.' : 'Hold time expired. Please book again.');
          return NORMAL_HOLD_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phase, timeRemaining, isLateNight]);

  // Handle seat selection
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

  // Handle booking submission
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
      // Sort selected seats for consistent ordering
      const sortedSeats = [...selectedSeats].sort((a, b) => {
        if (a.row !== b.row) return a.row.localeCompare(b.row);
        return a.number - b.number;
      });

      // Build seat-guest pairs (all seats use primary guest name)
      const seatGuestPairs = sortedSeats.map(seat => ({
        seat: seat.id,
        guest: primaryGuest
      }));

      // Find branch code
      const selectedBranch = BRANCHES.find(b => b.label === branch);
      const branchCode = selectedBranch?.code || 'MAD';

      // Check for late-night booking
      const lateNight = isLateNightBooking();
      setIsLateNight(lateNight);

      // Send to Google Apps Script
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'submit',
          showNumber: parseInt(showNumber),
          primaryGuest,
          phone,
          paymentMethod: 'InstaPay',
          branch: branchCode,
          seatGuestPairs
        }),
        signal: controller.signal,
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Booking service unavailable');
      }

      const result: BookingResponse = await response.json();

      if (!result.success) {
        // Check for duplicate phone error
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

      // Success - move to payment phase
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

  // Render hero phase
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

  // Render seating + form phase
  if (phase === 2) {
    const allRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'ZA'];
    
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#140814',
        color: '#E8E8E8',
        padding: '2rem',
        fontFamily: 'Lato, sans-serif'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '300',
            letterSpacing: '0.1em',
            color: '#C9A84C',
            marginBottom: '2rem',
            textAlign: 'center',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            Select Your Seats
          </h2>

          {/* Seating Map */}
          <div style={{
            backgroundColor: '#1a0f1a',
            padding: '2rem',
            borderRadius: '0.5rem',
            marginBottom: '2rem',
            border: '1px solid #3a2a3a',
            overflowX: 'auto'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                backgroundColor: '#2a1a2a',
                borderRadius: '0.25rem',
                fontSize: '0.9rem',
                color: '#999'
              }}>
                🎭 STAGE 🎭
              </div>
            </div>

            {/* Seat map */}
            {allRows.map(row => {
              const rowSeats = seats.filter(s => s.row === row);
              if (rowSeats.length === 0) return null;
              
              // For rows V-ZA, use wider spacing for middle section (gate)
              const isWideGateRow = ['V', 'W', 'X', 'Y', 'Z', 'ZA'].includes(row);
              
              return (
                <div key={row} style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: isWideGateRow ? '3rem' : '1rem',
                  marginBottom: '0.75rem',
                  alignItems: 'center'
                }}>
                  <div style={{ width: '30px', textAlign: 'right', fontSize: '0.9rem', color: '#999', fontWeight: '600' }}>
                    {row}
                  </div>
                  
                  {/* Left section (seats 1-7) */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {rowSeats.slice(0, 7).map(seat => {
                      const isSelected = selectedSeats.some(s => s.id === seat.id);
                      let bgColor = '#2a1a2a';
                      let borderColor = '#4a3a4a';
                      let cursor = 'pointer';
                      
                      if (isSelected) {
                        bgColor = '#FFD700';
                        borderColor = '#C9A84C';
                      } else if (seat.state === 'booked') {
                        bgColor = '#8B0000';
                        borderColor = '#FF0000';
                        cursor = 'not-allowed';
                      } else if (seat.state === 'held') {
                        bgColor = '#FF6B35';
                        borderColor = '#FF8C42';
                        cursor = 'not-allowed';
                      } else if (seat.state === 'blocked') {
                        bgColor = '#1a1a1a';
                        borderColor = '#333333';
                        cursor = 'not-allowed';
                      }
                      
                      return (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          disabled={seat.state !== 'available' && seat.state !== 'selected'}
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: bgColor,
                            border: `2px solid ${borderColor}`,
                            borderRadius: '0.25rem',
                            color: isSelected ? '#140814' : '#999',
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            cursor,
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'none',
                            padding: 0
                          }}
                          onMouseEnter={(e) => {
                            if (seat.state === 'available' || seat.state === 'selected') {
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title={seat.id}
                        >
                          {seat.number}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Middle section (seats 8-20) - wider gap for gate in rows V-ZA */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {rowSeats.slice(7, 20).map(seat => {
                      const isSelected = selectedSeats.some(s => s.id === seat.id);
                      let bgColor = '#2a1a2a';
                      let borderColor = '#4a3a4a';
                      let cursor = 'pointer';
                      
                      if (isSelected) {
                        bgColor = '#FFD700';
                        borderColor = '#C9A84C';
                      } else if (seat.state === 'booked') {
                        bgColor = '#8B0000';
                        borderColor = '#FF0000';
                        cursor = 'not-allowed';
                      } else if (seat.state === 'held') {
                        bgColor = '#FF6B35';
                        borderColor = '#FF8C42';
                        cursor = 'not-allowed';
                      } else if (seat.state === 'blocked') {
                        bgColor = '#1a1a1a';
                        borderColor = '#333333';
                        cursor = 'not-allowed';
                      }
                      
                      return (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          disabled={seat.state !== 'available' && seat.state !== 'selected'}
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: bgColor,
                            border: `2px solid ${borderColor}`,
                            borderRadius: '0.25rem',
                            color: isSelected ? '#140814' : '#999',
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            cursor,
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'none',
                            padding: 0
                          }}
                          onMouseEnter={(e) => {
                            if (seat.state === 'available' || seat.state === 'selected') {
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title={seat.id}
                        >
                          {seat.number}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Right section (seats 21-27) */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {rowSeats.slice(20, 27).map(seat => {
                      const isSelected = selectedSeats.some(s => s.id === seat.id);
                      let bgColor = '#2a1a2a';
                      let borderColor = '#4a3a4a';
                      let cursor = 'pointer';
                      
                      if (isSelected) {
                        bgColor = '#FFD700';
                        borderColor = '#C9A84C';
                      } else if (seat.state === 'booked') {
                        bgColor = '#8B0000';
                        borderColor = '#FF0000';
                        cursor = 'not-allowed';
                      } else if (seat.state === 'held') {
                        bgColor = '#FF6B35';
                        borderColor = '#FF8C42';
                        cursor = 'not-allowed';
                      } else if (seat.state === 'blocked') {
                        bgColor = '#1a1a1a';
                        borderColor = '#333333';
                        cursor = 'not-allowed';
                      }
                      
                      return (
                        <button
                          key={seat.id}
                          onClick={() => handleSeatClick(seat)}
                          disabled={seat.state !== 'available' && seat.state !== 'selected'}
                          style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: bgColor,
                            border: `2px solid ${borderColor}`,
                            borderRadius: '0.25rem',
                            color: isSelected ? '#140814' : '#999',
                            fontSize: '0.65rem',
                            fontWeight: '600',
                            cursor,
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'none',
                            padding: 0
                          }}
                          onMouseEnter={(e) => {
                            if (seat.state === 'available' || seat.state === 'selected') {
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                          title={seat.id}
                        >
                          {seat.number}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '2rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#2a1a2a', border: '2px solid #4a3a4a', borderRadius: '0.25rem' }}></div>
              <span>Available</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#FFD700', border: '2px solid #C9A84C', borderRadius: '0.25rem' }}></div>
              <span>Selected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#FF6B35', border: '2px solid #FF8C42', borderRadius: '0.25rem' }}></div>
              <span>On Hold</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#8B0000', border: '2px solid #FF0000', borderRadius: '0.25rem' }}></div>
              <span>Booked</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#1a1a1a', border: '2px solid #333333', borderRadius: '0.25rem' }}></div>
              <span>Blocked</span>
            </div>
          </div>

          {selectedSeats.length > 0 && (
            <div style={{
              backgroundColor: '#1a0f1a',
              padding: '1.5rem',
              borderRadius: '0.5rem',
              marginBottom: '2rem',
              border: '1px solid #3a2a3a'
            }}>
              <h3 style={{ color: '#C9A84C', marginBottom: '1rem', fontFamily: 'Cormorant Garamond, serif' }}>
                Booking Details
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: '0.9rem' }}>
                  Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#2a1a2a',
                    color: '#E8E8E8',
                    border: '1px solid #4a3a4a',
                    borderRadius: '0.25rem',
                    fontFamily: 'Lato, sans-serif'
                  }}
                >
                  {BRANCHES.map(b => (
                    <option key={b.code} value={b.label}>{b.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: '0.9rem' }}>
                  Guest Name *
                </label>
                <Input
                  value={primaryGuest}
                  onChange={(e) => setPrimaryGuest(e.target.value)}
                  placeholder="Your name"
                  style={{
                    backgroundColor: '#2a1a2a',
                    color: '#E8E8E8',
                    border: '1px solid #4a3a4a',
                    borderRadius: '0.25rem',
                    padding: '0.75rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: '0.9rem' }}>
                  Phone Number *
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Your phone number"
                  style={{
                    backgroundColor: '#2a1a2a',
                    color: '#E8E8E8',
                    border: '1px solid #4a3a4a',
                    borderRadius: '0.25rem',
                    padding: '0.75rem'
                  }}
                />
              </div>

              {duplicateError && (
                <div style={{
                  backgroundColor: '#8B0000',
                  color: '#FFB6C6',
                  padding: '1rem',
                  borderRadius: '0.25rem',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  {duplicateError}
                </div>
              )}

              {seatError && (
                <div style={{
                  backgroundColor: '#8B0000',
                  color: '#FFB6C6',
                  padding: '1rem',
                  borderRadius: '0.25rem',
                  marginBottom: '1rem',
                  fontSize: '0.9rem'
                }}>
                  {seatError}
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #3a2a3a'
              }}>
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
                    backgroundColor: '#C9A84C',
                    color: '#140814',
                    padding: '0.75rem 1.5rem',
                    fontWeight: '600',
                    borderRadius: '0.25rem',
                    border: 'none',
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

  // Render payment phase
  if (phase === 3) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#140814',
        color: '#E8E8E8',
        padding: '2rem',
        fontFamily: 'Lato, sans-serif'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: '300',
            letterSpacing: '0.1em',
            color: '#C9A84C',
            marginBottom: '2rem',
            textAlign: 'center',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            Complete Your Payment
          </h2>

          <div style={{
            backgroundColor: '#1a0f1a',
            padding: '2rem',
            borderRadius: '0.5rem',
            border: '1px solid #3a2a3a',
            marginBottom: '2rem'
          }}>
            <div style={{
              backgroundColor: '#2a1a2a',
              padding: '1.5rem',
              borderRadius: '0.25rem',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Booking Code
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: '#C9A84C',
                fontFamily: 'monospace',
                letterSpacing: '0.1em'
              }}>
                {bookingCode}
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingBottom: '1rem',
              borderBottom: '1px solid #3a2a3a',
              marginBottom: '1rem'
            }}>
              <span style={{ color: '#999' }}>Total Amount:</span>
              <span style={{ fontSize: '1.3rem', color: '#C9A84C', fontWeight: '600' }}>
                {totalPrice} EGP
              </span>
            </div>

            <div style={{
              backgroundColor: '#2a1a2a',
              padding: '1rem',
              borderRadius: '0.25rem',
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              color: '#999',
              lineHeight: '1.6'
            }}>
              <strong style={{ color: '#C9A84C' }}>⏱️ Hold Duration:</strong> {formatTime(timeRemaining)}
              <br />
              {isLateNight 
                ? `Your seats are held until ${holdUntilTime}.`
                : 'Your seats are held for 15 minutes. Complete payment before time expires.'}
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                backgroundColor: '#2a1a2a',
                padding: '1rem',
                borderRadius: '0.25rem',
                fontSize: '0.9rem',
                color: '#E8E8E8',
                lineHeight: '1.6'
              }}>
                <strong style={{ color: '#C9A84C' }}>💳 Payment Instructions:</strong>
                <br />
                Send {totalPrice} EGP to InstaPay (details coming soon)
                <br />
                Then confirm your payment below.
              </div>

              <button
                onClick={() => {
                  const waMessage = `I've completed payment for booking ${bookingCode}. Total: ${totalPrice} EGP. Please confirm my reservation.`;
                  window.open(`https://wa.me/201000305053?text=${encodeURIComponent(waMessage)}`, '_blank');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#25D366',
                  color: 'white',
                  padding: '1rem',
                  borderRadius: '0.25rem',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#20BA5A';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#25D366';
                }}
              >
                <MessageCircle size={20} />
                Confirm Payment on WhatsApp
              </button>
            </div>
          </div>

          <div style={{
            backgroundColor: '#2a1a2a',
            padding: '1rem',
            borderRadius: '0.25rem',
            fontSize: '0.85rem',
            color: '#999',
            lineHeight: '1.6',
            textAlign: 'center'
          }}>
            After payment, please confirm via WhatsApp. Your seats will be reserved once payment is verified.
          </div>
        </div>
      </div>
    );
  }

  return null;
}
