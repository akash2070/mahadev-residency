import { useState } from 'react';
import { Calendar, Search, ArrowRight, Building2 } from 'lucide-react';
import type { RoomType } from '../types/hotel';
import { getTodayYMD } from '../utils/dateUtils';

interface HeroSectionProps {
  checkIn: string;
  checkOut: string;
  roomType: RoomType;
  roomCount: number;
  singleAvailable: number;
  doubleAvailable: number;
  onUpdateSearch: (params: {
    checkIn: string;
    checkOut: string;
    roomType: RoomType;
    roomCount: number;
  }) => void;
  onReserveNow: () => void;
  onOpenManageBooking: () => void;
}

export function HeroSection({
  checkIn,
  checkOut,
  roomType,
  roomCount,
  singleAvailable,
  doubleAvailable,
  onUpdateSearch,
  onReserveNow,
  onOpenManageBooking,
}: HeroSectionProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const today = getTodayYMD();

  const handleSubmitBar = (e: React.FormEvent) => {
    e.preventDefault();
    const el = document.getElementById('rooms');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section id="top" className="pt-10 pb-14 sm:pt-14 sm:pb-16 border-b border-[#E4E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Balanced 2-Column Editorial Hero */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium text-[#57534E] tracking-wide mb-4">
                Honnavar, Uttara Kannada · Karnataka 581334 · NH-66 Coastal Stay & Dining
              </p>
              <h1
                className="font-display font-semibold text-[#18181B] tracking-tight leading-[1.08] mb-5"
                style={{
                  fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                  textWrap: 'balance',
                }}
              >
                Restful coastal stays and Karavali dining in Honnavar.
              </h1>
              <p className="text-base sm:text-lg text-[#57534E] leading-relaxed max-w-xl mb-8">
                Mahadev Residency offers 49 well-kept guest rooms—14 Single Rooms and 35 Double Bed
                Rooms, every unit fitted with a private attached bathroom and western toilet—paired
                with our all-day coastal Karnataka kitchen.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onReserveNow}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5257]"
                >
                  <span>Reserve a Room</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenManageBooking}
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-[#18181B] bg-white border border-[#E4E0D8] hover:bg-[#F3F1EC] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Manage Booking</span>
                </button>
              </div>

              {/* Clean unboxed inventory specification strip */}
              <div className="pt-5 border-t border-[#E4E0D8] grid grid-cols-3 gap-6">
                <div>
                  <div className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                    49
                  </div>
                  <div className="text-xs text-[#57534E] mt-0.5">Total Rooms</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                    14 <span className="text-xs font-sans font-normal text-[#0F5257]">({singleAvailable} free)</span>
                  </div>
                  <div className="text-xs text-[#57534E] mt-0.5">Single · Attached Bath</div>
                </div>
                <div>
                  <div className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                    35 <span className="text-xs font-sans font-normal text-[#0F5257]">({doubleAvailable} free)</span>
                  </div>
                  <div className="text-xs text-[#57534E] mt-0.5">Double · Attached Bath</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[380px] rounded-xl overflow-hidden border border-[#E4E0D8] bg-[#F3F1EC]">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_mahadev_residency_1795294407530.jpg"
                  alt="Mahadev Residency architectural entrance with laterite stone pillars and palm garden in Honnavar"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#F3F1EC] to-[#E4E0D8]">
                  <Building2 className="w-12 h-12 text-[#0F5257] mb-3" />
                  <p className="font-display text-xl font-semibold text-[#18181B]">
                    Mahadev Residency, Honnavar
                  </p>
                  <p className="text-sm text-[#57534E] mt-1">
                    49 Rooms · Coastal Stay & Karavali Dining
                  </p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
                <p className="text-xs font-medium text-white/85">
                  Kasarkod Junction · 4.1 km from Kasarkod Blue Flag Beach
                </p>
                <p className="text-sm font-medium mt-1">
                  Check-in 12:00 PM · Instant UPI QR Confirmation & Auto Email Receipt
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width Booking & Availability Bar below hero split */}
        <form
          onSubmit={handleSubmitBar}
          className="mt-10 bg-white border border-[#E4E0D8] rounded-xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
        >
          <div>
            <label htmlFor="hero-checkin" className="block text-xs font-medium text-[#57534E] mb-1.5">
              Check-In Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="hero-checkin"
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => {
                  const nextIn = e.target.value;
                  const nextOut = nextIn >= checkOut ? '' : checkOut;
                  onUpdateSearch({
                    checkIn: nextIn,
                    checkOut: nextOut || nextIn,
                    roomType,
                    roomCount,
                  });
                }}
                className="w-full pl-9 pr-3 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#E4E0D8] rounded-lg text-[#18181B] focus:outline-none focus:border-[#0F5257]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="hero-checkout" className="block text-xs font-medium text-[#57534E] mb-1.5">
              Check-Out Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="hero-checkout"
                type="date"
                min={checkIn}
                value={checkOut}
                onChange={(e) =>
                  onUpdateSearch({
                    checkIn,
                    checkOut: e.target.value,
                    roomType,
                    roomCount,
                  })
                }
                className="w-full pl-9 pr-3 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#E4E0D8] rounded-lg text-[#18181B] focus:outline-none focus:border-[#0F5257]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="hero-roomtype" className="block text-xs font-medium text-[#57534E] mb-1.5">
              Room Category
            </label>
            <select
              id="hero-roomtype"
              value={roomType}
              onChange={(e) =>
                onUpdateSearch({
                  checkIn,
                  checkOut,
                  roomType: e.target.value as RoomType,
                  roomCount,
                })
              }
              className="w-full px-3 py-2.5 text-sm bg-[#FAF9F6] border border-[#E4E0D8] rounded-lg text-[#18181B] focus:outline-none focus:border-[#0F5257]"
            >
              <option value="Single">Single Room (14 Units · ₹1,450)</option>
              <option value="Double">Double Bed Room (35 Units · ₹2,350)</option>
            </select>
          </div>

          <div>
            <label htmlFor="hero-roomcount" className="block text-xs font-medium text-[#57534E] mb-1.5">
              Number of Rooms
            </label>
            <select
              id="hero-roomcount"
              value={roomCount}
              onChange={(e) =>
                onUpdateSearch({
                  checkIn,
                  checkOut,
                  roomType,
                  roomCount: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#E4E0D8] rounded-lg text-[#18181B] focus:outline-none focus:border-[#0F5257]"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'Room' : 'Rooms'}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Check Availability</span>
          </button>
        </form>
      </div>
    </section>
  );
}
