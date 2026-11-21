import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  CalendarCheck,
  BedDouble,
  Mail,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  XCircle,
  Send,
  X,
  Shield,
} from 'lucide-react';
import type {
  Booking,
  BookingStatus,
  EmailConfirmationLog,
  HotelRoom,
  HousekeepingStatus,
  RoomType,
} from '../types/hotel';
import { addDaysYMD, formatDisplayDate, formatINR, getTodayYMD } from '../utils/dateUtils';

interface EnrichedRoom extends HotelRoom {
  occupancyStatus: 'Occupied' | 'Reserved' | 'Vacant';
  currentGuest: string | null;
  currentBookingRef: string | null;
}

interface StaffDashboardProps {
  staffToken: string;
  onSignOut: () => void;
  onBackToSite: () => void;
  onDataChanged: () => void;
}

type DashboardTab = 'reservations' | 'rooms' | 'emails' | 'security';

export function StaffDashboard({
  staffToken,
  onSignOut,
  onBackToSite,
  onDataChanged,
}: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>('reservations');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<EnrichedRoom[]>([]);
  const [emails, setEmails] = useState<EmailConfirmationLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [roomFilter, setRoomFilter] = useState<'ALL' | RoomType>('ALL');
  const [selectedEmail, setSelectedEmail] = useState<EmailConfirmationLog | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  // Walk-in Modal state
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInEmail, setWalkInEmail] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInType, setWalkInType] = useState<RoomType>('Double');
  const [walkInCheckIn, setWalkInCheckIn] = useState(getTodayYMD());
  const [walkInCheckOut, setWalkInCheckOut] = useState(addDaysYMD(getTodayYMD(), 1));
  const [walkInError, setWalkInError] = useState<string | null>(null);

  // Security Settings state
  const [secRecoveryEmail, setSecRecoveryEmail] = useState('');
  const [secEnvConfigured, setSecEnvConfigured] = useState(false);
  const [secEmailDelivery, setSecEmailDelivery] = useState<'email' | 'server-console'>('server-console');
  const [secCurrentPasscode, setSecCurrentPasscode] = useState('');
  const [secNewPasscode, setSecNewPasscode] = useState('');
  const [secError, setSecError] = useState<string | null>(null);
  const [secSaving, setSecSaving] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${staffToken}`,
    'Content-Type': 'application/json',
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${staffToken}` };
      const [bRes, rRes, eRes, sRes] = await Promise.all([
        fetch('/api/bookings', { headers }),
        fetch('/api/rooms', { headers }),
        fetch('/api/emails', { headers }),
        fetch('/api/staff/security', { headers }),
      ]);
      if (bRes.status === 401 || rRes.status === 401 || eRes.status === 401) {
        onSignOut();
        return;
      }
      const [bData, rData, eData, sData] = await Promise.all([
        bRes.json(),
        rRes.json(),
        eRes.json(),
        sRes.ok ? sRes.json() : Promise.resolve({}),
      ]);
      setBookings(bData.bookings || []);
      setRooms(rData.rooms || []);
      const emailList: EmailConfirmationLog[] = eData.emails || [];
      setEmails(emailList);
      if (emailList.length > 0) {
        setSelectedEmail((prev) => prev || emailList[0]);
      }
      if (sData && typeof sData.recoveryEmail === 'string') {
        setSecRecoveryEmail(sData.recoveryEmail);
        setSecEnvConfigured(Boolean(sData.envConfigured));
        setSecEmailDelivery(sData.emailDeliveryMode === 'email' ? 'email' : 'server-console');
      }
    } finally {
      setLoading(false);
    }
  }, [staffToken, onSignOut]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const showToast = (msg: string) => {
    setActionBanner(msg);
    setTimeout(() => setActionBanner(null), 3500);
  };

  const updateBooking = async (
    id: string,
    payload: { status?: BookingStatus; paymentStatus?: 'Paid' | 'Pending' },
    msg: string
  ) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(payload),
    });
    if (res.status === 401) {
      onSignOut();
      return;
    }
    if (res.ok) {
      await loadAllData();
      onDataChanged();
      showToast(msg);
    }
  };

  const handleResendEmail = async (booking: Booking) => {
    const res = await fetch(`/api/bookings/${booking.id}/resend-email`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (res.status === 401) {
      onSignOut();
      return;
    }
    if (res.ok) {
      await loadAllData();
      showToast(`Confirmation email resent to ${booking.guestEmail}`);
    }
  };

  const cycleHousekeeping = async (room: EnrichedRoom) => {
    const order: HousekeepingStatus[] = ['Clean', 'Needs Cleaning', 'Maintenance'];
    const next = order[(order.indexOf(room.housekeeping) + 1) % order.length];
    const res = await fetch(`/api/rooms/${room.roomNumber}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ housekeeping: next }),
    });
    if (res.status === 401) {
      onSignOut();
      return;
    }
    if (res.ok) {
      await loadAllData();
      onDataChanged();
      showToast(`Room ${room.roomNumber} marked as ${next}`);
    }
  };

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalkInError(null);
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        guestName: walkInName,
        guestEmail: walkInEmail,
        guestPhone: walkInPhone,
        roomType: walkInType,
        roomCount: 1,
        checkIn: walkInCheckIn,
        checkOut: walkInCheckOut,
        guestsCount: walkInType === 'Single' ? 1 : 2,
        mealPlan: 'BREAKFAST',
        paymentMethod: 'PAY_AT_HOTEL',
        source: 'Walk-In Desk',
      }),
    });
    if (res.status === 401) {
      onSignOut();
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setWalkInError(data.error || 'Could not create walk-in reservation.');
      return;
    }
    setWalkInName('');
    setWalkInEmail('');
    setWalkInPhone('');
    setWalkInOpen(false);
    await loadAllData();
    onDataChanged();
    showToast(`Walk-in reservation ${data.booking.bookingRef} created & email dispatched.`);
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);
    setSecSaving(true);
    try {
      const res = await fetch('/api/staff/security', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          currentPasscode: secCurrentPasscode,
          newPasscode: secNewPasscode.trim() || undefined,
          recoveryEmail: secRecoveryEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401 && data.error === 'Staff sign-in required.') {
        onSignOut();
        return;
      }
      if (!res.ok) {
        setSecError(data.error || 'Could not update security settings.');
      } else {
        setSecCurrentPasscode('');
        setSecNewPasscode('');
        showToast('Staff passcode and recovery email updated.');
      }
    } catch {
      setSecError('Network error while saving security settings.');
    } finally {
      setSecSaving(false);
    }
  };

  // KPIs
  const occupiedCount = rooms.filter((r) => r.occupancyStatus !== 'Vacant').length;
  const singleVacantCount = rooms.filter(
    (r) => r.type === 'Single' && r.occupancyStatus === 'Vacant'
  ).length;
  const doubleVacantCount = rooms.filter(
    (r) => r.type === 'Double' && r.occupancyStatus === 'Vacant'
  ).length;
  const confirmedRevenue = bookings
    .filter((b) => b.status !== 'Cancelled')
    .reduce((sum, b) => sum + b.totalAmount, 0);

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (roomFilter !== 'ALL' && b.roomType !== roomFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      return (
        b.bookingRef.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.guestPhone.toLowerCase().includes(q) ||
        b.guestEmail.toLowerCase().includes(q) ||
        b.assignedRooms.some((rm) => rm.includes(q))
      );
    }
    return true;
  });

  const renderStatusLabel = (status: BookingStatus) => {
    if (status === 'Confirmed') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (status === 'Checked In') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F5257]">
          <LogIn className="w-3.5 h-3.5 shrink-0" />
          <span>Checked In</span>
        </span>
      );
    }
    if (status === 'Pending') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Pending</span>
        </span>
      );
    }
    if (status === 'Checked Out') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E]">
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Checked Out</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#DC2626]">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Cancelled</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col lg:flex-row">
      {/* Left Sidebar (260px) */}
      <aside className="w-full lg:w-[260px] bg-white border-b lg:border-b-0 lg:border-r border-[#E2E8F0] p-5 flex flex-col justify-between shrink-0">
        <div>
          <div className="pb-5 border-b border-[#E2E8F0]">
            <p className="font-display text-lg font-semibold text-[#0F172A]">
              Mahadev Residency
            </p>
            <p className="text-xs text-[#64748B] mt-0.5">
              Honnavar Front Desk · 49 Rooms
            </p>
          </div>

          <nav className="mt-5 space-y-1" aria-label="Dashboard navigation">
            <button
              type="button"
              onClick={() => setActiveTab('reservations')}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'reservations'
                  ? 'bg-[#0F5257] text-white'
                  : 'text-[#475569] hover:bg-[#F1F5F9]'
              }`}
            >
              <CalendarCheck className="w-4 h-4 shrink-0" />
              <span>Reservations ({bookings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('rooms')}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'rooms'
                  ? 'bg-[#0F5257] text-white'
                  : 'text-[#475569] hover:bg-[#F1F5F9]'
              }`}
            >
              <BedDouble className="w-4 h-4 shrink-0" />
              <span>49-Room Rack</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('emails')}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'emails'
                  ? 'bg-[#0F5257] text-white'
                  : 'text-[#475569] hover:bg-[#F1F5F9]'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span>Email Confirmations ({emails.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-[#0F5257] text-white'
                  : 'text-[#475569] hover:bg-[#F1F5F9]'
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Passcode & Email</span>
            </button>
          </nav>
        </div>

        <div className="pt-5 border-t border-[#E2E8F0] mt-6 space-y-2">
          <button
            type="button"
            onClick={onBackToSite}
            className="w-full px-3 py-2.5 text-sm font-medium text-[#0F172A] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Guest Website</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="w-full px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock & Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Breadcrumb Bar */}
        <header className="bg-white border-b border-[#E2E8F0] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-[#64748B] flex items-center gap-2">
            <span>Mahadev Residency</span>
            <span>/</span>
            <span className="font-semibold text-[#0F172A]">
              {activeTab === 'reservations' && 'Incoming Reservations'}
              {activeTab === 'rooms' && '49-Room Rack & Housekeeping'}
              {activeTab === 'emails' && 'Automated Confirmation Outbox'}
              {activeTab === 'security' && 'Passcode & Recovery Email'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setWalkInOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Walk-In Booking</span>
          </button>
        </header>

        <div className="p-6 space-y-6">
          {actionBanner && (
            <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-sm text-[#15803D] flex items-center justify-between">
              <span>{actionBanner}</span>
              <button
                type="button"
                onClick={() => setActionBanner(null)}
                className="text-xs underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* 4-Column Tabular KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <p className="text-xs font-medium text-[#64748B]">Occupied / Reserved Today</p>
              <p className="font-mono text-2xl font-semibold text-[#0F172A] mt-1 tabular-nums">
                {occupiedCount} <span className="text-sm font-normal text-[#64748B]">/ 49</span>
              </p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <p className="text-xs font-medium text-[#64748B]">Single Rooms Vacant (Floor 1)</p>
              <p className="font-mono text-2xl font-semibold text-[#0F172A] mt-1 tabular-nums">
                {singleVacantCount} <span className="text-sm font-normal text-[#64748B]">/ 14</span>
              </p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <p className="text-xs font-medium text-[#64748B]">Double Rooms Vacant (F2 & F3)</p>
              <p className="font-mono text-2xl font-semibold text-[#0F172A] mt-1 tabular-nums">
                {doubleVacantCount} <span className="text-sm font-normal text-[#64748B]">/ 35</span>
              </p>
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
              <p className="text-xs font-medium text-[#64748B]">Active Booking Revenue</p>
              <p className="font-mono text-2xl font-semibold text-[#0F5257] mt-1 tabular-nums">
                {formatINR(confirmedRevenue)}
              </p>
            </div>
          </div>

          {/* TAB 1: INCOMING RESERVATIONS */}
          {activeTab === 'reservations' && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#E2E8F0] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    ['ALL', 'Confirmed', 'Checked In', 'Pending', 'Checked Out', 'Cancelled'] as const
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        statusFilter === st
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-[#F1F5F9] text-[#475569] hover:text-[#0F172A]'
                      }`}
                    >
                      {st === 'ALL' ? 'All Stays' : st}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value as 'ALL' | RoomType)}
                    className="px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg bg-white"
                  >
                    <option value="ALL">All Room Types</option>
                    <option value="Single">Single (14)</option>
                    <option value="Double">Double (35)</option>
                  </select>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search ref, guest, room..."
                      className="pl-8 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg w-56 focus:outline-none focus:border-[#0F5257]"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-[#64748B]">
                  Loading guest reservations...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64748B]">
                  No reservations match your active filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#64748B]">
                        <th className="py-3 px-4">Booking Ref</th>
                        <th className="py-3 px-4">Guest & Contact</th>
                        <th className="py-3 px-4">Room(s)</th>
                        <th className="py-3 px-4">Check-In / Out</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-sm">
                      {filteredBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-4 align-top">
                            <div className="font-mono text-xs font-semibold text-[#0F172A]">
                              {b.bookingRef}
                            </div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">{b.source}</div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-medium text-[#0F172A]">{b.guestName}</div>
                            <div className="text-xs text-[#64748B]">{b.guestPhone}</div>
                            <div className="text-[11px] text-[#64748B]">{b.guestEmail}</div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="font-mono text-xs font-semibold text-[#0F172A]">
                              {b.assignedRooms.join(', ')}
                            </div>
                            <div className="text-xs text-[#64748B]">
                              {b.roomCount} × {b.roomType}
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top font-mono text-xs tabular-nums">
                            <div>{formatDisplayDate(b.checkIn)}</div>
                            <div className="text-[#64748B]">{formatDisplayDate(b.checkOut)}</div>
                          </td>
                          <td className="py-3 px-4 align-top">
                            <div className="text-xs font-medium text-[#0F172A]">
                              {b.paymentMethod === 'UPI_QR'
                                ? 'UPI QR'
                                : b.paymentMethod === 'CARD'
                                  ? 'Card'
                                  : 'At Desk'}
                            </div>
                            <div
                              className={`text-[11px] font-medium ${
                                b.paymentStatus === 'Paid' ? 'text-[#15803D]' : 'text-[#B45309]'
                              }`}
                            >
                              {b.paymentStatus}
                            </div>
                          </td>
                          <td className="py-3 px-4 align-top text-right font-mono text-xs font-semibold tabular-nums">
                            {formatINR(b.totalAmount)}
                          </td>
                          <td className="py-3 px-4 align-top">{renderStatusLabel(b.status)}</td>
                          <td className="py-3 px-4 align-top text-right">
                            <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                              {b.status === 'Pending' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateBooking(
                                      b.id,
                                      { status: 'Confirmed', paymentStatus: 'Paid' },
                                      `${b.bookingRef} confirmed & marked paid.`
                                    )
                                  }
                                  className="px-2.5 py-1 text-xs font-medium bg-[#0F5257] text-white rounded hover:bg-[#0B3E42] cursor-pointer"
                                >
                                  Confirm
                                </button>
                              )}
                              {b.status === 'Confirmed' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateBooking(
                                      b.id,
                                      { status: 'Checked In' },
                                      `${b.guestName} checked into room ${b.assignedRooms.join(', ')}.`
                                    )
                                  }
                                  className="px-2.5 py-1 text-xs font-medium bg-[#0F5257] text-white rounded hover:bg-[#0B3E42] cursor-pointer"
                                >
                                  Check In
                                </button>
                              )}
                              {b.status === 'Checked In' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateBooking(
                                      b.id,
                                      { status: 'Checked Out' },
                                      `${b.bookingRef} checked out. Room marked for housekeeping.`
                                    )
                                  }
                                  className="px-2.5 py-1 text-xs font-medium bg-[#0F172A] text-white rounded hover:bg-[#334155] cursor-pointer"
                                >
                                  Check Out
                                </button>
                              )}
                              <button
                                type="button"
                                title="Resend confirmation email"
                                onClick={() => handleResendEmail(b)}
                                className="px-2 py-1 text-xs border border-[#E2E8F0] rounded hover:bg-[#F1F5F9] cursor-pointer inline-flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>Email</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: 49-ROOM RACK & HOUSEKEEPING */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              {[
                {
                  floor: 1,
                  title: 'Floor 1 · 14 Single Rooms (Rooms 101–114)',
                  subtitle: 'Attached Bathroom & Western Toilet · ₹1,450 / night',
                },
                {
                  floor: 2,
                  title: 'Floor 2 · 18 Double Bed Rooms (Rooms 201–218)',
                  subtitle: 'Attached Bathroom & Western Toilet · ₹2,350 / night',
                },
                {
                  floor: 3,
                  title: 'Floor 3 · 17 Double Bed Rooms (Rooms 301–317)',
                  subtitle: 'Attached Bathroom & Western Toilet · ₹2,350 / night',
                },
              ].map((group) => {
                const floorRooms = rooms.filter((r) => r.floor === group.floor);
                return (
                  <div
                    key={group.floor}
                    className="bg-white border border-[#E2E8F0] rounded-xl p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 mb-4 border-b border-[#E2E8F0]">
                      <h3 className="font-display text-lg font-semibold text-[#0F172A]">
                        {group.title}
                      </h3>
                      <span className="text-xs text-[#64748B]">{group.subtitle}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
                      {floorRooms.map((rm) => {
                        const isOccupied = rm.occupancyStatus === 'Occupied';
                        const isReserved = rm.occupancyStatus === 'Reserved';
                        return (
                          <button
                            key={rm.roomNumber}
                            type="button"
                            onClick={() => cycleHousekeeping(rm)}
                            title="Click to cycle housekeeping status (Clean / Needs Cleaning / Maintenance)"
                            className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                              isOccupied
                                ? 'bg-[#0F5257]/10 border-[#0F5257]'
                                : isReserved
                                  ? 'bg-[#FEF3C7]/60 border-[#D97706]'
                                  : rm.housekeeping === 'Maintenance'
                                    ? 'bg-[#FEF2F2] border-[#FECACA]'
                                    : 'bg-[#F8FAFC] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-semibold text-[#0F172A]">
                                {rm.roomNumber}
                              </span>
                              <span className="text-[10px] font-medium text-[#64748B]">
                                {rm.type === 'Single' ? 'SGL' : 'DBL'}
                              </span>
                            </div>
                            <div className="text-[11px] font-medium mt-1 truncate text-[#0F172A]">
                              {rm.occupancyStatus}
                            </div>
                            <div
                              className={`text-[10px] mt-0.5 truncate ${
                                rm.housekeeping === 'Clean'
                                  ? 'text-[#15803D]'
                                  : rm.housekeeping === 'Needs Cleaning'
                                    ? 'text-[#B45309]'
                                    : 'text-[#DC2626]'
                              }`}
                            >
                              {rm.housekeeping}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: AUTOMATIC EMAIL CONFIRMATIONS OUTBOX */}
          {activeTab === 'emails' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                  Sent Confirmation Emails ({emails.length})
                </div>
                <div className="divide-y divide-[#E2E8F0] max-h-[540px] overflow-y-auto">
                  {emails.map((em) => (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => setSelectedEmail(em)}
                      className={`w-full p-4 text-left transition-colors cursor-pointer ${
                        selectedEmail?.id === em.id ? 'bg-[#F8FAFC]' : 'hover:bg-[#F8FAFC]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-semibold text-[#0F5257]">
                          {em.bookingRef}
                        </span>
                        <span className="text-[#15803D] font-medium">{em.deliveryStatus}</span>
                      </div>
                      <div className="text-sm font-semibold text-[#0F172A] truncate">
                        {em.guestName}
                      </div>
                      <div className="text-xs text-[#64748B] truncate">{em.toEmail}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6">
                {selectedEmail ? (
                  <div className="space-y-4">
                    <div className="pb-4 border-b border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B]">
                        To: <span className="font-mono text-[#0F172A]">{selectedEmail.toEmail}</span>
                      </p>
                      <h3 className="text-base font-semibold text-[#0F172A] mt-1">
                        {selectedEmail.subject}
                      </h3>
                      <p className="font-mono text-xs text-[#64748B] mt-1">
                        Dispatched: {new Date(selectedEmail.sentAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <pre className="font-mono text-xs text-[#334155] whitespace-pre-wrap leading-relaxed bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
                      {selectedEmail.bodyText}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B]">Select a dispatched confirmation email to inspect.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: PASSCODE & RECOVERY EMAIL SETTINGS */}
          {activeTab === 'security' && (
            <div className="max-w-xl bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#0F172A]">
                  Staff Passcode & Recovery Email
                </h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Update your Staff Portal passcode or change the recovery email used for forgot-passcode
                  verification codes.
                </p>
              </div>

              {secEnvConfigured ? (
                <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-sm text-[#475569]">
                  Staff access is currently locked to server secret{' '}
                  <span className="font-mono font-semibold">STAFF_PASSCODE</span>. Update it in
                  Settings → Secrets to rotate the passcode.
                </div>
              ) : (
                <form onSubmit={handleSecuritySave} className="space-y-4">
                  {secError && (
                    <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                      {secError}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-[#475569] mb-1">
                      Current Staff Passcode (required to confirm changes)
                    </label>
                    <input
                      required
                      type="password"
                      value={secCurrentPasscode}
                      onChange={(e) => setSecCurrentPasscode(e.target.value)}
                      placeholder="Enter current passcode"
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#475569] mb-1">
                      Recovery Email Address
                    </label>
                    <input
                      required
                      type="email"
                      value={secRecoveryEmail}
                      onChange={(e) => setSecRecoveryEmail(e.target.value)}
                      placeholder="manager@example.com"
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#475569] mb-1">
                      New Staff Passcode (leave blank to keep existing passcode)
                    </label>
                    <input
                      type="password"
                      value={secNewPasscode}
                      onChange={(e) => setSecNewPasscode(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                    />
                  </div>

                  <p className="text-xs text-[#64748B]">
                    Reset delivery mode:{' '}
                    <span className="font-medium text-[#0F172A]">
                      {secEmailDelivery === 'email'
                        ? 'Real Email via Resend API'
                        : 'Server Console Log (configure RESEND_API_KEY in Secrets to send emails to your inbox)'}
                    </span>
                  </p>

                  <button
                    type="submit"
                    disabled={secSaving}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg cursor-pointer disabled:opacity-60"
                  >
                    {secSaving ? 'Saving...' : 'Save Security Settings'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Walk-In Desk Booking Modal */}
      {walkInOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="New Walk-In Desk Reservation"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full border border-[#E2E8F0] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#0F172A]">
                New Walk-In / Phone Reservation
              </h3>
              <button
                type="button"
                aria-label="Close walk-in modal"
                onClick={() => setWalkInOpen(false)}
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleWalkInSubmit} className="p-5 space-y-3.5">
              {walkInError && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] text-xs text-[#DC2626]">
                  {walkInError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Guest Name</label>
                <input
                  required
                  type="text"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={walkInEmail}
                    onChange={(e) => setWalkInEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Phone</label>
                  <input
                    required
                    type="tel"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Room Type</label>
                <select
                  value={walkInType}
                  onChange={(e) => setWalkInType(e.target.value as RoomType)}
                  className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg"
                >
                  <option value="Single">Single Room (₹1,450/night)</option>
                  <option value="Double">Double Bed Room (₹2,350/night)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Check-In</label>
                  <input
                    type="date"
                    value={walkInCheckIn}
                    onChange={(e) => setWalkInCheckIn(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#E2E8F0] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Check-Out</label>
                  <input
                    type="date"
                    value={walkInCheckOut}
                    onChange={(e) => setWalkInCheckOut(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-[#E2E8F0] rounded-lg"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setWalkInOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#64748B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5257] rounded-lg cursor-pointer"
                >
                  Create & Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
