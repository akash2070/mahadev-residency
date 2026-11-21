import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type RoomType = 'Single' | 'Double';
type HousekeepingStatus = 'Clean' | 'Needs Cleaning' | 'Maintenance';
type BookingStatus = 'Pending' | 'Confirmed' | 'Checked In' | 'Checked Out' | 'Cancelled';
type PaymentMethod = 'UPI_QR' | 'CARD' | 'PAY_AT_HOTEL';
type PaymentStatus = 'Paid' | 'Pending';
type MealPlan = 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD';

interface HotelRoom {
  roomNumber: string;
  floor: number;
  type: RoomType;
  baseRate: number;
  hasAttachedBathroom: true;
  hasAttachedToilet: true;
  housekeeping: HousekeepingStatus;
}

interface Booking {
  id: string;
  bookingRef: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomType: RoomType;
  roomCount: number;
  assignedRooms: string[];
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  mealPlan: MealPlan;
  stationPickup: boolean;
  promoCode?: string;
  specialRequests?: string;
  roomSubtotal: number;
  mealSubtotal: number;
  discountAmount: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionRef: string;
  status: BookingStatus;
  createdAt: string;
  source: 'Online' | 'Walk-In Desk';
}

interface EmailConfirmationLog {
  id: string;
  bookingRef: string;
  toEmail: string;
  guestName: string;
  subject: string;
  sentAt: string;
  deliveryStatus: 'Sent' | 'Resent';
  roomSummary: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  paymentSummary: string;
  bodyText: string;
}

interface GuestReview {
  id: string;
  guestName: string;
  originCity: string;
  stayCategory: 'Family' | 'Solo Business' | 'Couple' | 'Friends';
  roomType: RoomType;
  rating: number;
  title: string;
  comment: string;
  stayedMonth: string;
  createdAt: string;
}

interface StaffResetChallenge {
  codeHash: string;
  expiresAt: number;
  attempts: number;
}

interface HotelState {
  rooms: HotelRoom[];
  bookings: Booking[];
  emailLogs: EmailConfirmationLog[];
  reviews: GuestReview[];
  staffCredentialHash?: string;
  staffRecoveryEmail?: string;
  staffResetChallenge?: StaffResetChallenge;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'hotel-state.json');
const SESSION_SIGNING_SECRET =
  process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPasscodeHash(passcode: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hexHash] = parts;
  const expected = Buffer.from(hexHash, 'hex');
  const actual = crypto.scryptSync(passcode, salt, 64);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

function verifyPlainPasscodeConstantTime(input: string, configured: string): boolean {
  const a = crypto.createHash('sha256').update(input).digest();
  const b = crypto.createHash('sha256').update(configured).digest();
  return crypto.timingSafeEqual(a, b);
}

function issueStaffToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'staff',
      exp: Date.now() + 1000 * 60 * 60 * 12,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function isStaffAuthenticated(req: Request): boolean {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      role?: string;
      exp?: number;
    };
    return parsed.role === 'staff' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function requireStaffAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isStaffAuthenticated(req)) {
    res.status(401).json({ error: 'Staff sign-in required.' });
    return;
  }
  next();
}

const ROOM_RATES: Record<RoomType, number> = {
  Single: 1450,
  Double: 2350,
};

const MEAL_RATES: Record<MealPlan, number> = {
  ROOM_ONLY: 0,
  BREAKFAST: 220,
  HALF_BOARD: 550,
};

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDateYMD(dt);
}

function diffNights(checkIn: string, checkOut: string): number {
  const [y1, m1, d1] = checkIn.split('-').map(Number);
  const [y2, m2, d2] = checkOut.split('-').map(Number);
  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
}

function datesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function build49Rooms(): HotelRoom[] {
  const rooms: HotelRoom[] = [];
  // 14 Single Rooms on Floor 1: 101 to 114
  for (let i = 1; i <= 14; i++) {
    rooms.push({
      roomNumber: `1${String(i).padStart(2, '0')}`,
      floor: 1,
      type: 'Single',
      baseRate: ROOM_RATES.Single,
      hasAttachedBathroom: true,
      hasAttachedToilet: true,
      housekeeping: i === 12 ? 'Needs Cleaning' : 'Clean',
    });
  }
  // 18 Double Bed Rooms on Floor 2: 201 to 218
  for (let i = 1; i <= 18; i++) {
    rooms.push({
      roomNumber: `2${String(i).padStart(2, '0')}`,
      floor: 2,
      type: 'Double',
      baseRate: ROOM_RATES.Double,
      hasAttachedBathroom: true,
      hasAttachedToilet: true,
      housekeeping: i === 15 ? 'Needs Cleaning' : 'Clean',
    });
  }
  // 17 Double Bed Rooms on Floor 3: 301 to 317 (14 + 18 + 17 = 49 rooms total)
  for (let i = 1; i <= 17; i++) {
    rooms.push({
      roomNumber: `3${String(i).padStart(2, '0')}`,
      floor: 3,
      type: 'Double',
      baseRate: ROOM_RATES.Double,
      hasAttachedBathroom: true,
      hasAttachedToilet: true,
      housekeeping: 'Clean',
    });
  }
  return rooms;
}

