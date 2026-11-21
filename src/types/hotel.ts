export type RoomType = 'Single' | 'Double';

export type HousekeepingStatus = 'Clean' | 'Needs Cleaning' | 'Maintenance';

export interface HotelRoom {
  roomNumber: string;
  floor: number;
  type: RoomType;
  baseRate: number;
  hasAttachedBathroom: true;
  hasAttachedToilet: true;
  housekeeping: HousekeepingStatus;
}

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Checked In'
  | 'Checked Out'
  | 'Cancelled';

export type PaymentMethod = 'UPI_QR' | 'CARD' | 'PAY_AT_HOTEL';
export type PaymentStatus = 'Paid' | 'Pending';
export type MealPlan = 'ROOM_ONLY' | 'BREAKFAST' | 'HALF_BOARD';

export interface Booking {
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

export interface EmailConfirmationLog {
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

export interface GuestReview {
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

export interface DayAvailability {
  date: string;
  singleAvailable: number;
  singleTotal: number;
  doubleAvailable: number;
  doubleTotal: number;
  totalAvailable: number;
  totalRooms: number;
}

export interface AvailabilityResponse {
  month: string;
  days: DayAvailability[];
  inventory: {
    totalRooms: number;
    singleTotal: number;
    doubleTotal: number;
  };
}
