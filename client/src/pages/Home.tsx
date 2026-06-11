import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { MessageCircle, Mail, Upload } from 'lucide-react';

// Constants
const TICKET_PRICE = 350; // EGP per seat
const HOLD_DURATION = 600; // 10 minutes in seconds
const EXTENSION_DURATION = 300; // 5 minutes in seconds
const LOCK_DURATION = 1800; // 30 minutes in seconds
const INSTAPAY_LINK = 'https://ipn.eg/S/h.shimi/instapay/1IXe5g';
const WHATSAPP_NUMBER = '201000305053';
const SUPPORT_EMAIL = 'hamdielshimi@gmail.com';
const HERO_IMAGE = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663340831653/2Ktp4TNevcqWNNpdcRjkGW/peter-pan-hero-bg-LQ9yMucFTHQFuH579545zp.webp';

// Types
interface Seat {
  row: string;
  number: number;
  state: 'available' | 'selected' | 'held' | 'booked';
}

// Utility functions
const generateSessionToken = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getTimerColor = (seconds: number) => {
  if (seconds <= 120) return '#8B2C3B';
  if (seconds <= 300) return '#D97706';
  return '#14B8A6';
};

// Initialize test data
const initializeSeats = (): Seat[] => {
  const seats: Seat[] = [];
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  
  for (const row of rows) {
    for (let i = 1; i <= 22; i++) {
      let state: 'available' | 'held' | 'booked' = 'available';
      
      // Pre-populate test data
      if (['C', 'D', 'E', 'F'].includes(row) && i <= 8) {
        state = 'held';
      } else if (['A', 'B'].includes(row) && i <= 4) {
        state = 'booked';
      }
      
      seats.push({ row, number: i, state });
    }
  }
  
  return seats;
};

