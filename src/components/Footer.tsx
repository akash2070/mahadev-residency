import { HOTEL_INFO } from '../data/hotelContent';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenManageBooking: () => void;
  onOpenStaffPortal: () => void;
}

export function Footer({
  onOpenBooking,
  onOpenManageBooking,
  onOpenStaffPortal,
}: FooterProps) {
  return (
    <footer className="bg-[#FAF9F6] py-12 text-sm text-[#57534E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#E4E0D8]">
        <div className="md:col-span-5">
          <p className="font-display text-xl font-semibold text-[#18181B]">
            {HOTEL_INFO.name}
          </p>
          <p className="mt-2 max-w-sm leading-relaxed">
            49 rooms (14 Single & 35 Double Bed Rooms) with private attached bathrooms & toilets,
            paired with our coastal Karnataka kitchen in Honnavar.
          </p>
          <p className="mt-3 text-xs">
            {HOTEL_INFO.addressLine1}, {HOTEL_INFO.addressLine2}
          </p>
        </div>

        <div className="md:col-span-4 space-y-2">
          <p className="text-xs font-semibold text-[#18181B]">Reservations & Front Desk</p>
          <p className="font-mono text-xs">{HOTEL_INFO.phone} · {HOTEL_INFO.mobile}</p>
          <p className="font-mono text-xs">{HOTEL_INFO.email}</p>
          <p className="text-xs">Check-in {HOTEL_INFO.checkInTime} · Check-out {HOTEL_INFO.checkOutTime}</p>
        </div>

        <div className="md:col-span-3 flex flex-col items-start gap-2.5 text-xs">
          <p className="font-semibold text-[#18181B]">Quick Actions</p>
          <button
            type="button"
            onClick={onOpenBooking}
            className="hover:text-[#0F5257] cursor-pointer"
          >
            Reserve a Room Online
          </button>
          <button
            type="button"
            onClick={onOpenManageBooking}
            className="hover:text-[#0F5257] cursor-pointer"
          >
            Lookup / Manage Booking
          </button>
          <button
            type="button"
            onClick={onOpenStaffPortal}
            className="hover:text-[#0F5257] cursor-pointer"
          >
            Staff Login
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <p>© 2026 Mahadev Residency, Honnavar, Karnataka. All rights reserved.</p>
        <p>Use code HONNAVAR10 for 10% off direct room bookings.</p>
      </div>
    </footer>
  );
}
