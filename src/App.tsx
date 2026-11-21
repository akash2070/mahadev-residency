import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { RoomsAndAvailability } from './components/RoomsAndAvailability';
import { DiningSection } from './components/DiningSection';
import { GallerySection } from './components/GallerySection';
import { ReviewsSection } from './components/ReviewsSection';
import { LocationHonnavar } from './components/LocationHonnavar';
import { Footer } from './components/Footer';
import { BookingModal } from './components/BookingModal';
import { ManageBookingModal } from './components/ManageBookingModal';
import { StaffDashboard } from './components/StaffDashboard';
import { StaffLoginGate } from './components/StaffLoginGate';
import type { GuestReview, MealPlan, RoomType } from './types/hotel';
import { addDaysYMD, getTodayYMD } from './utils/dateUtils';

export default function App() {
  const [viewMode, setViewMode] = useState<'guest' | 'staff'>(() =>
    window.location.hash === '#staff' ? 'staff' : 'guest'
  );
  // Staff token kept strictly in React memory (never persisted in localStorage/sessionStorage)
  const [staffToken, setStaffToken] = useState<string | null>(null);

  const [checkIn, setCheckIn] = useState<string>(() => getTodayYMD());
  const [checkOut, setCheckOut] = useState<string>(() => addDaysYMD(getTodayYMD(), 2));
  const [roomType, setRoomType] = useState<RoomType>('Double');
  const [roomCount, setRoomCount] = useState<number>(1);
  const [bookingMealPlan, setBookingMealPlan] = useState<MealPlan>('ROOM_ONLY');

  const [singleAvailable, setSingleAvailable] = useState<number>(14);
  const [doubleAvailable, setDoubleAvailable] = useState<number>(35);
  const [reviews, setReviews] = useState<GuestReview[]>([]);

  const [bookingOpen, setBookingOpen] = useState<boolean>(false);
  const [manageOpen, setManageOpen] = useState<boolean>(false);

  const refreshAvailability = useCallback(async () => {
    if (!checkIn || !checkOut || checkOut <= checkIn) return;
    try {
      const res = await fetch(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}`);
      const data = await res.json();
      if (typeof data.singleAvailable === 'number') {
        setSingleAvailable(data.singleAvailable);
        setDoubleAvailable(data.doubleAvailable);
      }
    } catch {
      // Retain existing availability on transient errors
    }
  }, [checkIn, checkOut]);

  const loadReviews = useCallback(async () => {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch {
      // Retain existing reviews on transient errors
    }
  }, []);

  useEffect(() => {
    refreshAvailability();
  }, [refreshAvailability]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#staff') {
        setViewMode('staff');
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const enterStaffPortal = () => {
    window.history.replaceState(null, '', '#staff');
    setViewMode('staff');
  };

  const exitStaffPortal = () => {
    if (window.location.hash === '#staff') {
      window.history.replaceState(null, '', '#top');
    }
    setViewMode('guest');
    refreshAvailability();
  };

  if (viewMode === 'staff') {
    if (!staffToken) {
      return (
        <StaffLoginGate
          onAuthenticated={(token) => setStaffToken(token)}
          onBackToSite={exitStaffPortal}
        />
      );
    }
    return (
      <StaffDashboard
        staffToken={staffToken}
        onSignOut={() => setStaffToken(null)}
        onBackToSite={exitStaffPortal}
        onDataChanged={refreshAvailability}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#18181B]">
      <Navbar
        onOpenBooking={() => {
          setBookingMealPlan('ROOM_ONLY');
          setBookingOpen(true);
        }}
      />

      <main>
        <HeroSection
          checkIn={checkIn}
          checkOut={checkOut}
          roomType={roomType}
          roomCount={roomCount}
          singleAvailable={singleAvailable}
          doubleAvailable={doubleAvailable}
          onUpdateSearch={(params) => {
            setCheckIn(params.checkIn);
            setCheckOut(
              params.checkOut <= params.checkIn
                ? addDaysYMD(params.checkIn, 1)
                : params.checkOut
            );
            setRoomType(params.roomType);
            setRoomCount(params.roomCount);
          }}
          onReserveNow={() => {
            setBookingMealPlan('ROOM_ONLY');
            setBookingOpen(true);
          }}
          onOpenManageBooking={() => setManageOpen(true)}
        />

        <RoomsAndAvailability
          checkIn={checkIn}
          checkOut={checkOut}
          singleAvailable={singleAvailable}
          doubleAvailable={doubleAvailable}
          onSelectDateRange={(nextIn, nextOut) => {
            setCheckIn(nextIn);
            setCheckOut(nextOut);
          }}
          onBookRoomType={(type) => {
            setRoomType(type);
            setBookingMealPlan('ROOM_ONLY');
            setBookingOpen(true);
          }}
        />

        <DiningSection
          onBookWithMeals={() => {
            setBookingMealPlan('HALF_BOARD');
            setBookingOpen(true);
          }}
        />

        <GallerySection />

        <ReviewsSection
          reviews={reviews}
          onReviewAdded={(newRev) => setReviews((prev) => [newRev, ...prev])}
        />

        <LocationHonnavar />
      </main>

      <Footer
        onOpenBooking={() => {
          setBookingMealPlan('ROOM_ONLY');
          setBookingOpen(true);
        }}
        onOpenManageBooking={() => setManageOpen(true)}
        onOpenStaffPortal={enterStaffPortal}
      />

      <BookingModal
        isOpen={bookingOpen}
        initialCheckIn={checkIn}
        initialCheckOut={checkOut}
        initialRoomType={roomType}
        initialRoomCount={roomCount}
        initialMealPlan={bookingMealPlan}
        onClose={() => setBookingOpen(false)}
        onBookingCreated={() => {
          refreshAvailability();
        }}
      />

      <ManageBookingModal
        isOpen={manageOpen}
        onClose={() => setManageOpen(false)}
        onBookingUpdated={refreshAvailability}
      />
    </div>
  );
}
