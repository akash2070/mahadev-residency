import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  CheckCircle2,
  QrCode,
  CreditCard,
  Building,
  Copy,
  Check,
  Mail,
  Printer,
  ArrowLeft,
} from 'lucide-react';
import type {
  Booking,
  EmailConfirmationLog,
  MealPlan,
  PaymentMethod,
  RoomType,
} from '../types/hotel';
import { HOTEL_INFO, ROOM_CATALOG } from '../data/hotelContent';
import { diffDaysYMD, formatDisplayDate, formatINR, getTodayYMD } from '../utils/dateUtils';

interface BookingModalProps {
  isOpen: boolean;
  initialCheckIn: string;
  initialCheckOut: string;
  initialRoomType: RoomType;
  initialRoomCount: number;
  initialMealPlan?: MealPlan;
  onClose: () => void;
  onBookingCreated: (booking: Booking) => void;
}

export function BookingModal({
  isOpen,
  initialCheckIn,
  initialCheckOut,
  initialRoomType,
  initialRoomCount,
  initialMealPlan = 'ROOM_ONLY',
  onClose,
  onBookingCreated,
}: BookingModalProps) {
  const [step, setStep] = useState<'stay' | 'guest' | 'payment' | 'confirmed'>('stay');

  const [roomType, setRoomType] = useState<RoomType>(initialRoomType);
  const [roomCount, setRoomCount] = useState<number>(initialRoomCount);
  const [checkIn, setCheckIn] = useState<string>(initialCheckIn);
  const [checkOut, setCheckOut] = useState<string>(initialCheckOut);
  const [guestsCount, setGuestsCount] = useState<number>(initialRoomType === 'Single' ? 1 : 2);
  const [mealPlan, setMealPlan] = useState<MealPlan>(initialMealPlan);
  const [stationPickup, setStationPickup] = useState<boolean>(false);
  const [promoInput, setPromoInput] = useState<string>('');
  const [promoApplied, setPromoApplied] = useState<boolean>(false);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI_QR');
  const [qrMode, setQrMode] = useState<'uploaded' | 'dynamic'>('uploaded');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [upiCopied, setUpiCopied] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [upiTimerSec, setUpiTimerSec] = useState(599);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState<EmailConfirmationLog | null>(null);
  const [availabilityCheck, setAvailabilityCheck] = useState<{
    singleAvailable: number;
    doubleAvailable: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRoomType(initialRoomType);
      setRoomCount(initialRoomCount);
      setCheckIn(initialCheckIn);
      setCheckOut(initialCheckOut);
      setGuestsCount(initialRoomType === 'Single' ? initialRoomCount : initialRoomCount * 2);
      setMealPlan(initialMealPlan);
      setStep('stay');
      setError(null);
      setConfirmedBooking(null);
      setEmailConfirmation(null);
      setUpiTimerSec(599);
    }
  }, [isOpen, initialCheckIn, initialCheckOut, initialRoomType, initialRoomCount, initialMealPlan]);

  useEffect(() => {
    if (!isOpen || !checkIn || !checkOut || checkOut <= checkIn) return;
    fetch(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}`)
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.singleAvailable === 'number') {
          setAvailabilityCheck({
            singleAvailable: data.singleAvailable,
            doubleAvailable: data.doubleAvailable,
          });
        }
      })
      .catch(() => {});
  }, [isOpen, checkIn, checkOut]);

  const nights = Math.max(1, diffDaysYMD(checkIn, checkOut));
  const rate = ROOM_CATALOG[roomType].ratePerNight;
  const mealPerGuestNight = mealPlan === 'BREAKFAST' ? 220 : mealPlan === 'HALF_BOARD' ? 550 : 0;

  const roomSubtotal = rate * roomCount * nights;
  const mealSubtotal = mealPerGuestNight * guestsCount * nights;
  const discountAmount = promoApplied ? Math.round(roomSubtotal * 0.1) : 0;
  const taxable = Math.max(0, roomSubtotal + mealSubtotal - discountAmount);
  const gstAmount = Math.round(taxable * 0.12);
  const totalAmount = taxable + gstAmount;

  const availableForSelected = availabilityCheck
    ? roomType === 'Single'
      ? availabilityCheck.singleAvailable
      : availabilityCheck.doubleAvailable
    : roomType === 'Single'
      ? 14
      : 35;

  // Generate QR Code image for UPI payment
  useEffect(() => {
    if (!isOpen || step !== 'payment' || paymentMethod !== 'UPI_QR') return;
    const upiUri = `upi://pay?pa=${encodeURIComponent(HOTEL_INFO.upiId)}&pn=${encodeURIComponent(
      HOTEL_INFO.upiMerchantName
    )}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent(`MahadevResidency-${roomType}-${nights}N`)}`;

    QRCode.toDataURL(upiUri, {
      width: 240,
      margin: 2,
      color: { dark: '#18181B', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [isOpen, step, paymentMethod, totalAmount, roomType, nights]);

  useEffect(() => {
    if (!isOpen || step !== 'payment' || paymentMethod !== 'UPI_QR') return;
    const timer = setInterval(() => {
      setUpiTimerSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step, paymentMethod]);

  if (!isOpen) return null;

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(HOTEL_INFO.upiId);
      setUpiCopied(true);
      setTimeout(() => setUpiCopied(false), 2000);
    } catch {
      // Clipboard fallback
    }
  };

  const handleApplyPromo = () => {
    if (promoInput.trim().toUpperCase() === 'HONNAVAR10') {
      setPromoApplied(true);
      setError(null);
    } else {
      setPromoApplied(false);
      setError('Invalid promo code. Try HONNAVAR10 for 10% off room tariff.');
    }
  };

  const handleConfirmBooking = async () => {
    setError(null);
    if (paymentMethod === 'CARD') {
      if (cardNumber.replace(/\s+/g, '').length < 12 || !cardExpiry.trim() || cardCvv.length < 3) {
        setError('Please enter valid card details or switch to UPI QR / Pay at Desk.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          guestEmail,
          guestPhone,
          roomType,
          roomCount,
          checkIn,
          checkOut,
          guestsCount,
          mealPlan,
          stationPickup,
          promoCode: promoApplied ? 'HONNAVAR10' : undefined,
          specialRequests,
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not complete reservation.');
      } else {
        setConfirmedBooking(data.booking);
        setEmailConfirmation(data.emailConfirmation);
        setStep('confirmed');
        onBookingCreated(data.booking);
      }
    } catch {
      setError('Unable to reach reservation server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const minutesLeft = String(Math.floor(upiTimerSec / 60)).padStart(2, '0');
  const secondsLeft = String(upiTimerSec % 60).padStart(2, '0');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reserve a Room at Mahadev Residency"
      className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-white rounded-xl max-w-3xl w-full border border-[#E4E0D8] overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E4E0D8] flex items-center justify-between bg-[#FAF9F6] shrink-0">
          <div>
            <p className="text-xs font-medium text-[#0F5257]">
              Mahadev Residency · Honnavar Reservation Desk
            </p>
            <h2 className="font-display text-xl font-semibold text-[#18181B]">
              {step === 'stay' && '1. Choose Room & Stay Package'}
              {step === 'guest' && '2. Guest Contact Details'}
              {step === 'payment' && '3. Online Payment & UPI QR'}
              {step === 'confirmed' && 'Reservation Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close booking dialog"
            onClick={onClose}
            className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-[#57534E] hover:bg-[#F3F1EC] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-sm text-[#DC2626]">
              {error}
            </div>
          )}

          {/* STEP 1: STAY DETAILS */}
          {step === 'stay' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(['Single', 'Double'] as RoomType[]).map((type) => {
                  const spec = ROOM_CATALOG[type];
                  const selected = roomType === type;
                  const freeCount = availabilityCheck
                    ? type === 'Single'
                      ? availabilityCheck.singleAvailable
                      : availabilityCheck.doubleAvailable
                    : spec.unitsCount;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setRoomType(type);
                        setGuestsCount(type === 'Single' ? roomCount : roomCount * 2);
                      }}
                      className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                        selected
                          ? 'border-[#0F5257] bg-[#0F5257]/5'
                          : 'border-[#E4E0D8] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-base text-[#18181B]">
                          {spec.title}
                        </span>
                        <span className="font-mono text-sm font-semibold text-[#18181B]">
                          {formatINR(spec.ratePerNight)}/night
                        </span>
                      </div>
                      <p className="text-xs text-[#57534E]">
                        Attached Bath & Toilet · {freeCount} of {spec.unitsCount} free
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Check-In
                  </label>
                  <input
                    type="date"
                    min={getTodayYMD()}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#E4E0D8] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Check-Out
                  </label>
                  <input
                    type="date"
                    min={checkIn}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#E4E0D8] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Rooms ({availableForSelected} free)
                  </label>
                  <select
                    value={roomCount}
                    onChange={(e) => setRoomCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#E4E0D8] rounded-lg"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n} disabled={n > availableForSelected}>
                        {n} {n === 1 ? 'Room' : 'Rooms'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Total Guests
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={roomType === 'Single' ? roomCount : roomCount * 3}
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#E4E0D8] rounded-lg"
                  />
                </div>
              </div>

              {/* Coastal Kitchen Meal Plans */}
              <div>
                <p className="text-xs font-medium text-[#57534E] mb-2">
                  Coastal Kitchen Meal Plan (Optional)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'ROOM_ONLY', title: 'Room Only', sub: 'Dine a la carte' },
                    { id: 'BREAKFAST', title: 'With Breakfast', sub: '+₹220 / guest / night' },
                    {
                      id: 'HALF_BOARD',
                      title: 'Breakfast + Dinner',
                      sub: '+₹550 / guest / night',
                    },
                  ].map((mp) => (
                    <button
                      key={mp.id}
                      type="button"
                      onClick={() => setMealPlan(mp.id as MealPlan)}
                      className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                        mealPlan === mp.id
                          ? 'border-[#0F5257] bg-[#0F5257]/5'
                          : 'border-[#E4E0D8] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div className="text-sm font-semibold text-[#18181B]">{mp.title}</div>
                      <div className="text-xs text-[#57534E] mt-0.5">{mp.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <label className="inline-flex items-center gap-2.5 text-sm text-[#18181B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stationPickup}
                    onChange={(e) => setStationPickup(e.target.checked)}
                    className="w-4 h-4 accent-[#0F5257]"
                  />
                  <span>Request complimentary Honnavar Railway Station pickup</span>
                </label>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Promo: HONNAVAR10"
                    className="px-3 py-1.5 text-xs font-mono border border-[#E4E0D8] rounded-lg w-36"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 text-xs font-medium border border-[#E4E0D8] hover:bg-[#F3F1EC] rounded-lg cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Tariff Breakdown */}
              <div className="bg-[#FAF9F6] border border-[#E4E0D8] rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#57534E]">
                  <span>
                    {roomCount} × {roomType} Room ({nights} {nights === 1 ? 'night' : 'nights'})
                  </span>
                  <span className="font-mono tabular-nums text-[#18181B]">
                    {formatINR(roomSubtotal)}
                  </span>
                </div>
                {mealSubtotal > 0 && (
                  <div className="flex justify-between text-[#57534E]">
                    <span>Coastal Kitchen Meal Plan ({guestsCount} guests)</span>
                    <span className="font-mono tabular-nums text-[#18181B]">
                      {formatINR(mealSubtotal)}
                    </span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#15803D]">
                    <span>Promo HONNAVAR10 (10% off room tariff)</span>
                    <span className="font-mono tabular-nums">-{formatINR(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#57534E]">
                  <span>GST (12%)</span>
                  <span className="font-mono tabular-nums text-[#18181B]">
                    {formatINR(gstAmount)}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E4E0D8] flex justify-between font-semibold text-base text-[#18181B]">
                  <span>Total Payable</span>
                  <span className="font-mono tabular-nums">{formatINR(totalAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GUEST INFORMATION */}
          {step === 'guest' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Full Name (as per Photo ID)
                  </label>
                  <input
                    required
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Karthik Hegde"
                    className="w-full px-3 py-2.5 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Mobile Number
                  </label>
                  <input
                    required
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+91 98450 00000"
                    className="w-full px-3 py-2.5 text-sm font-mono border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Email Address (for instant automatic booking confirmation)
                </label>
                <input
                  required
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="w-full px-3 py-2.5 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Special Requests / Arrival Time (Optional)
                </label>
                <textarea
                  rows={3}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Early check-in request, ground floor preference, or vegetarian thali notes..."
                  className="w-full px-3 py-2.5 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: ONLINE PAYMENT WITH FAKE UPI QR CODE */}
          {step === 'payment' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-[#FAF9F6] border border-[#E4E0D8] rounded-xl p-4">
                <div>
                  <p className="text-xs text-[#57534E]">
                    {roomCount} × {roomType} Room · {formatDisplayDate(checkIn)} –{' '}
                    {formatDisplayDate(checkOut)}
                  </p>
                  <p className="text-sm font-semibold text-[#18181B] mt-0.5">{guestName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#57534E]">Total Amount</p>
                  <p className="font-mono text-xl font-semibold text-[#0F5257] tabular-nums">
                    {formatINR(totalAmount)}
                  </p>
                </div>
              </div>

              {/* Payment Mode Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'UPI_QR', label: 'UPI Scan QR Code', icon: QrCode },
                  { id: 'CARD', label: 'Card / NetBanking', icon: CreditCard },
                  { id: 'PAY_AT_HOTEL', label: 'Pay at Hotel Desk', icon: Building },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const active = paymentMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id as PaymentMethod)}
                      className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-sm font-medium transition-colors cursor-pointer ${
                        active
                          ? 'border-[#0F5257] bg-[#0F5257]/5 text-[#0F5257]'
                          : 'border-[#E4E0D8] text-[#18181B] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* UPI QR PANEL */}
              {paymentMethod === 'UPI_QR' && (
                <div className="border border-[#E4E0D8] rounded-xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center bg-white">
                  <div className="sm:col-span-5 flex flex-col items-center">
                    <div className="p-2.5 bg-white border border-[#E4E0D8] rounded-xl">
                      {qrMode === 'uploaded' ? (
                        <div className="relative w-44 h-44 overflow-hidden rounded-lg bg-white">
                          <img
                            src={HOTEL_INFO.upiQrImage}
                            alt={`PhonePe UPI QR Code for ${HOTEL_INFO.upiId}`}
                            className="absolute left-1/2 top-1/2 w-[170%] max-w-none -translate-x-1/2 -translate-y-[47.45%]"
                          />
                        </div>
                      ) : qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`UPI Payment QR Code for ${formatINR(totalAmount)}`}
                          className="w-44 h-44"
                        />
                      ) : (
                        <div className="w-44 h-44 bg-[#F3F1EC] flex items-center justify-center text-xs text-[#57534E]">
                          Generating QR...
                        </div>
                      )}
                    </div>
                    <p className="font-mono text-xs text-[#57534E] mt-2 tabular-nums">
                      {HOTEL_INFO.upiBankLabel} · {minutesLeft}:{secondsLeft}
                    </p>
                  </div>

                  <div className="sm:col-span-7 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-[#0F5257]">
                          Scan & Pay via UPI
                        </p>
                        <h3 className="text-base font-semibold text-[#18181B] mt-0.5">
                          PhonePe, Google Pay, Paytm, or BHIM
                        </h3>
                      </div>

                      <div className="inline-flex p-0.5 bg-[#F3F1EC] rounded-lg border border-[#E4E0D8]">
                        <button
                          type="button"
                          onClick={() => setQrMode('uploaded')}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                            qrMode === 'uploaded'
                              ? 'bg-white text-[#18181B] shadow-xs'
                              : 'text-[#57534E] hover:text-[#18181B]'
                          }`}
                        >
                          PhonePe QR
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrMode('dynamic')}
                          className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                            qrMode === 'dynamic'
                              ? 'bg-white text-[#18181B] shadow-xs'
                              : 'text-[#57534E] hover:text-[#18181B]'
                          }`}
                        >
                          Auto-Amount QR
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-[#FAF9F6] border border-[#E4E0D8] rounded-lg px-3 py-2">
                      <span className="font-mono text-xs text-[#18181B] truncate">
                        UPI ID: {HOTEL_INFO.upiId}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#0F5257] shrink-0 cursor-pointer"
                      >
                        {upiCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{upiCopied ? 'Copied' : 'Copy UPI'}</span>
                      </button>
                    </div>

                    <p className="text-xs text-[#57534E] leading-relaxed">
                      Scan the QR code above and pay{' '}
                      <strong className="font-mono text-[#18181B]">{formatINR(totalAmount)}</strong>{' '}
                      to <span className="font-mono">{HOTEL_INFO.upiId}</span>, then click{' '}
                      <strong>Verify & Confirm UPI Payment</strong> below to receive your room
                      number and confirmation email.
                    </p>
                  </div>
                </div>
              )}

              {/* CARD PANEL */}
              {paymentMethod === 'CARD' && (
                <div className="border border-[#E4E0D8] rounded-xl p-5 space-y-4">
                  <p className="text-xs text-[#57534E]">
                    Demo payment gateway — enter any sample card digits to simulate instant
                    confirmation.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-[#57534E] mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 8910 2234 5501"
                      className="w-full px-3 py-2 text-sm font-mono border border-[#E4E0D8] rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#57534E] mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="08/29"
                        className="w-full px-3 py-2 text-sm font-mono border border-[#E4E0D8] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#57534E] mb-1">
                        CVV
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-3 py-2 text-sm font-mono border border-[#E4E0D8] rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* PAY AT HOTEL PANEL */}
              {paymentMethod === 'PAY_AT_HOTEL' && (
                <div className="border border-[#E4E0D8] rounded-xl p-5 text-sm text-[#57534E]">
                  Your room will be held under <strong className="text-[#18181B]">Pending Desk Payment</strong>{' '}
                  until 6:00 PM on your check-in date. Settle {formatINR(totalAmount)} via cash,
                  card, or UPI at the Mahadev Residency reception desk in Honnavar.
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRMED & AUTOMATIC EMAIL PREVIEW */}
          {step === 'confirmed' && confirmedBooking && emailConfirmation && (
            <div className="space-y-6">
              <div className="flex items-start gap-3.5 p-4 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                <CheckCircle2 className="w-6 h-6 text-[#15803D] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-semibold text-[#18181B]">
                    Stay Confirmed · Reference {confirmedBooking.bookingRef}
                  </h3>
                  <p className="text-sm text-[#3F3F46] mt-0.5">
                    Assigned Room(s):{' '}
                    <strong className="font-mono">
                      {confirmedBooking.assignedRooms.join(', ')}
                    </strong>{' '}
                    ({confirmedBooking.roomType} · Attached Bathroom & Toilet)
                  </p>
                </div>
              </div>

              {/* Automated Confirmation Email Dispatched Preview */}
              <div className="border border-[#E4E0D8] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#FAF9F6] border-b border-[#E4E0D8] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#18181B]">
                    <Mail className="w-4 h-4 text-[#0F5257]" />
                    <span>Automatic Confirmation Email Sent</span>
                  </div>
                  <span className="font-mono text-xs text-[#57534E]">
                    To: {emailConfirmation.toEmail}
                  </span>
                </div>
                <div className="p-4 bg-white">
                  <p className="text-xs font-semibold text-[#18181B] mb-2">
                    Subject: {emailConfirmation.subject}
                  </p>
                  <pre className="font-mono text-xs text-[#3F3F46] whitespace-pre-wrap leading-relaxed bg-[#FAF9F6] p-3.5 rounded-lg border border-[#E4E0D8]">
                    {emailConfirmation.bodyText}
                  </pre>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#18181B] border border-[#E4E0D8] hover:bg-[#F3F1EC] rounded-lg cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        {step !== 'confirmed' && (
          <div className="px-6 py-4 border-t border-[#E4E0D8] bg-[#FAF9F6] flex items-center justify-between gap-4 shrink-0">
            <div>
              {step !== 'stay' && (
                <button
                  type="button"
                  onClick={() => setStep(step === 'payment' ? 'guest' : 'stay')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-[#57534E] hover:text-[#18181B] cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {step === 'stay' && (
                <button
                  type="button"
                  disabled={roomCount > availableForSelected || checkOut <= checkIn}
                  onClick={() => {
                    if (checkOut <= checkIn) {
                      setError('Check-out date must be after check-in date.');
                      return;
                    }
                    setError(null);
                    setStep('guest');
                  }}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] disabled:bg-[#A8A29E] rounded-lg cursor-pointer"
                >
                  Continue to Guest Details
                </button>
              )}

              {step === 'guest' && (
                <button
                  type="button"
                  onClick={() => {
                    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
                      setError('Please enter your name, email, and mobile number.');
                      return;
                    }
                    setError(null);
                    setStep('payment');
                  }}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg cursor-pointer"
                >
                  Proceed to Payment
                </button>
              )}

              {step === 'payment' && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleConfirmBooking}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg cursor-pointer disabled:opacity-60"
                >
                  {submitting
                    ? 'Confirming Reservation...'
                    : paymentMethod === 'UPI_QR'
                      ? 'Verify & Confirm UPI Payment'
                      : paymentMethod === 'CARD'
                        ? `Pay ${formatINR(totalAmount)} & Confirm`
                        : 'Hold Room & Pay at Desk'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
