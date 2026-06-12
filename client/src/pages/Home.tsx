import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MessageCircle, Mail, Upload } from 'lucide-react';
import { useLocation } from 'wouter';

// Constants
const TICKET_PRICE = 500; // EGP per seat (updated from 350)
const HOLD_DURATION = 900; // 15 minutes in seconds
const INSTAPAY_LINK = 'https://ipn.eg/S/h.shimi/instapay/1IXe5g';
const SUPPORT_EMAIL = 'hamdielshimi@gmail.com';
const HERO_IMAGE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663340831653/2Ktp4TNevcqWNNpdcRjkGW/peter-pan-hero-bg-LQ9yMucFTHQFuH579545zp.webp';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx-_cUJZdu9ZSNvkyCDh3WA3DjCtzFLlT86FwiMcgllcrkhnBH1YoUXqSC4AfRf4-tT/exec';

// Types
interface Seat {
  row: string;
  number: number;
  state: 'available' | 'selected' | 'held' | 'booked';
}

interface BookingResponse {
  success: boolean;
  code?: string;
  totalPrice?: number;
  totalSeats?: number;
  whatsappLink?: string;
  error?: string;
}

// Utility functions
const generateBookingCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Initialize seats with right-to-left numbering (seat 1 on right, seat 22 on left)
const initializeSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  
  for (const row of rows) {
    for (let i = 1; i <= 22; i++) {
      seats.push({ row, number: i, state: 'available' });
    }
  }
  
  return seats;
};

