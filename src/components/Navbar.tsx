import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onOpenBooking: () => void;
}

export function Navbar({ onOpenBooking }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E4E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <a
          href="#top"
          className="font-display text-xl font-semibold tracking-tight text-[#18181B] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F5257]"
        >
          Mahadev Residency
        </a>

        {/* Zone 2: 4 concise customer-facing single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#57534E]"
        >
          <button
            type="button"
            onClick={() => scrollToSection('rooms')}
            className="hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            Rooms
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('availability-calendar')}
            className="hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('dining')}
            className="hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            Dining
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('reviews')}
            className="hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            Reviews
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('location')}
            className="hover:text-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1"
          >
            Location
          </button>
        </nav>

        {/* Zone 3: Single primary CTA + mobile menu toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenBooking}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5257]"
          >
            Book Stay
          </button>
          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E4E0D8] text-[#18181B] hover:bg-[#F3F1EC] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E4E0D8] bg-[#FAF9F6] px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => scrollToSection('rooms')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#18181B] rounded-lg hover:bg-[#F3F1EC]"
          >
            Rooms (14 Single · 35 Double)
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('availability-calendar')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#18181B] rounded-lg hover:bg-[#F3F1EC]"
          >
            Availability Calendar
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('dining')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#18181B] rounded-lg hover:bg-[#F3F1EC]"
          >
            Coastal Dining
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('reviews')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#18181B] rounded-lg hover:bg-[#F3F1EC]"
          >
            Guest Reviews
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('location')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#18181B] rounded-lg hover:bg-[#F3F1EC]"
          >
            Honnavar Location
          </button>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onOpenBooking();
              }}
              className="w-full py-3 text-sm font-medium text-white bg-[#0F5257] rounded-lg"
            >
              Book Stay
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
