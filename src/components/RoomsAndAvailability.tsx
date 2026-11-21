import { useState, useEffect } from 'react';
import { Check, ChevronLeft, ChevronRight, Bath, BedDouble, BedSingle, CalendarCheck } from 'lucide-react';
import type { AvailabilityResponse, RoomType } from '../types/hotel';
import { ROOM_CATALOG } from '../data/hotelContent';
import { addDaysYMD, diffDaysYMD, formatDisplayDate, formatINR, getTodayYMD } from '../utils/dateUtils';

interface RoomsAndAvailabilityProps {
  checkIn: string;
  checkOut: string;
  singleAvailable: number;
  doubleAvailable: number;
  onSelectDateRange: (checkIn: string, checkOut: string) => void;
  onBookRoomType: (type: RoomType) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function RoomsAndAvailability({
  checkIn,
  checkOut,
  singleAvailable,
  doubleAvailable,
  onSelectDateRange,
  onBookRoomType,
}: RoomsAndAvailabilityProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [calendarFilter, setCalendarFilter] = useState<'ALL' | 'Single' | 'Double'>('ALL');
  const [monthStr, setMonthStr] = useState(() => {
    const today = getTodayYMD();
    return today.slice(0, 7);
  });
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [loadingCal, setLoadingCal] = useState(false);
  const [pickingStart, setPickingStart] = useState<string | null>(null);

  const nights = Math.max(1, diffDaysYMD(checkIn, checkOut));
  const today = getTodayYMD();

  useEffect(() => {
    let active = true;
    setLoadingCal(true);
    fetch(`/api/availability?month=${monthStr}`)
      .then((res) => res.json())
      .then((data: AvailabilityResponse) => {
        if (active) setAvailability(data);
      })
      .catch(() => {
        // Keep previous state on transient network failure
      })
      .finally(() => {
        if (active) setLoadingCal(false);
      });
    return () => {
      active = false;
    };
  }, [monthStr, checkIn, checkOut]);

  const shiftMonth = (delta: number) => {
    const [y, m] = monthStr.split('-').map(Number);
    const dt = new Date(y, m - 1 + delta, 1);
    const nextStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    setMonthStr(nextStr);
  };

  const handleDayClick = (dateStr: string, totalFree: number) => {
    if (dateStr < today || totalFree === 0) return;

    if (!pickingStart) {
      setPickingStart(dateStr);
      onSelectDateRange(dateStr, addDaysYMD(dateStr, 1));
    } else {
      if (dateStr <= pickingStart) {
        setPickingStart(dateStr);
        onSelectDateRange(dateStr, addDaysYMD(dateStr, 1));
      } else {
        onSelectDateRange(pickingStart, dateStr);
        setPickingStart(null);
      }
    }
  };

  const [calYear, calMonth] = monthStr.split('-').map(Number);
  const firstDayOffset = new Date(calYear, calMonth - 1, 1).getDay();
  const monthLabel = new Date(calYear, calMonth - 1, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <section id="rooms" className="py-16 sm:py-20 border-b border-[#E4E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium text-[#0F5257] mb-2">
              01. Accommodation Inventory · 49 En-Suite Rooms
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B] tracking-tight">
              Single & Double Bed Rooms
            </h2>
          </div>
          <p className="text-sm text-[#57534E] max-w-md">
            Showing live room counts for{' '}
            <span className="font-mono text-[#18181B] font-medium">
              {formatDisplayDate(checkIn)} – {formatDisplayDate(checkOut)}
            </span>{' '}
            ({nights} {nights === 1 ? 'night' : 'nights'}). Every room includes an attached bathroom
            and western toilet.
          </p>
        </div>

        {/* 2 Room Category Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {(['Single', 'Double'] as RoomType[]).map((type) => {
            const spec = ROOM_CATALOG[type];
            const available = type === 'Single' ? singleAvailable : doubleAvailable;
            const isLow = available > 0 && available <= 4;
            const isSoldOut = available === 0;

            return (
              <article
                key={type}
                className="bg-white border border-[#E4E0D8] rounded-xl overflow-hidden flex flex-col"
              >
                <div className="relative h-64 sm:h-72 bg-[#F3F1EC] overflow-hidden">
                  {!imgErrors[type] ? (
                    <img
                      src={spec.image}
                      alt={`${spec.title} at Mahadev Residency Honnavar`}
                      referrerPolicy="no-referrer"
                      onError={() => setImgErrors((prev) => ({ ...prev, [type]: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                      {type === 'Single' ? (
                        <BedSingle className="w-10 h-10 text-[#0F5257] mb-2" />
                      ) : (
                        <BedDouble className="w-10 h-10 text-[#0F5257] mb-2" />
                      )}
                      <p className="font-display text-lg font-medium text-[#18181B]">{spec.title}</p>
                    </div>
                  )}
                </div>

                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#57534E] mb-2">
                      <span>{spec.subtitle}</span>
                      <span
                        className={`font-medium ${
                          isSoldOut
                            ? 'text-[#DC2626]'
                            : isLow
                              ? 'text-[#B45309]'
                              : 'text-[#0F5257]'
                        }`}
                      >
                        {isSoldOut
                          ? 'Sold out for selected dates'
                          : `${available} of ${spec.unitsCount} available`}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-4 mb-4">
                      <h3 className="font-display text-2xl font-semibold text-[#18181B]">
                        {spec.title}
                      </h3>
                      <div className="text-right shrink-0">
                        <span className="font-mono text-2xl font-semibold text-[#18181B] tabular-nums">
                          {formatINR(spec.ratePerNight)}
                        </span>
                        <span className="text-xs text-[#57534E]"> / night</span>
                      </div>
                    </div>

                    <p className="text-sm text-[#57534E] leading-relaxed mb-5">
                      {spec.description}
                    </p>

                    <div className="flex items-center gap-2 text-xs font-medium text-[#18181B] pb-4 mb-4 border-b border-[#E4E0D8]">
                      <Bath className="w-4 h-4 text-[#0F5257] shrink-0" />
                      <span>{spec.bathroomSpec}</span>
                      <span aria-hidden="true" className="text-[#A8A29E]">·</span>
                      <span className="font-mono tabular-nums">{spec.areaSqFt} sq ft</span>
                    </div>

                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-[#3F3F46] mb-6">
                      {spec.amenities.map((amenity) => (
                        <li key={amenity} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-[#0F5257] shrink-0" />
                          <span>{amenity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-[#E4E0D8] flex items-center justify-between gap-4">
                    <div className="text-xs text-[#57534E]">
                      Est. {nights} {nights === 1 ? 'night' : 'nights'} base:{' '}
                      <span className="font-mono font-semibold text-[#18181B] tabular-nums">
                        {formatINR(spec.ratePerNight * nights)}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => onBookRoomType(type)}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] disabled:bg-[#A8A29E] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSoldOut ? 'Unavailable' : `Reserve ${type} Room`}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Interactive Monthly Room Availability Calendar */}
        <div
          id="availability-calendar"
          className="mt-14 bg-white border border-[#E4E0D8] rounded-xl p-5 sm:p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E4E0D8]">
            <div>
              <p className="text-xs font-medium text-[#0F5257] mb-1">
                Interactive Room Availability Calendar
              </p>
              <h3 className="font-display text-2xl font-semibold text-[#18181B]">
                Live Daily Capacity Across All 49 Rooms
              </h3>
              <p className="text-sm text-[#57534E] mt-1">
                {pickingStart
                  ? `Check-in set to ${formatDisplayDate(pickingStart)}. Click a later date to complete your check-out.`
                  : 'Click any date to select your check-in and check-out stay window.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Functional segmented filter tabs */}
              <div className="inline-flex items-center p-1 bg-[#F3F1EC] rounded-lg border border-[#E4E0D8]">
                {(['ALL', 'Single', 'Double'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCalendarFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      calendarFilter === tab
                        ? 'bg-white text-[#18181B] shadow-xs'
                        : 'text-[#57534E] hover:text-[#18181B]'
                    }`}
                  >
                    {tab === 'ALL' ? 'All (49)' : tab === 'Single' ? 'Single (14)' : 'Double (35)'}
                  </button>
                ))}
              </div>

              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => shiftMonth(-1)}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[#E4E0D8] hover:bg-[#F3F1EC] text-[#18181B] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-sm font-medium text-[#18181B] min-w-[140px] text-center">
                  {monthLabel}
                </span>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => shiftMonth(1)}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-[#E4E0D8] hover:bg-[#F3F1EC] text-[#18181B] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Selected Range Summary Strip */}
          <div className="py-4 flex flex-wrap items-center justify-between gap-4 border-b border-[#E4E0D8] text-sm">
            <div className="flex flex-wrap items-center gap-5 text-[#57534E]">
              <span className="inline-flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-[#0F5257]" />
                <span>
                  Selected:{' '}
                  <strong className="font-mono text-[#18181B]">
                    {formatDisplayDate(checkIn)} → {formatDisplayDate(checkOut)}
                  </strong>
                </span>
              </span>
              <span className="text-xs">
                Green = High availability · Amber = Limited (≤5) · Grey = Past / Full
              </span>
            </div>
            <button
              type="button"
              onClick={() => onBookRoomType(calendarFilter === 'Single' ? 'Single' : 'Double')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Book Selected Dates
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 pt-5 pb-2">
            {WEEKDAYS.map((wd) => (
              <div
                key={wd}
                className="text-center text-xs font-medium text-[#57534E] py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          {loadingCal && !availability ? (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 28 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-20 rounded-lg bg-[#F3F1EC] animate-pulse border border-[#E4E0D8]"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 sm:h-20 rounded-lg bg-[#FAF9F6]/50" />
              ))}
              {availability?.days.map((day) => {
                const dayNum = Number(day.date.split('-')[2]);
                const isPast = day.date < today;
                const isInRange = day.date >= checkIn && day.date < checkOut;
                const isEdge = day.date === checkIn || day.date === checkOut;

                const count =
                  calendarFilter === 'Single'
                    ? day.singleAvailable
                    : calendarFilter === 'Double'
                      ? day.doubleAvailable
                      : day.totalAvailable;
                const cap =
                  calendarFilter === 'Single'
                    ? day.singleTotal
                    : calendarFilter === 'Double'
                      ? day.doubleTotal
                      : day.totalRooms;

                const isSoldOut = count === 0;
                const isLimited = count > 0 && count <= 5;

                return (
                  <button
                    key={day.date}
                    type="button"
                    disabled={isPast || isSoldOut}
                    onClick={() => handleDayClick(day.date, count)}
                    className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-lg border text-left flex flex-col justify-between transition-colors cursor-pointer disabled:cursor-not-allowed ${
                      isEdge
                        ? 'bg-[#0F5257] text-white border-[#0F5257]'
                        : isInRange
                          ? 'bg-[#0F5257]/10 text-[#18181B] border-[#0F5257]/40'
                          : isPast || isSoldOut
                            ? 'bg-[#F3F1EC]/70 text-[#A8A29E] border-[#E4E0D8]'
                            : 'bg-white hover:bg-[#FAF9F6] text-[#18181B] border-[#E4E0D8]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono text-xs sm:text-sm font-semibold tabular-nums">
                        {dayNum}
                      </span>
                      {!isPast && (
                        <span
                          className={`hidden sm:inline text-[10px] font-medium ${
                            isEdge
                              ? 'text-white/90'
                              : isSoldOut
                                ? 'text-[#DC2626]'
                                : isLimited
                                  ? 'text-[#B45309]'
                                  : 'text-[#15803D]'
                          }`}
                        >
                          {isSoldOut ? 'Full' : isLimited ? 'Low' : 'Open'}
                        </span>
                      )}
                    </div>

                    {!isPast && (
                      <div className="font-mono text-[10px] sm:text-xs tabular-nums leading-tight">
                        {calendarFilter === 'ALL' ? (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
                            <span>{day.singleAvailable}S</span>
                            <span className="hidden sm:inline opacity-50">·</span>
                            <span>{day.doubleAvailable}D</span>
                          </div>
                        ) : (
                          <span>
                            {count}/{cap}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