export default function Home() {
  const [location] = useLocation();
  
  // Extract show number from URL (e.g., /show1 → 1)
  const showNumber = location.match(/show(\d+)/)?.[1] || '1';
  
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
  const [companionNames, setCompanionNames] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'InstaPay' | 'Cash'>('InstaPay');
  
  // Payment state
  const [bookingCode, setBookingCode] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(HOLD_DURATION);
  const [paymentTabOpened, setPaymentTabOpened] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');
  
  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seatError, setSeatError] = useState('');

  // Poll seat availability every 30 seconds
  useEffect(() => {
    const pollSeats = async () => {
      try {
        const response = await fetch(`${GAS_URL}?show=${showNumber}`);
        const data = await response.json();
        setConfirmedSeats(data.confirmed || []);
        setPendingSeats(data.pending || []);
        
        // Update seat states
        setSeats(prevSeats => prevSeats.map(seat => {
          const seatLabel = `${seat.row}${seat.number}`;
          if (data.confirmed?.includes(seatLabel)) return { ...seat, state: 'booked' };
          if (data.pending?.includes(seatLabel)) return { ...seat, state: 'held' };
          return { ...seat, state: 'available' };
        }));
      } catch (error) {
        console.error('Failed to poll seats:', error);
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
      setTimeRemaining(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [phase, timeRemaining]);

  // Handle seat click
  const handleSeatClick = (seat: Seat) => {
    if (seat.state === 'held' || seat.state === 'booked') return;
    
    setSeatError('');
    
    if (seat.state === 'selected') {
      setSelectedSeats(selectedSeats.filter(s => s !== seat));
      setSeats(seats.map(s => s === seat ? { ...s, state: 'available' } : s));
      setCompanionNames(companionNames.slice(0, selectedSeats.length - 2));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
      setSeats(seats.map(s => s === seat ? { ...s, state: 'selected' } : s));
      if (selectedSeats.length > 0) {
        setCompanionNames([...companionNames, '']);
      }
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

    if (companionNames.some(name => !name.trim())) {
      toast.error('Please fill all companion names');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Sort selected seats for consistent ordering
      const sortedSeats = [...selectedSeats].sort((a, b) => {
        if (a.row !== b.row) return a.row.localeCompare(b.row);
        return a.number - b.number;
      });

      // Build seat-guest pairs
      const seatGuestPairs = [
        { seat: `${sortedSeats[0].row}${sortedSeats[0].number}`, guest: primaryGuest },
        ...companionNames.map((name, idx) => ({
          seat: `${sortedSeats[idx + 1].row}${sortedSeats[idx + 1].number}`,
          guest: name
        }))
      ];

      // Send to Google Apps Script
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          showNumber: parseInt(showNumber),
          primaryGuest,
          phone,
          paymentMethod,
          seatGuestPairs
        })
      });

      const result: BookingResponse = await response.json();

      if (!result.success) {
        setSeatError(result.error || 'Booking failed. Some seats may have been taken.');
        toast.error('Booking failed');
        setIsSubmitting(false);
        return;
      }

      // Success - move to payment phase
      setBookingCode(result.code || generateBookingCode());
      setTotalPrice(result.totalPrice || selectedSeats.length * TICKET_PRICE);
      setWhatsappLink(result.whatsappLink || '');
      setTimeRemaining(HOLD_DURATION);
      setPhase(3);
      toast.success('Booking saved! Proceeding to payment...');
    } catch (error) {
      console.error('Booking error:', error);
      setSeatError('Network error. Please try again.');
      toast.error('Failed to submit booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Phase 1: Hero
  if (phase === 1) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        <div style={{ textAlign: 'center', color: 'white', zIndex: 10 }}>
          <h1 style={{ fontSize: '64px', fontFamily: 'Cormorant Garamond', fontWeight: 'bold', color: '#C9A84C', marginBottom: '20px' }}>
            Peter Pan Ballet Gala
          </h1>
          <p style={{ fontSize: '20px', marginBottom: '40px', maxWidth: '600px', margin: '0 auto 40px' }}>
            Experience the magic of Neverland. Reserve your premium seat for an unforgettable evening.
          </p>
          <Button
            onClick={() => setPhase(2)}
            style={{
              backgroundColor: '#C9A84C',
              color: '#1A0911',
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            RESERVE YOUR SEAT →
          </Button>
        </div>

        {/* WhatsApp button - BOTTOM LEFT */}
        <a
          href={`https://wa.me/201000305053?text=Hi, I need help with seat booking`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            width: '56px',
            height: '56px',
            backgroundColor: '#25D366',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          <MessageCircle size={28} color="white" />
        </a>
      </div>
    );
  }

  // Phase 2: Seating + Form
  if (phase === 2) {
    const isFormValid = phone.trim() && primaryGuest.trim() && selectedSeats.length > 0 && 
                       companionNames.every(name => name.trim()) && 
                       phone.replace(/\D/g, '').length >= 10;

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1A0911', color: '#E5D4C1', padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <h1 style={{ fontSize: '48px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', marginBottom: '10px', textAlign: 'center' }}>
            Show {showNumber} — Select Your Seats
          </h1>
          <p style={{ textAlign: 'center', fontSize: '16px', marginBottom: '40px', color: '#A89968' }}>
            Theater Seating Map
          </p>

          {/* Seating Map */}
          <div style={{ backgroundColor: '#2D1B24', padding: '30px', borderRadius: '8px', marginBottom: '40px', overflowX: 'auto' }}>
            {/* Stage */}
            <div style={{ textAlign: 'center', marginBottom: '30px', fontSize: '18px', color: '#C9A84C', fontWeight: 'bold' }}>
              ◆ STAGE ◆
            </div>

            {/* Rows */}
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].map(row => (
              <div key={row} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', justifyContent: 'center', gap: '8px' }}>
                {/* Left label */}
                <div style={{ width: '30px', textAlign: 'right', fontSize: '14px', color: '#A89968', fontWeight: 'bold' }}>
                  {row}
                </div>

                {/* Seats - REVERSED ORDER (22 to 1, so 1 is on right) */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {Array.from({ length: 22 }, (_, i) => {
                    const seatNum = 22 - i; // Reverse: 22, 21, 20, ..., 1
                    const seat = seats.find(s => s.row === row && s.number === seatNum);
                    if (!seat) return null;

                    const isSelected = seat.state === 'selected';
                    const isHeld = seat.state === 'held';
                    const isBooked = seat.state === 'booked';

                    let bgColor = '#14B8A6'; // available - teal
                    let borderColor = '#14B8A6';
                    let textColor = '#1A0911';
                    let boxShadow = 'none';
                    let cursor = 'pointer';

                    if (isSelected) {
                      bgColor = '#C9A84C'; // selected - gold
                      borderColor = '#C9A84C';
                      textColor = '#1A0911';
                      boxShadow = '0 0 12px rgba(201, 168, 76, 0.6)'; // gold glow
                    } else if (isHeld) {
                      bgColor = '#6B5B5B'; // held - gray
                      borderColor = '#6B5B5B';
                      textColor = '#E5D4C1';
                      cursor = 'not-allowed';
                    } else if (isBooked) {
                      bgColor = '#8B2C3B'; // booked - dark red
                      borderColor = '#8B2C3B';
                      textColor = '#E5D4C1';
                      cursor = 'not-allowed';
                    }

                    return (
                      <button
                        key={`${row}${seatNum}`}
                        onClick={() => handleSeatClick(seat)}
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: bgColor,
                          border: `2px solid ${borderColor}`,
                          borderRadius: '4px',
                          color: textColor,
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor,
                          boxShadow,
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        disabled={isHeld || isBooked}
                      >
                        {seatNum}
                      </button>
                    );
                  })}
                </div>

                {/* Right label */}
                <div style={{ width: '30px', textAlign: 'left', fontSize: '14px', color: '#A89968', fontWeight: 'bold' }}>
                  {row}
                </div>
              </div>
            ))}
          </div>

          {/* Selection Summary */}
          <div style={{ backgroundColor: '#2D1B24', padding: '16px', borderRadius: '8px', marginBottom: '30px', textAlign: 'center', fontSize: '16px', color: '#C9A84C', fontWeight: 'bold' }}>
            Selected: {selectedSeats.length} seats · Total: EGP {selectedSeats.length * TICKET_PRICE}
          </div>

          {/* Error message */}
          {seatError && (
            <div style={{ backgroundColor: '#8B2C3B', color: '#E5D4C1', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              {seatError}
            </div>
          )}

          {/* Booking Form - appears after seat selection */}
          {selectedSeats.length > 0 && (
            <div style={{ backgroundColor: '#2D1B24', padding: '30px', borderRadius: '8px' }}>
              <h2 style={{ fontSize: '24px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', marginBottom: '20px' }}>
                Guest Details
              </h2>

              {/* Contact Phone */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Contact Person Phone Number *
                </label>
                <Input
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    backgroundColor: '#1A0911',
                    color: '#E5D4C1',
                    border: '2px solid #C9A84C',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Primary Guest */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                  Primary Guest Name * — Seat {selectedSeats[0]?.row}{selectedSeats[0]?.number}
                </label>
                <Input
                  placeholder="Guest name"
                  value={primaryGuest}
                  onChange={(e) => setPrimaryGuest(e.target.value)}
                  style={{
                    backgroundColor: '#1A0911',
                    color: '#E5D4C1',
                    border: '2px solid #C9A84C',
                    padding: '10px',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Companion Names */}
              {companionNames.map((name, idx) => (
                <div key={idx} style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                    Companion {idx + 1} — Seat {selectedSeats[idx + 1]?.row}{selectedSeats[idx + 1]?.number}
                  </label>
                  <Input
                    placeholder="Companion name"
                    value={name}
                    onChange={(e) => {
                      const newNames = [...companionNames];
                      newNames[idx] = e.target.value;
                      setCompanionNames(newNames);
                    }}
                    style={{
                      backgroundColor: '#1A0911',
                      color: '#E5D4C1',
                      border: '2px solid #C9A84C',
                      padding: '10px',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}

              {/* Payment Method */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                  Payment Method *
                </label>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="payment"
                      value="InstaPay"
                      checked={paymentMethod === 'InstaPay'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'InstaPay' | 'Cash')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>💳 InstaPay</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="payment"
                      value="Cash"
                      checked={paymentMethod === 'Cash'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'InstaPay' | 'Cash')}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>💵 Cash</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitBooking}
                disabled={!isFormValid || isSubmitting}
                style={{
                  width: '100%',
                  backgroundColor: isFormValid ? '#14B8A6' : '#6B5B5B',
                  color: '#1A0911',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  border: '2px solid #C9A84C',
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT BOOKING'}
              </Button>
            </div>
          )}
        </div>

        {/* WhatsApp button - BOTTOM LEFT */}
        <a
          href={`https://wa.me/201000305053?text=Hi, I need help with seat booking`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            width: '56px',
            height: '56px',
            backgroundColor: '#25D366',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          <MessageCircle size={28} color="white" />
        </a>
      </div>
    );
  }

  // Phase 3: Payment
  if (phase === 3) {
    const sortedSeats = [...selectedSeats].sort((a, b) => {
      if (a.row !== b.row) return a.row.localeCompare(b.row);
      return a.number - b.number;
    });

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1A0911', color: '#E5D4C1', padding: '40px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Booking Summary */}
          <div style={{ backgroundColor: '#2D1B24', padding: '30px', borderRadius: '8px', marginBottom: '30px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '24px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', marginBottom: '20px' }}>
              ✅ Your seats are held for 15 minutes
            </h2>

            <div style={{ backgroundColor: '#1A0911', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', color: '#A89968', marginBottom: '8px' }}>Booking Code</p>
              <p style={{ fontSize: '32px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', fontWeight: 'bold', wordBreak: 'break-all' }}>
                {bookingCode}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(bookingCode);
                  toast.success('Booking code copied!');
                }}
                style={{
                  marginTop: '12px',
                  backgroundColor: 'transparent',
                  border: '1px solid #C9A84C',
                  color: '#C9A84C',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Copy Code
              </button>
            </div>

            {/* Seat List */}
            <div style={{ textAlign: 'left', backgroundColor: '#1A0911', padding: '16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
              {sortedSeats.map((seat, idx) => (
                <div key={idx} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{seat.row}{seat.number}</span>
                  <span style={{ color: '#A89968' }}>
                    {idx === 0 ? primaryGuest : companionNames[idx - 1]}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#C9A84C', marginBottom: '20px' }}>
              Total: EGP {totalPrice}
            </div>

            {/* Timer */}
            <div style={{ fontSize: '24px', fontFamily: 'Cormorant Garamond', color: timeRemaining <= 120 ? '#8B2C3B' : '#14B8A6', fontWeight: 'bold' }}>
              {formatTime(timeRemaining)}
            </div>
          </div>

          {/* Payment Instructions */}
          {paymentMethod === 'InstaPay' ? (
            <>
              <div style={{ backgroundColor: '#2D1B24', padding: '20px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', lineHeight: '1.8' }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong>Payment Instructions:</strong>
                </p>
                <ol style={{ marginLeft: '20px', marginBottom: '12px' }}>
                  <li>Click the button below to open InstaPay</li>
                  <li>Send EGP {totalPrice} to <strong>h.shimi@instapay</strong></li>
                  <li>Take a screenshot of your payment receipt</li>
                  <li>Come back here and click the WhatsApp button below</li>
                  <li>Send the pre-filled WhatsApp message with your receipt screenshot</li>
                </ol>
              </div>

              <Button
                onClick={() => {
                  window.open(INSTAPAY_LINK, '_blank');
                  setPaymentTabOpened(true);
                }}
                style={{
                  width: '100%',
                  backgroundColor: '#14B8A6',
                  color: '#1A0911',
                  padding: '12px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}
              >
                {paymentTabOpened ? '✓ Payment Tab Opened — Come back here' : 'Pay via InstaPay →'}
              </Button>

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    backgroundColor: '#25D366',
                    color: 'white',
                    padding: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  📲 Send Payment Confirmation on WhatsApp
                </a>
              )}
            </>
          ) : (
            <div style={{ backgroundColor: '#2D1B24', padding: '20px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.8' }}>
              <p style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 'bold', color: '#C9A84C' }}>
                ✅ Your seats are held for 15 minutes
              </p>
              <p style={{ marginBottom: '12px' }}>
                Please give this code to the receptionist at the front desk:
              </p>
              <p style={{ fontSize: '24px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', fontWeight: 'bold', marginBottom: '12px' }}>
                {bookingCode}
              </p>
              <p>
                They will confirm your booking once you pay cash.
              </p>
            </div>
          )}
        </div>

        {/* WhatsApp button - BOTTOM LEFT */}
        <a
          href={`https://wa.me/201000305053?text=Hi, I need help with seat booking`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            width: '56px',
            height: '56px',
            backgroundColor: '#25D366',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 50,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        >
          <MessageCircle size={28} color="white" />
        </a>
      </div>
    );
  }

  return null;
}