export default function Home() {
  // Phase state
  const [phase, setPhase] = useState<1 | 2 | 3 | 4>(1);
  
  // Seating state
  const [seats, setSeats] = useState<Seat[]>(initializeSeats());
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  
  // Booking form state
  const [leadBookerName, setLeadBookerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [guestNames, setGuestNames] = useState<string[]>([]);
  
  // Hold timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isHoldActive, setIsHoldActive] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [extensionUsed, setExtensionUsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTabOpened, setPaymentTabOpened] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Check for existing lock on mount
  useEffect(() => {
    const storedLockExpiration = localStorage.getItem('lockExpiration');
    const storedSessionToken = localStorage.getItem('sessionToken');
    
    if (storedLockExpiration) {
      const lockExpiration = parseInt(storedLockExpiration);
      const now = Date.now();
      
      if (now < lockExpiration) {
        setIsLocked(true);
        setSessionToken(storedSessionToken || '');
        setLockTimeRemaining(Math.ceil((lockExpiration - now) / 1000));
      } else {
        localStorage.removeItem('lockExpiration');
        localStorage.removeItem('sessionToken');
      }
    }
  }, []);

  // Lock timer countdown
  useEffect(() => {
    if (!isLocked || lockTimeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setLockTimeRemaining(prev => {
        if (prev <= 1) {
          setIsLocked(false);
          localStorage.removeItem('lockExpiration');
          localStorage.removeItem('sessionToken');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isLocked, lockTimeRemaining]);

  // Hold timer countdown
  useEffect(() => {
    if (!isHoldActive || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Hold expired - enter locked state
          const token = sessionToken;
          const lockExpiration = Date.now() + LOCK_DURATION * 1000;
          localStorage.setItem('lockExpiration', lockExpiration.toString());
          localStorage.setItem('sessionToken', token);
          
          setIsHoldActive(false);
          setIsLocked(true);
          setLockTimeRemaining(LOCK_DURATION);
          setPhase(1);
          
          toast.error('Your booking session has expired. Please try again after the lock period.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isHoldActive, timeRemaining, sessionToken]);

  // Handle seat click
  const handleSeatClick = (seat: Seat) => {
    if (seat.state === 'held' || seat.state === 'booked') return;
    
    if (seat.state === 'selected') {
      setSelectedSeats(selectedSeats.filter(s => s !== seat));
      setSeats(seats.map(s => s === seat ? { ...s, state: 'available' } : s));
      setGuestNames(guestNames.slice(0, selectedSeats.length - 2));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
      setSeats(seats.map(s => s === seat ? { ...s, state: 'selected' } : s));
      setGuestNames([...guestNames, '']);
    }
  };

  // Handle hold seats
  const handleHoldSeats = () => {
    if (!leadBookerName.trim() || !whatsappNumber.trim() || selectedSeats.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }
    
    if (whatsappNumber.replace(/\D/g, '').length < 10) {
      toast.error('WhatsApp number must be at least 10 digits');
      return;
    }
    
    if (guestNames.some(name => !name.trim())) {
      toast.error('Please fill all guest names');
      return;
    }
    
    const token = generateSessionToken();
    setSessionToken(token);
    setTimeRemaining(HOLD_DURATION);
    setIsHoldActive(true);
    setExtensionUsed(false);
    setPhase(3);
    
    // Mark seats as held
    setSeats(seats.map(s => 
      selectedSeats.includes(s) ? { ...s, state: 'held' } : s
    ));
  };

  // Handle extension
  const handleExtension = () => {
    setTimeRemaining(EXTENSION_DURATION);
    setExtensionUsed(true);
  };

  // Handle payment tab
  const handlePaymentTab = () => {
    window.open(INSTAPAY_LINK, '_blank');
    setPaymentTabOpened(true);
  };

  // Handle receipt upload
  const handleReceiptUpload = (file: File | null) => {
    if (!file) return;
    
    const validTypes = ['image/png', 'image/jpeg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only PNG and JPG files are allowed');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }
    
    setReceiptFile(file);
    toast.success('Receipt uploaded successfully');
  };

  // Handle booking confirmation
  const handleConfirmBooking = async () => {
    if (!receiptFile) {
      toast.error('Please upload receipt');
      return;
    }
    
    // Simulate submission to Google Sheets
    setBookingConfirmed(true);
    setIsHoldActive(false);
    toast.success('Booking confirmed! Verification in progress.');
  };

  // Render phase 1: Hero
  if (phase === 1 && !isLocked) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Hero Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        >
          <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} className="absolute inset-0"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
          <div className="text-center max-w-2xl">
            <h1 
              style={{ fontFamily: 'Cormorant Garamond, serif', color: '#C9A84C' }}
              className="text-6xl md:text-8xl font-bold mb-6 tracking-wide"
            >
              Peter Pan Ballet Gala
            </h1>
            <p style={{ color: '#F5F0EB' }} className="text-xl md:text-2xl mb-12 font-light">
              Experience the magic of Neverland. Reserve your premium seat for an unforgettable evening.
            </p>
            <button
              onClick={() => setPhase(2)}
              style={{ backgroundColor: '#C9A84C', color: '#1A0911', borderColor: '#C9A84C' }}
              className="px-8 py-6 text-lg rounded-lg border-2 font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              RESERVE YOUR SEAT →
            </button>
          </div>
        </div>
        
        {/* Floating WhatsApp Button */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I need help with seat booking`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-8 right-8 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110"
        >
          <MessageCircle size={24} />
        </a>
      </div>
    );
  }

  // Render phase 2: Seating
  if (phase === 2) {
    const selectedCount = selectedSeats.length;
    const totalPrice = selectedCount * TICKET_PRICE;
    const isFormValid = leadBookerName.trim() && whatsappNumber.trim() && selectedCount > 0 && guestNames.every(n => n.trim());

    return (
      <div style={{ backgroundColor: '#1A0911' }} className="min-h-screen py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 
              style={{ fontFamily: 'Cormorant Garamond, serif', color: '#C9A84C' }}
              className="text-5xl font-bold mb-4"
            >
              Select Your Seats
            </h2>
            <p style={{ color: '#F5F0EB' }} className="text-lg">Theater Seating Map</p>
          </div>

          {/* Seating Grid */}
          <div style={{ backgroundColor: '#2A1520' }} className="rounded-lg p-8 mb-12 overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Stage */}
              <div className="text-center mb-8">
                <div style={{ borderColor: '#C9A84C' }} className="inline-block border-2 px-8 py-2 rounded">
                  <span 
                    style={{ fontFamily: 'Cormorant Garamond, serif', color: '#C9A84C' }}
                    className="text-xl font-bold tracking-widest"
                  >
                    ◆ STAGE ◆
                  </span>
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-4">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].map(row => (
                  <div key={row} className="flex items-center justify-center gap-2">
                    <span 
                      style={{ fontFamily: 'Cormorant Garamond, serif', color: '#C9A84C' }}
                      className="w-8 text-center font-bold"
                    >
                      {row}
                    </span>
                    <div className="flex gap-1">
                      {Array.from({ length: 22 }).map((_, i) => {
                        const seat = seats.find(s => s.row === row && s.number === i + 1)!;
                        const isSelected = selectedSeats.includes(seat);
                        
                        let seatStyle: React.CSSProperties = {};
                        let seatClass = 'w-6 h-6 rounded text-xs font-bold transition-all border-2';
                        
                        if (isSelected) {
                          seatStyle = { backgroundColor: '#C9A84C', color: '#1A0911', borderColor: '#C9A84C' };
                          seatClass += ' animate-pulse';
                        } else if (seat.state === 'held') {
                          seatStyle = { backgroundColor: '#4B5563', borderColor: '#4B5563', cursor: 'not-allowed' };
                        } else if (seat.state === 'booked') {
                          seatStyle = { backgroundColor: '#8B2C3B', borderColor: '#8B2C3B', cursor: 'not-allowed' };
                        } else {
                          seatStyle = { borderColor: '#14B8A6' };
                          seatClass += ' hover:opacity-80';
                        }
                        
                        return (
                          <button
                            key={`${row}-${i + 1}`}
                            onClick={() => handleSeatClick(seat)}
                            disabled={seat.state === 'held' || seat.state === 'booked'}
                            style={seatStyle}
                            className={seatClass}
                            title={`${row}${i + 1}`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                    <span 
                      style={{ fontFamily: 'Cormorant Garamond, serif', color: '#C9A84C' }}
                      className="w-8 text-center font-bold"
                    >
                      {row}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selection Summary */}
          <div style={{ backgroundColor: '#2A1520' }} className="rounded-lg p-6 mb-8">
            <p style={{ color: '#F5F0EB' }} className="text-lg">
              <span style={{ color: '#C9A84C' }} className="font-bold">Selected: {selectedCount} seats</span>
              {selectedCount > 0 && (
                <span className="ml-4">· Total: <span style={{ color: '#C9A84C' }} className="font-bold">EGP {totalPrice}</span></span>
              )}
            </p>
          </div>

          {/* Booking Form */}
          <div style={{ backgroundColor: '#2A1520' }} className="rounded-lg p-8 space-y-6">
            <div>
              <label style={{ color: '#F5F0EB' }} className="block mb-2">Lead Booker Name *</label>
              <Input
                value={leadBookerName}
                onChange={(e) => setLeadBookerName(e.target.value)}
                placeholder="Your full name"
                style={{ backgroundColor: '#1A0911', borderColor: '#C9A84C', color: '#F5F0EB' }}
                className="border-2"
              />
            </div>

            <div>
              <label style={{ color: '#F5F0EB' }} className="block mb-2">WhatsApp Number *</label>
              <Input
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="10+ digits"
                style={{ backgroundColor: '#1A0911', borderColor: '#C9A84C', color: '#F5F0EB' }}
                className="border-2"
              />
            </div>

            {selectedCount > 0 && (
              <div className="space-y-4">
                <p style={{ color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif' }} className="font-bold">Guest Names</p>
                {selectedSeats.map((seat, idx) => (
                  <div key={idx}>
                    <label style={{ color: '#F5F0EB' }} className="block mb-2 text-sm">
                      {idx === 0 ? 'Lead Booker' : `Guest ${idx}`} - Seat {seat.row}{seat.number}
                    </label>
                    <Input
                      value={guestNames[idx] || ''}
                      onChange={(e) => {
                        const newNames = [...guestNames];
                        newNames[idx] = e.target.value;
                        setGuestNames(newNames);
                      }}
                      placeholder="Guest name"
                      style={{ backgroundColor: '#1A0911', borderColor: '#C9A84C', color: '#F5F0EB' }}
                      className="border-2"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-4 pt-6">
              <Button
                onClick={() => setPhase(1)}
                variant="outline"
                style={{ borderColor: '#C9A84C', color: '#C9A84C' }}
                className="flex-1"
              >
                Back
              </Button>
              <button
                onClick={handleHoldSeats}
                disabled={!isFormValid}
                style={{ 
                  backgroundColor: isFormValid ? '#C9A84C' : '#4B5563',
                  color: '#1A0911',
                  borderColor: '#C9A84C'
                }}
                className="flex-1 px-6 py-2 rounded border-2 font-semibold transition-all hover:shadow-lg disabled:cursor-not-allowed"
              >
                HOLD MY SEATS
              </button>
            </div>
          </div>
        </div>

        {/* Floating WhatsApp Button */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hi, I need help with seat booking`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-8 right-8 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110"
        >
          <MessageCircle size={24} />
        </a>
      </div>
    );
  }

  // Render phase 3: Hold Timer
  if (phase === 3 && isHoldActive) {
    const timerColor = getTimerColor(timeRemaining);
    const showExtension = timeRemaining <= 300 && !extensionUsed;

    return (
      <div style={{ backgroundColor: '#1A0911' }} className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          {/* Booking Details Card */}
          <div style={{ backgroundColor: '#2A1520' }} className="rounded-lg p-8 mb-8">
            <h2 
              style={{ fontFamily: 'Cormorant Garamond, serif', color: '#C9A84C' }}
              className="text-3xl font-bold mb-6 text-center"
            >
              Your Booking
            </h2>
            
            {/* Seats List */}
            <div className="mb-6 space-y-2">
              {selectedSeats.map((seat, idx) => (
                <div 
                  key={idx} 
                  style={{ color: '#F5F0EB', borderBottomColor: 'rgba(201, 168, 76, 0.2)' }}
                  className="flex justify-between border-b pb-2"
                >
                  <span>{seat.row}{seat.number}</span>
                  <span>{guestNames[idx]}</span>
                  <span style={{ color: '#C9A84C' }}>EGP {TICKET_PRICE}</span>
                </div>
              ))}
              <div 
                style={{ color: '#C9A84C', borderTopColor: 'rgba(201, 168, 76, 0.2)' }}
                className="flex justify-between font-bold text-lg pt-4 border-t"
              >
                <span>Total</span>
                <span>EGP {selectedSeats.length * TICKET_PRICE} · {selectedSeats.length} Seats</span>
              </div>
            </div>

            {/* Timer */}
            <div className="text-center mb-8">
              <p 
                style={{ fontFamily: 'Cormorant Garamond, serif', color: timerColor }}
                className="text-5xl font-bold"
              >
                {formatTime(timeRemaining)}
              </p>
              <p style={{ color: '#F5F0EB' }} className="text-sm mt-2">Time remaining to complete booking</p>
            </div>

            {/* Extension Button */}
            {showExtension && (
              <button
                onClick={handleExtension}
                style={{ backgroundColor: '#14B8A6', color: '#1A0911' }}
                className="w-full mb-4 py-2 rounded font-bold hover:opacity-90 transition-opacity"
              >
                Extend Hold by 5 Minutes
              </button>
            )}

            {extensionUsed && (
              <div style={{ color: '#14B8A6' }} className="text-center mb-4">
                ✓ Extension Used
              </div>
            )}

            {/* Proceed Button */}
            <button
              onClick={() => {
                setShowPaymentModal(true);
                setPhase(4);
              }}
              style={{ backgroundColor: '#C9A84C', color: '#1A0911', borderColor: '#C9A84C' }}
              className="w-full py-2 rounded border-2 font-semibold hover:shadow-lg transition-all"
            >
              PROCEED TO PAYMENT
            </button>

            {/* Session ID */}
            <p style={{ color: '#F5F0EB' }} className="text-center text-xs mt-4">
              Session ID: {sessionToken}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Render phase 4: Payment Modal
  if (phase === 4) {
    return (
      <div style={{ backgroundColor: '#1A0911' }} className="min-h-screen py-12 px-4">
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent 
            style={{ backgroundColor: '#2A1520', borderColor: '#C9A84C' }}
            className="max-w-2xl border-2 max-h-[90vh] overflow-y-auto"
          >
            {!bookingConfirmed ? (
              <>
                <DialogHeader>
                  <DialogTitle 
                    style={{ fontFamily: 'Cormorant Garamond, serif', color: '#C9A84C' }}
                    className="text-2xl font-bold"
                  >
                    Your Booking Summary
                  </DialogTitle>
                </DialogHeader>

                {/* Booking Summary Table */}
                <div className="space-y-4">
                  <table className="w-full text-sm" style={{ color: '#F5F0EB' }}>
                    <thead>
                      <tr style={{ borderBottomColor: 'rgba(201, 168, 76, 0.2)' }} className="border-b">
                        <th style={{ color: '#C9A84C' }} className="text-left py-2">Seat</th>
                        <th style={{ color: '#C9A84C' }} className="text-left py-2">Guest Name</th>
                        <th style={{ color: '#C9A84C' }} className="text-right py-2">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSeats.map((seat, idx) => (
                        <tr 
                          key={idx} 
                          style={{ borderBottomColor: 'rgba(201, 168, 76, 0.1)' }}
                          className="border-b"
                        >
                          <td className="py-2">{seat.row}{seat.number}</td>
                          <td className="py-2">{guestNames[idx]}</td>
                          <td className="text-right py-2">EGP {TICKET_PRICE}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div 
                    style={{ color: '#C9A84C', borderTopColor: 'rgba(201, 168, 76, 0.2)' }}
                    className="flex justify-between text-lg font-bold border-t pt-4"
                  >
                    <span>Total</span>
                    <span>EGP {selectedSeats.length * TICKET_PRICE}</span>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div style={{ backgroundColor: '#1A0911' }} className="rounded-lg p-6 space-y-3 my-6">
                  <h3 style={{ color: '#C9A84C', fontFamily: 'Cormorant Garamond, serif' }} className="font-bold mb-4">
                    Payment Instructions
                  </h3>
                  <ol style={{ color: '#F5F0EB' }} className="space-y-2 text-sm list-decimal list-inside">
                    <li>Click "Pay via InstaPay →" button below</li>
                    <li>Send payment to <span style={{ color: '#C9A84C' }} className="font-bold">h.shimi@instapay</span> via InstaPay</li>
                    <li>Amount: <span style={{ color: '#C9A84C' }} className="font-bold">EGP {selectedSeats.length * TICKET_PRICE}</span></li>
                    <li>Wait for payment confirmation from InstaPay</li>
                    <li>Take screenshot of payment receipt</li>
                    <li>Upload screenshot in box below to confirm</li>
                  </ol>
                </div>

                {/* Warning Box */}
                <div style={{ borderColor: '#D97706', backgroundColor: 'rgba(217, 119, 6, 0.1)' }} className="border-2 rounded-lg p-4 mb-6">
                  <p style={{ color: '#F5F0EB' }} className="text-sm">
                    ⚠ Payment must be completed within 30 minutes. Session ID: <span style={{ color: '#C9A84C' }} className="font-bold">{sessionToken}</span>
                  </p>
                  <p style={{ color: '#F5F0EB' }} className="text-xs mt-2">Manual verification will occur within 2 hours</p>
                </div>

                {/* Payment Button */}
                <button
                  onClick={handlePaymentTab}
                  style={{ backgroundColor: '#C9A84C', color: '#1A0911', borderColor: '#C9A84C' }}
                  className="w-full py-2 rounded border-2 font-semibold mb-6 hover:shadow-lg transition-all"
                >
                  Pay via InstaPay →
                </button>

                {paymentTabOpened && (
                  <p style={{ color: '#14B8A6' }} className="text-center text-sm mb-4">✓ Payment Tab Opened</p>
                )}

                {/* Receipt Upload */}
                <div className="mb-6">
                  <label style={{ color: '#F5F0EB' }} className="block mb-3 font-bold">Upload Payment Receipt (Screenshot)</label>
                  <div 
                    style={{ borderColor: '#C9A84C' }}
                    className="border-2 border-dashed rounded-lg p-8 text-center hover:opacity-80 transition-opacity cursor-pointer"
                    onClick={() => document.getElementById('receipt-input')?.click()}
                  >
                    <Upload style={{ color: '#C9A84C' }} className="mx-auto mb-2" size={24} />
                    <p style={{ color: '#F5F0EB' }} className="text-sm">Drag and drop or click to select</p>
                    <p style={{ color: '#F5F0EB' }} className="text-xs mt-1">PNG, JPG (Max 5MB)</p>
                    {receiptFile && (
                      <div style={{ color: '#14B8A6' }} className="mt-4">
                        <p className="font-bold">✓ {receiptFile.name}</p>
                        <p className="text-xs">{(receiptFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    id="receipt-input"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => handleReceiptUpload(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmBooking}
                  disabled={!receiptFile}
                  style={{ 
                    backgroundColor: receiptFile ? '#C9A84C' : '#4B5563',
                    color: '#1A0911',
                    borderColor: '#C9A84C',
                    cursor: receiptFile ? 'pointer' : 'not-allowed'
                  }}
                  className="w-full py-2 rounded border-2 font-semibold mb-4 hover:shadow-lg transition-all"
                >
                  Confirm Booking
                </button>

                {/* Support Footer */}
                <div style={{ borderTopColor: 'rgba(201, 168, 76, 0.2)' }} className="border-t pt-4 flex gap-2">
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}?text=My session ID is ${sessionToken}. I need help with my booking.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded text-sm font-bold text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} /> WhatsApp
                  </a>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}?subject=Booking Support - Session ${sessionToken}`}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded text-sm font-bold text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail size={16} /> Email
                  </a>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <h3 style={{ fontFamily: 'Cormorant Garamond, serif', color: '#14B8A6' }} className="text-2xl font-bold mb-4">
                  ✓ Booking Confirmed
                </h3>
                <p style={{ color: '#F5F0EB' }} className="mb-4">Your booking has been submitted. We'll verify payment within 2 hours and send confirmation via WhatsApp.</p>
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPhase(1);
                    setSelectedSeats([]);
                    setLeadBookerName('');
                    setWhatsappNumber('');
                    setGuestNames([]);
                    setReceiptFile(null);
                    setPaymentTabOpened(false);
                    setBookingConfirmed(false);
                  }}
                  style={{ backgroundColor: '#C9A84C', color: '#1A0911', borderColor: '#C9A84C' }}
                  className="px-6 py-2 rounded border-2 font-semibold hover:shadow-lg transition-all"
                >
                  Back to Home
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Render locked state
  if (isLocked) {
    return (
      <div style={{ backgroundColor: '#1A0911' }} className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div style={{ backgroundColor: '#2A1520' }} className="max-w-2xl w-full rounded-lg p-8 text-center">
          <h2 
            style={{ fontFamily: 'Cormorant Garamond, serif', color: '#D97706' }}
            className="text-3xl font-bold mb-4"
          >
            Session Locked
          </h2>
          <p style={{ color: '#F5F0EB' }} className="mb-6">Your booking session has expired. Support available below.</p>
          
          <div 
            style={{ fontFamily: 'Cormorant Garamond, serif', color: '#D97706' }}
            className="text-4xl font-bold mb-8"
          >
            {formatTime(lockTimeRemaining)}
          </div>

          <div className="flex gap-4 mb-8">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=My session ID is ${sessionToken}. I need help with my booking.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded font-bold transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle size={20} /> WhatsApp
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Booking Support - Session ${sessionToken}`}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded font-bold transition-colors flex items-center justify-center gap-2"
            >
              <Mail size={20} /> Email
            </a>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{ borderColor: '#C9A84C', color: '#C9A84C' }}
            className="w-full py-2 rounded border-2 font-semibold hover:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return null;
}
