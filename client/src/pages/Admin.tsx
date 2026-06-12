import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';

const ADMIN_PASSWORD = 'peterpan2025';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx-_cUJZdu9ZSNvkyCDh3WA3DjCtzFLlT86FwiMcgllcrkhnBH1YoUXqSC4AfRf4-tT/exec';

interface BookingResult {
  code: string;
  primaryGuest: string;
  phone: string;
  showNumber: number;
  paymentMethod: 'InstaPay' | 'Cash';
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  totalSeats: number;
  totalPrice: number;
  seatGuestPairs: Array<{ seat: string; guest: string }>;
  timestamp: string;
}

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [bookingCode, setBookingCode] = useState('');
  const [showNumber, setShowNumber] = useState('');
  const [searchResult, setSearchResult] = useState<BookingResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPassword('');
      toast.success('Logged in successfully');
    } else {
      toast.error('Invalid password');
      setPassword('');
    }
  };

  const handleSearch = async () => {
    if (!bookingCode.trim()) {
      toast.error('Please enter a booking code');
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${GAS_URL}?action=search&code=${bookingCode}&show=${showNumber || ''}`);
      const result = await response.json();

      if (result.success && result.booking) {
        setSearchResult(result.booking);
      } else {
        setSearchResult(null);
        toast.error('Booking not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search booking');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!searchResult) return;

    setIsProcessing(true);
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          code: searchResult.code,
          showNumber: searchResult.showNumber
        })
      });

      const result = await response.json();

      if (result.success) {
        setSearchResult({ ...searchResult, status: 'Confirmed' });
        toast.success('Booking confirmed');
      } else {
        toast.error('Failed to confirm booking');
      }
    } catch (error) {
      console.error('Confirm error:', error);
      toast.error('Failed to confirm booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!searchResult) return;

    setIsProcessing(true);
    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          code: searchResult.code,
          showNumber: searchResult.showNumber
        })
      });

      const result = await response.json();

      if (result.success) {
        setSearchResult({ ...searchResult, status: 'Cancelled' });
        toast.success('Booking cancelled');
      } else {
        toast.error('Failed to cancel booking');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendWhatsAppConfirmation = async () => {
    if (!searchResult) return;

    try {
      // Generate WhatsApp message
      const message = `✅ Confirmed — Hi ${searchResult.primaryGuest}, your booking for Show ${searchResult.showNumber} is confirmed. Code: ${searchResult.code}. Seats: ${searchResult.totalSeats}. Total: EGP ${searchResult.totalPrice}. See you there! 🎭`;
      const whatsappLink = `https://wa.me/${searchResult.phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappLink, '_blank');
    } catch (error) {
      console.error('WhatsApp error:', error);
      toast.error('Failed to open WhatsApp');
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#1A0911', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ backgroundColor: '#2D1B24', padding: '40px', borderRadius: '8px', maxWidth: '400px', width: '100%' }}>
          <h1 style={{ fontSize: '32px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', marginBottom: '30px', textAlign: 'center' }}>
            Admin Panel
          </h1>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#E5D4C1' }}>
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
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

          <Button
            onClick={handleLogin}
            style={{
              width: '100%',
              backgroundColor: '#14B8A6',
              color: '#1A0911',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Login
          </Button>
        </div>
      </div>
    );
  }

  // Admin dashboard
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#1A0911', color: '#E5D4C1', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '40px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', marginBottom: '30px', textAlign: 'center' }}>
          Admin Panel
        </h1>

        {/* Search Section */}
        <div style={{ backgroundColor: '#2D1B24', padding: '30px', borderRadius: '8px', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '20px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', marginBottom: '20px' }}>
            Search Booking
          </h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              Booking Code (6 characters)
            </label>
            <Input
              placeholder="e.g., X7K2PQ"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
              maxLength={6}
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

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
              Show Number (optional)
            </label>
            <Input
              type="number"
              min="1"
              max="5"
              placeholder="1-5"
              value={showNumber}
              onChange={(e) => setShowNumber(e.target.value)}
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

          <Button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              width: '100%',
              backgroundColor: '#14B8A6',
              color: '#1A0911',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              border: 'none',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              borderRadius: '4px'
            }}
          >
            {isSearching ? 'SEARCHING...' : 'Search'}
          </Button>
        </div>

        {/* Results Card */}
        {searchResult && (
          <div style={{ backgroundColor: '#2D1B24', padding: '30px', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '20px', fontFamily: 'Cormorant Garamond', color: '#C9A84C', marginBottom: '20px' }}>
              Booking Details
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '14px' }}>
              <div>
                <p style={{ color: '#A89968', marginBottom: '4px' }}>Primary Guest</p>
                <p style={{ fontWeight: 'bold' }}>{searchResult.primaryGuest}</p>
              </div>
              <div>
                <p style={{ color: '#A89968', marginBottom: '4px' }}>Phone</p>
                <p style={{ fontWeight: 'bold' }}>{searchResult.phone}</p>
              </div>
              <div>
                <p style={{ color: '#A89968', marginBottom: '4px' }}>Show Number</p>
                <p style={{ fontWeight: 'bold' }}>Show {searchResult.showNumber}</p>
              </div>
              <div>
                <p style={{ color: '#A89968', marginBottom: '4px' }}>Payment Method</p>
                <p style={{ fontWeight: 'bold' }}>{searchResult.paymentMethod}</p>
              </div>
              <div>
                <p style={{ color: '#A89968', marginBottom: '4px' }}>Total Seats</p>
                <p style={{ fontWeight: 'bold' }}>{searchResult.totalSeats}</p>
              </div>
              <div>
                <p style={{ color: '#A89968', marginBottom: '4px' }}>Total Price</p>
                <p style={{ fontWeight: 'bold' }}>EGP {searchResult.totalPrice}</p>
              </div>
            </div>

            {/* Status */}
            <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '4px', backgroundColor: '#1A0911' }}>
              <p style={{ color: '#A89968', marginBottom: '4px', fontSize: '12px' }}>Status</p>
              <p style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: searchResult.status === 'Confirmed' ? '#14B8A6' : searchResult.status === 'Cancelled' ? '#8B2C3B' : '#C9A84C'
              }}>
                {searchResult.status === 'Confirmed' ? '✅ Confirmed' : searchResult.status === 'Cancelled' ? '❌ Cancelled' : '⏳ Pending'}
              </p>
            </div>

            {/* Seat & Guest Pairs */}
            <div style={{ marginBottom: '20px', padding: '12px', borderRadius: '4px', backgroundColor: '#1A0911', fontSize: '14px' }}>
              <p style={{ color: '#A89968', marginBottom: '8px', fontWeight: 'bold' }}>Seats & Guests</p>
              {searchResult.seatGuestPairs.map((pair, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>{pair.seat}</span>
                  <span style={{ color: '#A89968' }}>→ {pair.guest}</span>
                </div>
              ))}
            </div>

            {/* Timestamp */}
            <div style={{ marginBottom: '20px', fontSize: '12px', color: '#A89968' }}>
              Booked: {new Date(searchResult.timestamp).toLocaleString()}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {searchResult.status !== 'Confirmed' && (
                <Button
                  onClick={handleConfirmBooking}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    backgroundColor: '#14B8A6',
                    color: '#1A0911',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  ✅ Confirm Booking
                </Button>
              )}

              {searchResult.status !== 'Cancelled' && (
                <Button
                  onClick={handleCancelBooking}
                  disabled={isProcessing}
                  style={{
                    flex: 1,
                    backgroundColor: '#8B2C3B',
                    color: '#E5D4C1',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    borderRadius: '4px'
                  }}
                >
                  ❌ Cancel Booking
                </Button>
              )}

              {searchResult.status === 'Confirmed' && (
                <Button
                  onClick={handleSendWhatsAppConfirmation}
                  style={{
                    flex: 1,
                    backgroundColor: '#25D366',
                    color: 'white',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <MessageCircle size={16} />
                  Send WhatsApp
                </Button>
              )}
            </div>
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
