import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MessageCircle, Mail, Upload } from 'lucide-react';
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
}

export default function Home() {
  const [location, navigate] = useLocation();
  const [phase, setPhase] = React.useState(1);
  const [seats, setSeats] = React.useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = React.useState<Seat[]>([]);
  const [branch, setBranch] = React.useState('MAD');
  const [guestName, setGuestName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [holdTimeLeft, setHoldTimeLeft] = React.useState(NORMAL_HOLD_DURATION);
  const [bookingCode, setBookingCode] = React.useState('');
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Get show number from URL
  const showNumber = React.useMemo(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    return parseInt(params.get('show') || '1', 10);
  }, [location]);

  // Initialize seats
  React.useEffect(() => {
    pollSeats();
    const interval = setInterval(pollSeats, 30000);
    return () => clearInterval(interval);
  }, [showNumber]);

  // Poll for seat availability
  const pollSeats = async () => {
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'getSeats', show: showNumber }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) throw new Error('Failed to fetch seats');
      const data = await response.json();

      if (data.seats) {
        const parsedSeats: Seat[] = data.seats.map((s: any) => ({
          id: s.id,
          row: s.row,
          number: s.number,
          state: s.state
        }));
        setSeats(parsedSeats);
      }
    } catch (error) {
      // Silently fail - use local state
    }
  };

  // Hold timer countdown
  React.useEffect(() => {
    if (phase !== 3 || holdTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setHoldTimeLeft(prev => {
        if (prev <= 1) {
          setPhase(1);
          toast.error('Hold expired. Please book again.');
          return NORMAL_HOLD_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, holdTimeLeft]);

  const handleSeatClick = (seat: Seat) => {
    if (seat.state !== 'available' && seat.state !== 'selected') return;

    setSelectedSeats(prev => {
      const isSelected = prev.some(s => s.id === seat.id);
      if (isSelected) {
        return prev.filter(s => s.id !== seat.id);
      } else {
        return [...prev, seat];
      }
    });
  };

  const handleHoldSeats = async () => {
    if (!guestName.trim() || !phone.trim() || selectedSeats.length === 0) {
      toast.error('Please fill all fields and select at least one seat');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'holdSeats',
          show: showNumber,
          seats: selectedSeats.map(s => s.id),
          guestName,
          phone,
          branch
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) throw new Error('Failed to hold seats');
      const data: BookingResponse = await response.json();

      if (data.success && data.code) {
        setBookingCode(data.code);
        setPhase(3);
        setHoldTimeLeft(NORMAL_HOLD_DURATION);
      } else {
        toast.error('Failed to hold seats. Please try again.');
      }
    } catch (error) {
      toast.error('Error holding seats. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!receiptFile) {
      toast.error('Please upload a receipt');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('action', 'confirmPayment');
      formData.append('bookingCode', bookingCode);
      formData.append('receipt', receiptFile);

      const response = await fetch(GAS_URL, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) throw new Error('Failed to confirm payment');
      const data = await response.json();

      if (data.success) {
        setPhase(4);
        toast.success('Booking confirmed!');
      } else {
        toast.error('Failed to confirm payment');
      }
    } catch (error) {
      toast.error('Error confirming payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 1: Hero
  if (phase === 1) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundImage: `url(${HERO_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(20, 8, 20, 0.4)',
          zIndex: 1
        }}></div>

        <div style={{
          position: 'relative',
          zIndex: 2,
          textAlign: 'center',
          padding: '2rem'
        }}>
          <h1 style={{
            fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
            fontWeight: '300',
            letterSpacing: '0.15em',
            color: '#C9A84C',
            marginBottom: '1rem',
            fontFamily: 'Cormorant Garamond, serif',
            textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)'
          }}>
            Peter Pan Ballet Gala
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.5rem)',
            color: '#E8E8E8',
            marginBottom: '1.5rem',
            fontFamily: 'Lato, sans-serif',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)'
          }}>
            {SHOW_DATES[showNumber]}
          </p>

          <p style={{
            fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
            color: '#D0D0D0',
            marginBottom: '2rem',
            maxWidth: '600px',
            margin: '0 auto 2rem',
            fontFamily: 'Lato, sans-serif',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)'
          }}>
            Experience the magic of Neverland. Reserve your premium seat for an unforgettable evening.
          </p>

          <Button
            onClick={() => setPhase(2)}
            style={{
              backgroundColor: '#C9A84C',
              color: '#140814',
              padding: '1rem 2rem',
              fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
              fontWeight: '600',
              borderRadius: '0.25rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(201, 168, 76, 0.3)',
              fontFamily: 'Lato, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D4B86A';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 168, 76, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#C9A84C';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(201, 168, 76, 0.3)';
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
        padding: 'clamp(1rem, 5vw, 2rem)',
        fontFamily: 'Lato, sans-serif'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
            fontWeight: '300',
            letterSpacing: '0.1em',
            color: '#C9A84C',
            marginBottom: '1.5rem',
            textAlign: 'center',
            fontFamily: 'Cormorant Garamond, serif'
          }}>
            Select Your Seats
          </h2>

          {/* Seating Map */}
          <div style={{
            backgroundColor: '#1a0f1a',
            padding: 'clamp(1rem, 4vw, 2rem)',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
            border: '1px solid #3a2a3a',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                backgroundColor: '#2a1a2a',
                borderRadius: '0.25rem',
                fontSize: 'clamp(0.75rem, 2vw, 0.9rem)',
                color: '#999'
              }}>
                🎭 STAGE 🎭
              </div>
            </div>

            {/* Seat map */}
            {allRows.map(row => {
              const rowSeats = seats.filter(s => s.row === row);
              if (rowSeats.length === 0) return null;
              
              // For rows V-ZA, remove middle section and show "The Gate"
              const isGateRow = ['V', 'W', 'X', 'Y', 'Z', 'ZA'].includes(row);
              
              return (
                <div key={row} style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: isGateRow ? '2rem' : '0.5rem',
                  marginBottom: '0.5rem',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ 
                    width: '30px', 
                    textAlign: 'right', 
                    fontSize: 'clamp(0.7rem, 2vw, 0.9rem)', 
                    color: '#999', 
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {row}
                  </div>
                  
                  {/* Left section (seats 1-9 for gate rows, 1-7 for others) */}
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {(isGateRow ? rowSeats.slice(0, 9) : rowSeats.slice(0, 7)).map(seat => {
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
                            width: 'clamp(24px, 4vw, 32px)',
                            height: 'clamp(24px, 4vw, 32px)',
                            backgroundColor: bgColor,
                            border: `2px solid ${borderColor}`,
                            borderRadius: '0.25rem',
                            color: isSelected ? '#140814' : '#999',
                            fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                            fontWeight: '600',
                            cursor,
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'none',
                            padding: 0,
                            flexShrink: 0
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
                  
                  {/* Gate label for rows V-ZA, middle section for others */}
                  {isGateRow ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '80px',
                      height: 'clamp(24px, 4vw, 32px)',
                      fontSize: 'clamp(0.7rem, 2vw, 0.85rem)',
                      color: '#999',
                      fontWeight: '600',
                      fontStyle: 'italic',
                      flexShrink: 0
                    }}>
                      🚪 The Gate
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
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
                              width: 'clamp(24px, 4vw, 32px)',
                              height: 'clamp(24px, 4vw, 32px)',
                              backgroundColor: bgColor,
                              border: `2px solid ${borderColor}`,
                              borderRadius: '0.25rem',
                              color: isSelected ? '#140814' : '#999',
                              fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                              fontWeight: '600',
                              cursor,
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'none',
                              padding: 0,
                              flexShrink: 0
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
                  )}
                  
                  {/* Right section (seats 19-27 for gate rows, 21-27 for others) */}
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    {(isGateRow ? rowSeats.slice(18, 27) : rowSeats.slice(20, 27)).map(seat => {
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
                            width: 'clamp(24px, 4vw, 32px)',
                            height: 'clamp(24px, 4vw, 32px)',
                            backgroundColor: bgColor,
                            border: `2px solid ${borderColor}`,
                            borderRadius: '0.25rem',
                            color: isSelected ? '#140814' : '#999',
                            fontSize: 'clamp(0.5rem, 1.5vw, 0.65rem)',
                            fontWeight: '600',
                            cursor,
                            transition: 'all 0.2s ease',
                            boxShadow: isSelected ? '0 0 12px rgba(255, 215, 0, 0.5)' : 'none',
                            padding: 0,
                            flexShrink: 0
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
            gap: 'clamp(1rem, 3vw, 2rem)',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            fontSize: 'clamp(0.75rem, 2vw, 0.9rem)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#2a1a2a', border: '2px solid #4a3a4a', borderRadius: '0.25rem' }}></div>
              <span>Available</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#FFD700', border: '2px solid #C9A84C', borderRadius: '0.25rem' }}></div>
              <span>Selected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#FF6B35', border: '2px solid #FF8C42', borderRadius: '0.25rem' }}></div>
              <span>On Hold</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '16px', height: '16px', backgroundColor: '#8B0000', border: '2px solid #FF0000', borderRadius: '0.25rem' }}></div>
              <span>Booked</span>
            </div>
          </div>

          {selectedSeats.length > 0 && (
            <div style={{
              backgroundColor: '#1a0f1a',
              padding: 'clamp(1rem, 3vw, 1.5rem)',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              border: '1px solid #3a2a3a'
            }}>
              <h3 style={{ color: '#C9A84C', marginBottom: '1rem', fontFamily: 'Cormorant Garamond, serif', fontSize: 'clamp(1.1rem, 3vw, 1.3rem)' }}>
                Booking Details
              </h3>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
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
                    fontFamily: 'Lato, sans-serif',
                    fontSize: 'clamp(0.8rem, 2vw, 0.9rem)'
                  }}
                >
                  {BRANCHES.map(b => (
                    <option key={b.code} value={b.code}>{b.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
                  Guest Name
                </label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#2a1a2a',
                    color: '#E8E8E8',
                    border: '1px solid #4a3a4a',
                    borderRadius: '0.25rem',
                    fontFamily: 'Lato, sans-serif',
                    fontSize: 'clamp(0.8rem, 2vw, 0.9rem)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#999', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
                  Phone Number
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+20 XXX XXX XXXX"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: '#2a1a2a',
                    color: '#E8E8E8',
                    border: '1px solid #4a3a4a',
                    borderRadius: '0.25rem',
                    fontFamily: 'Lato, sans-serif',
                    fontSize: 'clamp(0.8rem, 2vw, 0.9rem)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ color: '#C9A84C', fontWeight: '600', fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}>
                  Selected Seats: {selectedSeats.map(s => s.id).join(', ')}
                </p>
                <p style={{ color: '#999', marginTop: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
                  Total: {selectedSeats.length} seat(s) × {TICKET_PRICE} EGP = <span style={{ color: '#C9A84C', fontWeight: '600' }}>{selectedSeats.length * TICKET_PRICE} EGP</span>
                </p>
              </div>

              <Button
                onClick={handleHoldSeats}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  backgroundColor: '#C9A84C',
                  color: '#140814',
                  padding: '0.75rem',
                  fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
                  fontWeight: '600',
                  borderRadius: '0.25rem',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSubmitting ? 0.6 : 1,
                  fontFamily: 'Lato, sans-serif'
                }}
              >
                {isSubmitting ? 'Processing...' : 'HOLD MY SEATS'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Phase 3: Hold timer
  if (phase === 3) {
    const minutes = Math.floor(holdTimeLeft / 60);
    const seconds = holdTimeLeft % 60;
    const totalPrice = selectedSeats.length * TICKET_PRICE;

    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#140814',
        color: '#E8E8E8',
        padding: 'clamp(1rem, 5vw, 2rem)',
        fontFamily: 'Lato, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ maxWidth: '600px', width: '100%' }}>
          <div style={{
            backgroundColor: '#1a0f1a',
            padding: 'clamp(1.5rem, 5vw, 2rem)',
            borderRadius: '0.5rem',
            border: '1px solid #3a2a3a',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: '300',
              letterSpacing: '0.1em',
              color: '#C9A84C',
              marginBottom: '1.5rem',
              fontFamily: 'Cormorant Garamond, serif'
            }}>
              Booking Code: {bookingCode}
            </h2>

            <div style={{
              backgroundColor: '#2a1a2a',
              padding: '1.5rem',
              borderRadius: '0.25rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ color: '#999', marginBottom: '0.5rem', fontSize: 'clamp(0.8rem, 2vw, 0.9rem)' }}>
                Time Remaining
              </p>
              <p style={{
                fontSize: 'clamp(2rem, 6vw, 3rem)',
                fontWeight: '600',
                color: holdTimeLeft < 300 ? '#FF6B35' : '#C9A84C',
                fontFamily: 'Lato, sans-serif'
              }}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </p>
            </div>

            <div style={{
              backgroundColor: '#2a1a2a',
              padding: '1rem',
              borderRadius: '0.25rem',
              fontSize: '0.9rem',
              color: '#E8E8E8',
              lineHeight: '1.6',
              marginBottom: '1.5rem'
            }}>
              <strong style={{ color: '#C9A84C' }}>💳 Payment Instructions:</strong>
              <br />
              Send {totalPrice} EGP via InstaPay using the button below.
              <br />
              After payment, confirm via WhatsApp.
            </div>

            <a
              href={INSTAPAY_LINK}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                backgroundColor: '#FF6B35',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '0.25rem',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textDecoration: 'none',
                marginBottom: '0.5rem',
                fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
                fontFamily: 'Lato, sans-serif'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FF5722';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FF6B35';
              }}
            >
              💳 Pay Now via InstaPay
            </a>

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
                padding: '0.75rem',
                borderRadius: '0.25rem',
                border: 'none',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
                fontFamily: 'Lato, sans-serif'
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

          <div style={{
            backgroundColor: '#2a1a2a',
            padding: '1rem',
            borderRadius: '0.25rem',
            fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
            color: '#999',
            lineHeight: '1.6',
            textAlign: 'center',
            marginTop: '1rem'
          }}>
            <p>Your seats are held for {minutes}:{String(seconds).padStart(2, '0')}. After this time, your reservation will be released.</p>
          </div>
        </div>
      </div>
    );
  }

  // Phase 4: Confirmation
  if (phase === 4) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#140814',
        color: '#E8E8E8',
        padding: 'clamp(1rem, 5vw, 2rem)',
        fontFamily: 'Lato, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <div style={{
            backgroundColor: '#1a0f1a',
            padding: 'clamp(1.5rem, 5vw, 2rem)',
            borderRadius: '0.5rem',
            border: '1px solid #3a2a3a'
          }}>
            <h2 style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: '300',
              letterSpacing: '0.1em',
              color: '#C9A84C',
              marginBottom: '1rem',
              fontFamily: 'Cormorant Garamond, serif'
            }}>
              ✨ Booking Confirmed!
            </h2>

            <p style={{
              fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              color: '#E8E8E8',
              marginBottom: '1.5rem'
            }}>
              Your reservation has been confirmed. Check your WhatsApp for details.
            </p>

            <Button
              onClick={() => {
                setPhase(1);
                setSelectedSeats([]);
                setGuestName('');
                setPhone('');
                setBookingCode('');
              }}
              style={{
                backgroundColor: '#C9A84C',
                color: '#140814',
                padding: '0.75rem 1.5rem',
                fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
                fontWeight: '600',
                borderRadius: '0.25rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: 'Lato, sans-serif'
              }}
            >
              Book Another Show
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