function mealPlanLabel(plan: MealPlan): string {
  if (plan === 'BREAKFAST') return 'Coastal Breakfast Included';
  if (plan === 'HALF_BOARD') return 'Breakfast + Coastal Dinner Thali';
  return 'Room Only (Dining A La Carte)';
}

function paymentMethodLabel(method: PaymentMethod): string {
  if (method === 'UPI_QR') return 'UPI QR Payment';
  if (method === 'CARD') return 'Card / NetBanking';
  return 'Pay at Hotel Front Desk';
}

function buildConfirmationEmail(
  booking: Booking,
  deliveryStatus: 'Sent' | 'Resent' = 'Sent'
): EmailConfirmationLog {
  const roomSummary = `${booking.roomCount} x ${booking.roomType} Room (${booking.assignedRooms.join(', ')}) · Attached Bathroom & Toilet`;
  const paymentSummary = `${paymentMethodLabel(booking.paymentMethod)} · ${booking.paymentStatus} (${booking.transactionRef})`;
  const bodyText = [
    `Namaskara ${booking.guestName},`,
    ``,
    `Thank you for reserving your stay at Mahadev Residency, Honnavar.`,
    `Your booking is ${booking.status.toUpperCase()} with the details below:`,
    ``,
    `Booking Reference : ${booking.bookingRef}`,
    `Room Allocation   : ${roomSummary}`,
    `Check-In          : ${booking.checkIn} (From 12:00 PM)`,
    `Check-Out         : ${booking.checkOut} (By 11:00 AM)`,
    `Duration & Guests : ${booking.nights} Night(s) · ${booking.guestsCount} Guest(s)`,
    `Meal Plan         : ${mealPlanLabel(booking.mealPlan)}`,
    booking.stationPickup ? `Station Pickup    : Complimentary Honnavar Railway Station Pickup Requested` : null,
    ``,
    `Total Tariff      : ₹${booking.totalAmount.toLocaleString('en-IN')} (Incl. 12% GST)`,
    `Payment Details   : ${paymentSummary}`,
    ``,
    `Hotel Address:`,
    `Mahadev Residency, NH-66 Sharavathi Bridge Road,`,
    `Kasarkod Junction, Honnavar, Uttara Kannada, Karnataka 581334`,
    `Front Desk: +91 8387 224 910 | reservations@mahadevresidency.in`,
    ``,
    `We look forward to welcoming you to coastal Honnavar!`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return {
    id: `EM-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    bookingRef: booking.bookingRef,
    toEmail: booking.guestEmail,
    guestName: booking.guestName,
    subject: `Booking Confirmation ${booking.bookingRef} — Mahadev Residency, Honnavar`,
    sentAt: new Date().toISOString(),
    deliveryStatus,
    roomSummary,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalAmount: booking.totalAmount,
    paymentSummary,
    bodyText,
  };
}

function createInitialState(): HotelState {
  const today = formatDateYMD(new Date());
  const rooms = build49Rooms();

  const seedBookings: Booking[] = [
    {
      id: 'bk-1001',
      bookingRef: 'MR-2026-1041',
      guestName: 'Raghavendra Kulkarni',
      guestEmail: 'raghav.kulkarni@example.in',
      guestPhone: '+91 98450 32198',
      roomType: 'Double',
      roomCount: 1,
      assignedRooms: ['201'],
      checkIn: addDays(today, -1),
      checkOut: addDays(today, 2),
      nights: 3,
      guestsCount: 2,
      mealPlan: 'HALF_BOARD',
      stationPickup: false,
      specialRequests: 'Quiet room facing garden palms',
      roomSubtotal: 7050,
      mealSubtotal: 3300,
      discountAmount: 0,
      gstAmount: 1242,
      totalAmount: 11592,
      paymentMethod: 'UPI_QR',
      paymentStatus: 'Paid',
      transactionRef: 'UTR428910547821',
      status: 'Checked In',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      source: 'Online',
    },
    {
      id: 'bk-1002',
      bookingRef: 'MR-2026-1042',
      guestName: 'Ananya Deshpande',
      guestEmail: 'ananya.deshpande@example.in',
      guestPhone: '+91 99001 74520',
      roomType: 'Single',
      roomCount: 1,
      assignedRooms: ['101'],
      checkIn: today,
      checkOut: addDays(today, 2),
      nights: 2,
      guestsCount: 1,
      mealPlan: 'BREAKFAST',
      stationPickup: true,
      specialRequests: 'Arriving by Matsyagandha Express at 1:30 PM',
      roomSubtotal: 2900,
      mealSubtotal: 440,
      discountAmount: 0,
      gstAmount: 401,
      totalAmount: 3741,
      paymentMethod: 'UPI_QR',
      paymentStatus: 'Paid',
      transactionRef: 'UTR428911002394',
      status: 'Confirmed',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: 'Online',
    },
    {
      id: 'bk-1003',
      bookingRef: 'MR-2026-1043',
      guestName: 'Vikramaditya Bhat',
      guestEmail: 'vikram.bhat@example.in',
      guestPhone: '+91 94482 61209',
      roomType: 'Double',
      roomCount: 2,
      assignedRooms: ['202', '203'],
      checkIn: today,
      checkOut: addDays(today, 3),
      nights: 3,
      guestsCount: 4,
      mealPlan: 'HALF_BOARD',
      stationPickup: false,
      promoCode: 'HONNAVAR10',
      specialRequests: 'Adjacent double rooms for family trip to Kasarkod Beach',
      roomSubtotal: 14100,
      mealSubtotal: 6600,
      discountAmount: 1410,
      gstAmount: 2315,
      totalAmount: 21605,
      paymentMethod: 'CARD',
      paymentStatus: 'Paid',
      transactionRef: 'TXN-HDFC-884120',
      status: 'Confirmed',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      source: 'Online',
    },
    {
      id: 'bk-1004',
      bookingRef: 'MR-2026-1044',
      guestName: 'Meera Nair',
      guestEmail: 'meera.nair@example.in',
      guestPhone: '+91 97412 88514',
      roomType: 'Single',
      roomCount: 2,
      assignedRooms: ['102', '103'],
      checkIn: addDays(today, 1),
      checkOut: addDays(today, 4),
      nights: 3,
      guestsCount: 2,
      mealPlan: 'BREAKFAST',
      stationPickup: false,
      roomSubtotal: 8700,
      mealSubtotal: 1320,
      discountAmount: 0,
      gstAmount: 1202,
      totalAmount: 11222,
      paymentMethod: 'UPI_QR',
      paymentStatus: 'Paid',
      transactionRef: 'UTR428918745012',
      status: 'Confirmed',
      createdAt: new Date(Date.now() - 3600000 * 14).toISOString(),
      source: 'Online',
    },
    {
      id: 'bk-1005',
      bookingRef: 'MR-2026-1045',
      guestName: 'Suresh Gowda',
      guestEmail: 'suresh.gowda@example.in',
      guestPhone: '+91 96114 29083',
      roomType: 'Double',
      roomCount: 1,
      assignedRooms: ['301'],
      checkIn: addDays(today, 2),
      checkOut: addDays(today, 5),
      nights: 3,
      guestsCount: 2,
      mealPlan: 'ROOM_ONLY',
      stationPickup: false,
      roomSubtotal: 7050,
      mealSubtotal: 0,
      discountAmount: 0,
      gstAmount: 846,
      totalAmount: 7896,
      paymentMethod: 'PAY_AT_HOTEL',
      paymentStatus: 'Pending',
      transactionRef: 'DESK-HOLD-4091',
      status: 'Pending',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      source: 'Online',
    },
    {
      id: 'bk-1006',
      bookingRef: 'MR-2026-1046',
      guestName: 'Prashanth Hegde',
      guestEmail: 'prashanth.hegde@example.in',
      guestPhone: '+91 94491 53017',
      roomType: 'Single',
      roomCount: 1,
      assignedRooms: ['104'],
      checkIn: addDays(today, -2),
      checkOut: today,
      nights: 2,
      guestsCount: 1,
      mealPlan: 'BREAKFAST',
      stationPickup: false,
      roomSubtotal: 2900,
      mealSubtotal: 440,
      discountAmount: 0,
      gstAmount: 401,
      totalAmount: 3741,
      paymentMethod: 'UPI_QR',
      paymentStatus: 'Paid',
      transactionRef: 'UTR428901229018',
      status: 'Checked Out',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      source: 'Walk-In Desk',
    },
    {
      id: 'bk-1007',
      bookingRef: 'MR-2026-1047',
      guestName: 'Divya Shenoy',
      guestEmail: 'divya.shenoy@example.in',
      guestPhone: '+91 98804 11490',
      roomType: 'Double',
      roomCount: 3,
      assignedRooms: ['204', '205', '206'],
      checkIn: addDays(today, 4),
      checkOut: addDays(today, 7),
      nights: 3,
      guestsCount: 6,
      mealPlan: 'HALF_BOARD',
      stationPickup: true,
      promoCode: 'HONNAVAR10',
      specialRequests: 'Vegetarian coastal thali preferred for all 6 guests',
      roomSubtotal: 21150,
      mealSubtotal: 9900,
      discountAmount: 2115,
      gstAmount: 3472,
      totalAmount: 32407,
      paymentMethod: 'UPI_QR',
      paymentStatus: 'Paid',
      transactionRef: 'UTR428922019481',
      status: 'Confirmed',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      source: 'Online',
    },
  ];

  const emailLogs = seedBookings.map((b) => buildConfirmationEmail(b, 'Sent'));

  const reviews: GuestReview[] = [
    {
      id: 'rev-1',
      guestName: 'Karthik Rao',
      originCity: 'Bengaluru',
      stayCategory: 'Family',
      roomType: 'Double',
      rating: 5,
      title: 'Spotless rooms and authentic Karavali thali right on NH-66',
      comment:
        'Booked two double bed rooms for our family trip to Kasarkod Eco Beach and Apsarakonda. Both rooms had clean attached bathrooms with continuous hot water, and the neer dosa breakfast at their dining hall was outstanding.',
      stayedMonth: 'October 2026',
      createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    },
    {
      id: 'rev-2',
      guestName: 'Sneha Kamath',
      originCity: 'Mangaluru',
      stayCategory: 'Solo Business',
      roomType: 'Single',
      rating: 5,
      title: 'Ideal single room for work travel in Honnavar',
      comment:
        'I travel between Karwar and Udupi frequently. The single room on Floor 1 has reliable Wi-Fi, a solid teak desk, and a very clean attached toilet and shower. Instant UPI QR payment and email receipt made expense filing effortless.',
      stayedMonth: 'November 2026',
      createdAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    },
    {
      id: 'rev-3',
      guestName: 'Arvind & Pallavi Joshi',
      originCity: 'Pune',
      stayCategory: 'Couple',
      roomType: 'Double',
      rating: 5,
      title: 'Warm coastal hospitality near Sharavathi backwaters',
      comment:
        'Staff arranged an early morning auto for our Sharavathi ferry ride and packed fresh filter coffee. Our double room overlooked coconut palms and stayed remarkably quiet.',
      stayedMonth: 'November 2026',
      createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    },
    {
      id: 'rev-4',
      guestName: 'Nitin Pai',
      originCity: 'Hubballi',
      stayCategory: 'Friends',
      roomType: 'Double',
      rating: 4,
      title: 'Great stay & fresh coastal seafood dinner',
      comment:
        'Easy highway access with safe parking for our SUV. The Bangude masala fry and red boiled rice thali in the evening tasted homemade. Clean linen and attentive desk team.',
      stayedMonth: 'October 2026',
      createdAt: new Date(Date.now() - 86400000 * 24).toISOString(),
    },
    {
      id: 'rev-5',
      guestName: 'Dr. Ashwini Nayak',
      originCity: 'Mysuru',
      stayCategory: 'Family',
      roomType: 'Single',
      rating: 5,
      title: 'Hygienic en-suite bathrooms & quick station pickup',
      comment:
        'Requested Honnavar Railway Station pickup during booking and the driver was waiting outside before our train arrived. Even the single rooms feel airy and well ventilated.',
      stayedMonth: 'November 2026',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ];

  return {
    rooms,
    bookings: seedBookings,
    emailLogs,
    reviews,
  };
}

function loadState(): HotelState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STATE_FILE)) {
    const initial = createInitialState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw) as HotelState;
  } catch {
    const initial = createInitialState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function saveState(state: HotelState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function getAvailableRoomsForRange(
  state: HotelState,
  roomType: RoomType,
  checkIn: string,
  checkOut: string
): HotelRoom[] {
  const activeBookings = state.bookings.filter(
    (b) =>
      b.status !== 'Cancelled' &&
      b.status !== 'Checked Out' &&
      b.roomType === roomType &&
      datesOverlap(b.checkIn, b.checkOut, checkIn, checkOut)
  );

  const occupiedRoomNumbers = new Set<string>();
  for (const booking of activeBookings) {
    for (const num of booking.assignedRooms) {
      occupiedRoomNumbers.add(num);
    }
  }

  return state.rooms.filter(
    (r) =>
      r.type === roomType &&
      r.housekeeping !== 'Maintenance' &&
      !occupiedRoomNumbers.has(r.roomNumber)
  );
}

function getAvailabilityForDay(state: HotelState, dateStr: string) {
  const nextDay = addDays(dateStr, 1);
  const singleFree = getAvailableRoomsForRange(state, 'Single', dateStr, nextDay).length;
  const doubleFree = getAvailableRoomsForRange(state, 'Double', dateStr, nextDay).length;
  return {
    date: dateStr,
    singleAvailable: singleFree,
    singleTotal: 14,
    doubleAvailable: doubleFree,
    doubleTotal: 35,
    totalAvailable: singleFree + doubleFree,
    totalRooms: 49,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, property: 'Mahadev Residency', rooms: 49 });
  });

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const sendRecoveryOtpEmail = async (toEmail: string, code: string) => {
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    const fromEmail =
      (process.env.EMAIL_FROM || '').trim() || 'Mahadev Residency <onboarding@resend.dev>';

    if (resendKey) {
      try {
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [toEmail],
            subject: 'Mahadev Residency Staff Passcode Reset Code',
            text: `Your 6-digit Staff Portal reset code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this reset, ignore this email.`,
          }),
        });
        if (!resp.ok) {
          console.error('Resend email delivery failed with status:', resp.status);
        }
        return;
      } catch (err) {
        console.error('Resend email delivery error:', err);
      }
    }

    // Secure fallback when no email API key is configured: log strictly on server console, never in HTTP response
    console.log(`[STAFF RECOVERY OTP] Recovery code for ${toEmail}: ${code} (expires in 10 minutes)`);
  };

  app.get('/api/staff/status', (req: Request, res: Response) => {
    const envPasscode = (process.env.STAFF_PASSCODE || '').trim();
    const state = loadState();
    const effectiveRecovery =
      state.staffRecoveryEmail || (process.env.STAFF_RECOVERY_EMAIL || '').trim().toLowerCase();
    res.json({
      envConfigured: envPasscode.length > 0,
      requiresSetup: envPasscode.length === 0 && !state.staffCredentialHash,
      hasRecoveryEmail: Boolean(effectiveRecovery),
      emailDeliveryMode: (process.env.RESEND_API_KEY || '').trim() ? 'email' : 'server-console',
      authenticated: isStaffAuthenticated(req),
    });
  });

  app.post('/api/staff/setup', (req: Request, res: Response) => {
    const envPasscode = (process.env.STAFF_PASSCODE || '').trim();
    if (envPasscode.length > 0) {
      res.status(403).json({
        error: 'Staff passcode is managed by server environment configuration.',
      });
      return;
    }
    const state = loadState();
    if (state.staffCredentialHash) {
      res.status(403).json({
        error: 'Staff passcode has already been configured. Please sign in.',
      });
      return;
    }
    const { passcode, recoveryEmail } = req.body as {
      passcode?: string;
      recoveryEmail?: string;
    };
    if (!passcode || typeof passcode !== 'string' || passcode.trim().length < 6) {
      res.status(400).json({ error: 'Passcode must be at least 6 characters long.' });
      return;
    }
    if (!recoveryEmail || typeof recoveryEmail !== 'string' || !isValidEmail(recoveryEmail)) {
      res.status(400).json({ error: 'A valid recovery email address is required.' });
      return;
    }
    state.staffCredentialHash = hashPasscode(passcode.trim());
    state.staffRecoveryEmail = recoveryEmail.trim().toLowerCase();
    saveState(state);
    res.status(201).json({ token: issueStaffToken() });
  });

  app.post('/api/staff/login', (req: Request, res: Response) => {
    const { passcode } = req.body as { passcode?: string };
    if (!passcode || typeof passcode !== 'string') {
      res.status(400).json({ error: 'Passcode is required.' });
      return;
    }
    const envPasscode = (process.env.STAFF_PASSCODE || '').trim();
    const state = loadState();

    if (envPasscode.length > 0) {
      if (!verifyPlainPasscodeConstantTime(passcode.trim(), envPasscode)) {
        res.status(401).json({ error: 'Incorrect staff passcode.' });
        return;
      }
      res.json({ token: issueStaffToken() });
      return;
    }

    if (!state.staffCredentialHash) {
      res.status(409).json({ error: 'Staff passcode has not been set up yet.' });
      return;
    }

    if (!verifyPasscodeHash(passcode.trim(), state.staffCredentialHash)) {
      res.status(401).json({ error: 'Incorrect staff passcode.' });
      return;
    }

    res.json({ token: issueStaffToken() });
  });

  app.post('/api/staff/forgot-password', async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const envPasscode = (process.env.STAFF_PASSCODE || '').trim();
    const state = loadState();
    const effectiveRecovery = (
      state.staffRecoveryEmail ||
      process.env.STAFF_RECOVERY_EMAIL ||
      ''
    )
      .trim()
      .toLowerCase();

    const deliveryMode = (process.env.RESEND_API_KEY || '').trim() ? 'email' : 'server-console';

    if (
      !envPasscode &&
      effectiveRecovery &&
      email.trim().toLowerCase() === effectiveRecovery
    ) {
      const otp = String(crypto.randomInt(100000, 1000000));
      state.staffResetChallenge = {
        codeHash: hashPasscode(otp),
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
      };
      saveState(state);
      await sendRecoveryOtpEmail(effectiveRecovery, otp);
    }

    // Uniform response prevents email enumeration and never exposes the OTP in HTTP responses
    res.json({
      ok: true,
      deliveryMode,
      message:
        deliveryMode === 'email'
          ? 'If this email matches the registered staff recovery email, a 6-digit verification code has been emailed.'
          : 'If this email matches the registered staff recovery email, a 6-digit verification code has been generated in the server log.',
    });
  });

  app.post('/api/staff/reset-password', (req: Request, res: Response) => {
    const envPasscode = (process.env.STAFF_PASSCODE || '').trim();
    if (envPasscode.length > 0) {
      res.status(403).json({
        error: 'Staff passcode is locked to server environment secret STAFF_PASSCODE.',
      });
      return;
    }

    const { email, code, newPasscode } = req.body as {
      email?: string;
      code?: string;
      newPasscode?: string;
    };

    if (!email || !isValidEmail(email) || !code || !/^\d{6}$/.test(code.trim())) {
      res.status(400).json({ error: 'Valid recovery email and 6-digit verification code are required.' });
      return;
    }
    if (!newPasscode || newPasscode.trim().length < 6) {
      res.status(400).json({ error: 'New passcode must be at least 6 characters long.' });
      return;
    }

    const state = loadState();
    const effectiveRecovery = (
      state.staffRecoveryEmail ||
      process.env.STAFF_RECOVERY_EMAIL ||
      ''
    )
      .trim()
      .toLowerCase();

    const challenge = state.staffResetChallenge;
    if (!challenge || Date.now() > challenge.expiresAt || challenge.attempts >= 5) {
      state.staffResetChallenge = undefined;
      saveState(state);
      res.status(400).json({ error: 'Verification code is expired or invalid. Please request a new code.' });
      return;
    }

    const emailMatches =
      Boolean(effectiveRecovery) && email.trim().toLowerCase() === effectiveRecovery;
    const codeMatches = verifyPasscodeHash(code.trim(), challenge.codeHash);

    if (!emailMatches || !codeMatches) {
      challenge.attempts += 1;
      if (challenge.attempts >= 5) {
        state.staffResetChallenge = undefined;
      }
      saveState(state);
      res.status(401).json({ error: 'Invalid recovery email or verification code.' });
      return;
    }

    state.staffCredentialHash = hashPasscode(newPasscode.trim());
    state.staffResetChallenge = undefined;
    saveState(state);
    res.json({ token: issueStaffToken() });
  });

  app.get('/api/staff/security', requireStaffAuth, (_req: Request, res: Response) => {
    const envPasscode = (process.env.STAFF_PASSCODE || '').trim();
    const state = loadState();
    const effectiveRecovery =
      state.staffRecoveryEmail || (process.env.STAFF_RECOVERY_EMAIL || '').trim().toLowerCase();
    res.json({
      recoveryEmail: effectiveRecovery || '',
      envConfigured: envPasscode.length > 0,
      emailDeliveryMode: (process.env.RESEND_API_KEY || '').trim() ? 'email' : 'server-console',
    });
  });

  app.post('/api/staff/security', requireStaffAuth, (req: Request, res: Response) => {
    const envPasscode = (process.env.STAFF_PASSCODE || '').trim();
    if (envPasscode.length > 0) {
      res.status(403).json({
        error: 'Staff passcode is managed via server secret STAFF_PASSCODE.',
      });
      return;
    }

    const { currentPasscode, newPasscode, recoveryEmail } = req.body as {
      currentPasscode?: string;
      newPasscode?: string;
      recoveryEmail?: string;
    };

    const state = loadState();
    if (!state.staffCredentialHash || !currentPasscode) {
      res.status(400).json({ error: 'Current passcode is required to update security settings.' });
      return;
    }

    if (!verifyPasscodeHash(currentPasscode.trim(), state.staffCredentialHash)) {
      res.status(401).json({ error: 'Current passcode is incorrect.' });
      return;
    }

    if (newPasscode !== undefined && newPasscode.trim().length > 0) {
      if (newPasscode.trim().length < 6) {
        res.status(400).json({ error: 'New passcode must be at least 6 characters long.' });
        return;
      }
      state.staffCredentialHash = hashPasscode(newPasscode.trim());
    }

    if (recoveryEmail !== undefined && recoveryEmail.trim().length > 0) {
      if (!isValidEmail(recoveryEmail)) {
        res.status(400).json({ error: 'Please provide a valid recovery email address.' });
        return;
      }
      state.staffRecoveryEmail = recoveryEmail.trim().toLowerCase();
    }

    state.staffResetChallenge = undefined;
    saveState(state);
    res.json({
      ok: true,
      recoveryEmail: state.staffRecoveryEmail || '',
    });
  });

  app.get('/api/rooms', requireStaffAuth, (_req: Request, res: Response) => {
    const state = loadState();
    const today = formatDateYMD(new Date());
    const tomorrow = addDays(today, 1);
    const activeToday = state.bookings.filter(
      (b) =>
        (b.status === 'Confirmed' || b.status === 'Checked In' || b.status === 'Pending') &&
        datesOverlap(b.checkIn, b.checkOut, today, tomorrow)
    );

    const occupiedMap = new Map<string, Booking>();
    for (const b of activeToday) {
      for (const rm of b.assignedRooms) {
        occupiedMap.set(rm, b);
      }
    }

    const enrichedRooms = state.rooms.map((r) => {
      const currentBooking = occupiedMap.get(r.roomNumber);
      return {
        ...r,
        occupancyStatus: currentBooking
          ? currentBooking.status === 'Checked In'
            ? 'Occupied'
            : 'Reserved'
          : 'Vacant',
        currentGuest: currentBooking ? currentBooking.guestName : null,
        currentBookingRef: currentBooking ? currentBooking.bookingRef : null,
      };
    });

    res.json({
      rooms: enrichedRooms,
      summary: {
        total: 49,
        single: 14,
        double: 35,
      },
    });
  });

  app.patch('/api/rooms/:roomNumber', requireStaffAuth, (req: Request, res: Response) => {
    const { roomNumber } = req.params;
    const { housekeeping } = req.body as { housekeeping?: HousekeepingStatus };
    if (!housekeeping || !['Clean', 'Needs Cleaning', 'Maintenance'].includes(housekeeping)) {
      res.status(400).json({ error: 'Invalid housekeeping status' });
      return;
    }
    const state = loadState();
    const room = state.rooms.find((r) => r.roomNumber === roomNumber);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    room.housekeeping = housekeeping;
    saveState(state);
    res.json({ room });
  });

  app.get('/api/availability', (req: Request, res: Response) => {
    const state = loadState();
    const checkIn = typeof req.query.checkIn === 'string' ? req.query.checkIn : null;
    const checkOut = typeof req.query.checkOut === 'string' ? req.query.checkOut : null;

    if (checkIn && checkOut) {
      const nights = diffNights(checkIn, checkOut);
      if (nights <= 0) {
        res.status(400).json({ error: 'Check-out date must be after check-in date' });
        return;
      }
      const singleRooms = getAvailableRoomsForRange(state, 'Single', checkIn, checkOut);
      const doubleRooms = getAvailableRoomsForRange(state, 'Double', checkIn, checkOut);
      res.json({
        checkIn,
        checkOut,
        nights,
        singleAvailable: singleRooms.length,
        singleTotal: 14,
        doubleAvailable: doubleRooms.length,
        doubleTotal: 35,
      });
      return;
    }

    const now = new Date();
    const monthParam =
      typeof req.query.month === 'string' && /^\d{4}-\d{2}$/.test(req.query.month)
        ? req.query.month
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [year, month] = monthParam.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push(getAvailabilityForDay(state, dateStr));
    }

    res.json({
      month: monthParam,
      days,
      inventory: {
        totalRooms: 49,
        singleTotal: 14,
        doubleTotal: 35,
      },
    });
  });

  app.get('/api/bookings', (req: Request, res: Response) => {
    const state = loadState();
    const isStaff = isStaffAuthenticated(req);
    const query = typeof req.query.query === 'string' ? req.query.query.trim().toLowerCase() : '';
    let results = [...state.bookings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (!isStaff) {
      // Unauthenticated guests can only look up their own exact booking reference, email, or phone
      if (!query) {
        res.status(401).json({ error: 'Staff sign-in or exact booking reference required.' });
        return;
      }
      results = results.filter(
        (b) =>
          b.bookingRef.toLowerCase() === query ||
          b.guestEmail.toLowerCase() === query ||
          b.guestPhone.replace(/\s+/g, '').toLowerCase() === query.replace(/\s+/g, '')
      );
      res.json({ bookings: results });
      return;
    }

    if (query) {
      results = results.filter(
        (b) =>
          b.bookingRef.toLowerCase().includes(query) ||
          b.guestEmail.toLowerCase().includes(query) ||
          b.guestPhone.toLowerCase().includes(query) ||
          b.guestName.toLowerCase().includes(query)
      );
    }
    res.json({ bookings: results });
  });

  app.post('/api/bookings', (req: Request, res: Response) => {
    const body = req.body as Partial<Booking> & {
      guestName?: string;
      guestEmail?: string;
      guestPhone?: string;
      roomType?: RoomType;
      roomCount?: number;
      checkIn?: string;
      checkOut?: string;
      guestsCount?: number;
      mealPlan?: MealPlan;
      stationPickup?: boolean;
      promoCode?: string;
      specialRequests?: string;
      paymentMethod?: PaymentMethod;
      transactionRef?: string;
      source?: 'Online' | 'Walk-In Desk';
    };

    if (body.source === 'Walk-In Desk' && !isStaffAuthenticated(req)) {
      res.status(401).json({ error: 'Staff authentication required for walk-in desk bookings.' });
      return;
    }

    if (!body.guestName?.trim() || !body.guestEmail?.trim() || !body.guestPhone?.trim()) {
      res.status(400).json({ error: 'Guest name, email, and phone number are required.' });
      return;
    }
    if (!body.roomType || !['Single', 'Double'].includes(body.roomType)) {
      res.status(400).json({ error: 'Valid room type (Single or Double) is required.' });
      return;
    }
    if (!body.checkIn || !body.checkOut) {
      res.status(400).json({ error: 'Check-in and check-out dates are required.' });
      return;
    }

    const nights = diffNights(body.checkIn, body.checkOut);
    if (nights <= 0 || nights > 30) {
      res.status(400).json({ error: 'Stay duration must be between 1 and 30 nights.' });
      return;
    }

    const roomCount = Math.max(1, Math.min(10, Number(body.roomCount) || 1));
    const state = loadState();
    const availableRooms = getAvailableRoomsForRange(
      state,
      body.roomType,
      body.checkIn,
      body.checkOut
    );

    if (availableRooms.length < roomCount) {
      res.status(409).json({
        error: `Only ${availableRooms.length} ${body.roomType} room(s) available for the selected dates.`,
      });
      return;
    }

    const assignedRooms = availableRooms.slice(0, roomCount).map((r) => r.roomNumber);
    const mealPlan: MealPlan =
      body.mealPlan && ['ROOM_ONLY', 'BREAKFAST', 'HALF_BOARD'].includes(body.mealPlan)
        ? body.mealPlan
        : 'ROOM_ONLY';

    const roomSubtotal = ROOM_RATES[body.roomType] * roomCount * nights;
    const guestsCount = Math.max(1, Number(body.guestsCount) || roomCount);
    const mealSubtotal = MEAL_RATES[mealPlan] * guestsCount * nights;
    const promoNormalized = body.promoCode?.trim().toUpperCase();
    const discountAmount = promoNormalized === 'HONNAVAR10' ? Math.round(roomSubtotal * 0.1) : 0;
    const taxable = Math.max(0, roomSubtotal + mealSubtotal - discountAmount);
    const gstAmount = Math.round(taxable * 0.12);
    const totalAmount = taxable + gstAmount;

    const paymentMethod: PaymentMethod =
      body.paymentMethod && ['UPI_QR', 'CARD', 'PAY_AT_HOTEL'].includes(body.paymentMethod)
        ? body.paymentMethod
        : 'UPI_QR';

    const paymentStatus: PaymentStatus = paymentMethod === 'PAY_AT_HOTEL' ? 'Pending' : 'Paid';
    const status: BookingStatus = paymentMethod === 'PAY_AT_HOTEL' ? 'Pending' : 'Confirmed';

    const nextSeq = 1048 + state.bookings.length;
    const bookingRef = `MR-2026-${nextSeq}`;
    const transactionRef =
      body.transactionRef?.trim() ||
      (paymentMethod === 'UPI_QR'
        ? `UTR${Math.floor(428900000000 + Math.random() * 99999999)}`
        : paymentMethod === 'CARD'
          ? `TXN-CARD-${Math.floor(100000 + Math.random() * 899999)}`
          : `DESK-HOLD-${Math.floor(1000 + Math.random() * 8999)}`);

    const newBooking: Booking = {
      id: `bk-${Date.now()}`,
      bookingRef,
      guestName: body.guestName.trim(),
      guestEmail: body.guestEmail.trim(),
      guestPhone: body.guestPhone.trim(),
      roomType: body.roomType,
      roomCount,
      assignedRooms,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      nights,
      guestsCount,
      mealPlan,
      stationPickup: Boolean(body.stationPickup),
      promoCode: promoNormalized === 'HONNAVAR10' ? 'HONNAVAR10' : undefined,
      specialRequests: body.specialRequests?.trim() || undefined,
      roomSubtotal,
      mealSubtotal,
      discountAmount,
      gstAmount,
      totalAmount,
      paymentMethod,
      paymentStatus,
      transactionRef,
      status,
      createdAt: new Date().toISOString(),
      source: body.source === 'Walk-In Desk' ? 'Walk-In Desk' : 'Online',
    };

    const emailLog = buildConfirmationEmail(newBooking, 'Sent');
    state.bookings.unshift(newBooking);
    state.emailLogs.unshift(emailLog);
    saveState(state);

    res.status(201).json({
      booking: newBooking,
      emailConfirmation: emailLog,
    });
  });

  app.patch('/api/bookings/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, paymentStatus, guestEmail } = req.body as {
      status?: BookingStatus;
      paymentStatus?: PaymentStatus;
      guestEmail?: string;
    };

    const isStaff = isStaffAuthenticated(req);
    const state = loadState();
    const booking = state.bookings.find((b) => b.id === id || b.bookingRef === id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    if (!isStaff) {
      // Guest self-service is restricted strictly to cancelling their own verified booking
      if (
        status !== 'Cancelled' ||
        paymentStatus !== undefined ||
        !guestEmail ||
        guestEmail.trim().toLowerCase() !== booking.guestEmail.toLowerCase()
      ) {
        res.status(401).json({ error: 'Staff sign-in required for this operation.' });
        return;
      }
      booking.status = 'Cancelled';
      saveState(state);
      res.json({ booking });
      return;
    }

    if (status && ['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled'].includes(status)) {
      booking.status = status;
      if (status === 'Checked Out') {
        for (const rmNum of booking.assignedRooms) {
          const rm = state.rooms.find((r) => r.roomNumber === rmNum);
          if (rm) rm.housekeeping = 'Needs Cleaning';
        }
      }
    }

    if (paymentStatus && ['Paid', 'Pending'].includes(paymentStatus)) {
      booking.paymentStatus = paymentStatus;
    }

    saveState(state);
    res.json({ booking });
  });

  app.post('/api/bookings/:id/resend-email', (req: Request, res: Response) => {
    const { id } = req.params;
    const { guestEmail } = (req.body || {}) as { guestEmail?: string };
    const isStaff = isStaffAuthenticated(req);

    const state = loadState();
    const booking = state.bookings.find((b) => b.id === id || b.bookingRef === id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    if (
      !isStaff &&
      (!guestEmail || guestEmail.trim().toLowerCase() !== booking.guestEmail.toLowerCase())
    ) {
      res.status(401).json({ error: 'Email verification or staff sign-in required.' });
      return;
    }

    const emailLog = buildConfirmationEmail(booking, 'Resent');
    state.emailLogs.unshift(emailLog);
    saveState(state);
    res.json({ emailConfirmation: emailLog });
  });

  app.get('/api/emails', requireStaffAuth, (_req: Request, res: Response) => {
    const state = loadState();
    res.json({ emails: state.emailLogs });
  });

  app.get('/api/reviews', (_req: Request, res: Response) => {
    const state = loadState();
    res.json({ reviews: state.reviews });
  });

  app.post('/api/reviews', (req: Request, res: Response) => {
    const body = req.body as Partial<GuestReview>;
    if (!body.guestName?.trim() || !body.title?.trim() || !body.comment?.trim()) {
      res.status(400).json({ error: 'Name, review headline, and comment are required.' });
      return;
    }
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
    const roomType: RoomType = body.roomType === 'Single' ? 'Single' : 'Double';
    const stayCategory =
      body.stayCategory && ['Family', 'Solo Business', 'Couple', 'Friends'].includes(body.stayCategory)
        ? body.stayCategory
        : 'Family';

    const newReview: GuestReview = {
      id: `rev-${Date.now()}`,
      guestName: body.guestName.trim(),
      originCity: body.originCity?.trim() || 'Karnataka',
      stayCategory,
      roomType,
      rating,
      title: body.title.trim(),
      comment: body.comment.trim(),
      stayedMonth: 'November 2026',
      createdAt: new Date().toISOString(),
    };

    const state = loadState();
    state.reviews.unshift(newReview);
    saveState(state);
    res.status(201).json({ review: newReview });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Mahadev Residency server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
