import { useState } from 'react';
import { Utensils, Clock } from 'lucide-react';
import { DINING_MENU } from '../data/hotelContent';
import { formatINR } from '../utils/dateUtils';

interface DiningSectionProps {
  onBookWithMeals: () => void;
}

const CATEGORIES = ['Breakfast', 'Coastal Thali & Mains', 'Beverages'] as const;

export function DiningSection({ onBookWithMeals }: DiningSectionProps) {
  const [activeCat, setActiveCat] = useState<(typeof CATEGORIES)[number]>('Breakfast');
  const [imgFailed, setImgFailed] = useState(false);

  const dishes = DINING_MENU.filter((d) => d.category === activeCat);

  return (
    <section id="dining" className="py-16 sm:py-20 border-b border-[#E4E0D8] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          {/* Left: Dining Photography & Hours */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-[#0F5257] mb-2">
                02. Stay & Coastal Kitchen
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B] tracking-tight mb-4">
                Karavali Dining Hall
              </h2>
              <p className="text-sm sm:text-base text-[#57534E] leading-relaxed mb-6">
                Freshly stone-ground coastal spices, morning neer dosa, and evening banana-leaf
                thalis cooked in-house for resident guests and highway travelers. Room service is
                available to all 49 rooms.
              </p>
            </div>

            <div className="rounded-xl overflow-hidden border border-[#E4E0D8] bg-[#F3F1EC] aspect-[4/3] mb-5">
              {!imgFailed ? (
                <img
                  src="/src/assets/images/coastal_karnataka_dining_1795294406385.jpg"
                  alt="Coastal Karnataka neer dosa and thali served with brass filter coffee at Mahadev Residency"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <Utensils className="w-10 h-10 text-[#0F5257] mb-2" />
                  <p className="font-display text-lg font-medium text-[#18181B]">
                    Karavali Dining Hall
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#E4E0D8] text-xs text-[#57534E]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#0F5257]" />
                <span>Breakfast 7:00–10:30 AM · Lunch & Dinner 12:30–10:30 PM</span>
              </span>
              <span className="font-medium text-[#18181B]">Veg & Coastal Seafood Kitchens</span>
            </div>
          </div>

          {/* Right: Interactive Menu & Meal Plan Add-on */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-[#FAF9F6] border border-[#E4E0D8] rounded-xl p-6 sm:p-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#E4E0D8]">
                <h3 className="font-display text-xl font-semibold text-[#18181B]">
                  House Specialties
                </h3>
                <div className="inline-flex items-center p-1 bg-[#F3F1EC] rounded-lg border border-[#E4E0D8]">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCat(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeCat === cat
                          ? 'bg-white text-[#18181B] shadow-xs'
                          : 'text-[#57534E] hover:text-[#18181B]'
                      }`}
                    >
                      {cat === 'Coastal Thali & Mains' ? 'Thali & Mains' : cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-[#E4E0D8]">
                {dishes.map((dish) => (
                  <div key={dish.id} className="py-4 flex items-start justify-between gap-6">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-semibold text-[#18181B]">{dish.name}</h4>
                        <span className="text-xs text-[#57534E]">· {dish.dietary}</span>
                      </div>
                      <p className="text-sm text-[#57534E] mt-1 leading-relaxed">
                        {dish.description}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[#18181B] tabular-nums shrink-0">
                      {formatINR(dish.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E4E0D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#18181B]">
                  Stay + Meal Packages Available at Checkout
                </p>
                <p className="text-xs text-[#57534E] mt-0.5">
                  Add Coastal Breakfast (+₹220/night) or Breakfast + Dinner Thali (+₹550/night) when
                  reserving your room.
                </p>
              </div>
              <button
                type="button"
                onClick={onBookWithMeals}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Book Stay + Dining
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
