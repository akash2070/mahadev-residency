import { useState } from 'react';
import { X, Search, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Booking, EmailConfirmationLog } from '../types/hotel';
import { formatDisplayDate, formatINR } from '../utils/dateUtils';

interface ManageBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingUpdated: () => void;
}

export function ManageBookingModal({
  isOpen,
  onClose,
  onBookingUpdated,
}: ManageBookingModalProps) {
  const [query, setQuery] = useState('MR-2026-1042');
  const [results, setResults] = useState<Booking[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailToast, setEmailToast] = useState<EmailConfirmationLog | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent, overrideQuery?: string) => {
    if (e) e.preventDefault();
    const q = (overrideQuery ?? query).trim();
    if (!q) return;
    setLoading(true);
    setEmailToast(null);
    try {
      const res = await fetch(`/api/bookings?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.bookings || []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async (booking: Booking) => {
    const res = await fetch(`/api/bookings/${booking.id}/resend-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestEmail: booking.guestEmail }),
    });
    const data = await res.json();
    if (res.ok && data.emailConfirmation) {
      setEmailToast(data.emailConfirmation);
    }
  };

  const handleCancelBooking = async (booking: Booking) => {
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Cancelled', guestEmail: booking.guestEmail }),
    });
    if (res.ok) {
      await handleSearch();
      onBookingUpdated();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Manage Existing Booking"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-xl max-w-2xl w-full border border-[#E4E0D8] overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#E4E0D8] flex items-center justify-between bg-[#FAF9F6]">
          <div>
            <p className="text-xs font-medium text-[#0F5257]">Guest Reservation Lookup</p>
            <h2 className="font-display text-xl font-semibold text-[#18181B]">
              Manage Your Booking
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close lookup modal"
            onClick={onClose}
            className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-[#57534E] hover:bg-[#F3F1EC] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Booking Ref (e.g. MR-2026-1042), Email, or Phone"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg cursor-pointer whitespace-nowrap"
            >
              {loading ? 'Searching...' : 'Find Booking'}
            </button>
          </form>

          <div className="text-xs text-[#57534E] flex flex-wrap items-center gap-3">
            <span>Sample references:</span>
            {['MR-2026-1041', 'MR-2026-1042', 'MR-2026-1043'].map((ref) => (
              <button
                key={ref}
                type="button"
                onClick={() => {
                  setQuery(ref);
                  handleSearch(undefined, ref);
                }}
                className="font-mono text-[#0F5257] underline hover:text-[#0B3E42] cursor-pointer"
              >
                {ref}
              </button>
            ))}
          </div>

          {emailToast && (
            <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#15803D] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                Confirmation email resent to <strong>{emailToast.toEmail}</strong> (
                {emailToast.subject}).
              </span>
            </div>
          )}

          {searched && results.length === 0 && (
            <div className="p-6 text-center border border-[#E4E0D8] rounded-xl text-sm text-[#57534E]">
              <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#78716C]" />
              No matching reservation found. Verify your booking reference or email address.
            </div>
          )}

          <div className="space-y-4">
            {results.map((b) => (
              <div
                key={b.id}
                className="border border-[#E4E0D8] rounded-xl p-5 bg-[#FAF9F6] space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-mono text-xs font-semibold text-[#0F5257]">
                      {b.bookingRef}
                    </div>
                    <h3 className="text-base font-semibold text-[#18181B]">{b.guestName}</h3>
                    <p className="text-xs text-[#57534E]">
                      {b.guestEmail} · {b.guestPhone}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-semibold ${
                        b.status === 'Cancelled'
                          ? 'text-[#DC2626]'
                          : b.status === 'Confirmed' || b.status === 'Checked In'
                            ? 'text-[#15803D]'
                            : 'text-[#B45309]'
                      }`}
                    >
                      Status: {b.status}
                    </span>
                    <div className="font-mono text-base font-semibold text-[#18181B] mt-0.5">
                      {formatINR(b.totalAmount)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-b border-[#E4E0D8] py-3">
                  <div>
                    <span className="text-[#57534E] block">Room(s)</span>
                    <span className="font-mono font-semibold text-[#18181B]">
                      {b.roomCount} × {b.roomType} ({b.assignedRooms.join(', ')})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#57534E] block">Check-In</span>
                    <span className="font-mono font-semibold text-[#18181B]">
                      {formatDisplayDate(b.checkIn)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#57534E] block">Check-Out</span>
                    <span className="font-mono font-semibold text-[#18181B]">
                      {formatDisplayDate(b.checkOut)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#57534E] block">Payment</span>
                    <span className="font-mono font-semibold text-[#18181B]">
                      {b.paymentStatus} ({b.paymentMethod === 'UPI_QR' ? 'UPI QR' : b.paymentMethod})
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleResendEmail(b)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#18181B] bg-white border border-[#E4E0D8] hover:bg-[#F3F1EC] rounded-lg cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#0F5257]" />
                    <span>Resend Confirmation Email</span>
                  </button>

                  {b.status !== 'Cancelled' && b.status !== 'Checked Out' && (
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(b)}
                      className="px-3.5 py-2 text-xs font-medium text-[#DC2626] bg-white border border-[#FECACA] hover:bg-[#FEF2F2] rounded-lg cursor-pointer"
                    >
                      Cancel Reservation
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
