import { useState } from 'react';
import { MapPin, Copy, Check, Navigation, Train } from 'lucide-react';
import { HONNAVAR_LANDMARKS, HOTEL_INFO } from '../data/hotelContent';

export function LocationHonnavar() {
  const [selectedId, setSelectedId] = useState<string>(HONNAVAR_LANDMARKS[2].id);
  const [copied, setCopied] = useState(false);

  const selectedLandmark =
    HONNAVAR_LANDMARKS.find((l) => l.id === selectedId) || HONNAVAR_LANDMARKS[0];

  const fullAddress = `${HOTEL_INFO.name}, ${HOTEL_INFO.addressLine1}, ${HOTEL_INFO.addressLine2}`;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(fullAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <section id="location" className="py-16 sm:py-20 border-b border-[#E4E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium text-[#0F5257] mb-2">
              05. Honnavar Neighborhood & Transit
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B] tracking-tight">
              Kasarkod Junction, Honnavar
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCopyAddress}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#18181B] bg-white border border-[#E4E0D8] hover:bg-[#F3F1EC] rounded-lg transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#15803D]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Address Copied' : 'Copy Address'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Interactive Honnavar Coastal Vector Map */}
          <div className="lg:col-span-7 bg-white border border-[#E4E0D8] rounded-xl p-5 sm:p-6 flex flex-col justify-between">
            <div className="relative w-full h-80 sm:h-96 rounded-lg overflow-hidden border border-[#E4E0D8] bg-[#EEF3F2]">
              <svg
                viewBox="0 0 600 400"
                className="w-full h-full"
                role="img"
                aria-label="Illustrated map of Mahadev Residency near Sharavathi Bridge and Kasarkod Beach in Honnavar"
              >
                {/* Arabian Sea */}
                <path
                  d="M0,0 L165,0 C150,90 120,165 138,245 C155,315 170,360 180,400 L0,400 Z"
                  fill="#CBE4E6"
                />
                {/* Sharavathi River Estuary */}
                <path
                  d="M128,150 C220,138 340,160 600,122 L600,165 C355,195 225,180 135,195 Z"
                  fill="#CBE4E6"
                />
                {/* Coastal Greens */}
                <circle cx="200" cy="260" r="46" fill="#DCE8DB" />
                <circle cx="430" cy="295" r="64" fill="#DCE8DB" />

                {/* NH-66 Coastal Highway */}
                <path
                  d="M360,0 C340,90 322,165 318,220 C315,280 355,345 390,400"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="4"
                  strokeDasharray="8 6"
                />
                {/* Konkan Railway Line */}
                <path
                  d="M465,0 C452,115 442,230 470,400"
                  fill="none"
                  stroke="#78716C"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                />

                {/* Map Labels */}
                <text x="24" y="55" fill="#0F5257" fontSize="12" fontWeight="600">
                  Arabian Sea
                </text>
                <text x="195" y="162" fill="#0F5257" fontSize="11" fontWeight="500">
                  Sharavathi River
                </text>
                <text x="336" y="42" fill="#B45309" fontSize="10" fontWeight="600">
                  NH-66 Highway
                </text>
                <text x="478" y="42" fill="#57534E" fontSize="10" fontWeight="500">
                  Konkan Rail
                </text>

                {/* Mahadev Residency Central Pin */}
                <g transform="translate(318, 212)">
                  <circle cx="0" cy="0" r="18" fill="#0F5257" fillOpacity="0.16" />
                  <circle cx="0" cy="0" r="8" fill="#0F5257" stroke="#FFFFFF" strokeWidth="2.5" />
                  <rect
                    x="12"
                    y="-14"
                    width="148"
                    height="26"
                    rx="6"
                    fill="#18181B"
                  />
                  <text x="20" y="3" fill="#FFFFFF" fontSize="11" fontWeight="600">
                    Mahadev Residency
                  </text>
                </g>

                {/* Interactive Landmarks */}
                {HONNAVAR_LANDMARKS.map((lm) => {
                  const cx = (lm.mapX / 100) * 600;
                  const cy = (lm.mapY / 100) * 400;
                  const active = lm.id === selectedId;
                  return (
                    <g
                      key={lm.id}
                      transform={`translate(${cx}, ${cy})`}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(lm.id)}
                    >
                      <circle
                        cx="0"
                        cy="0"
                        r={active ? 9 : 6}
                        fill={active ? '#B45309' : '#FFFFFF'}
                        stroke="#18181B"
                        strokeWidth="2"
                      />
                      <text
                        x="10"
                        y="4"
                        fill="#18181B"
                        fontSize="10"
                        fontWeight={active ? '700' : '500'}
                      >
                        {lm.name.split(' ')[0]} {lm.name.split(' ')[1]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Address & Active Pin Detail */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E4E0D8]">
              <div>
                <p className="text-xs font-medium text-[#57534E] mb-1">Property Address</p>
                <p className="text-sm font-semibold text-[#18181B]">{HOTEL_INFO.addressLine1}</p>
                <p className="text-sm text-[#57534E]">{HOTEL_INFO.addressLine2}</p>
                <p className="font-mono text-xs text-[#57534E] mt-1">{HOTEL_INFO.coordinates}</p>
              </div>
              <div className="bg-[#FAF9F6] border border-[#E4E0D8] rounded-lg p-3.5">
                <div className="flex items-center justify-between text-xs text-[#0F5257] font-medium mb-1">
                  <span>{selectedLandmark.category}</span>
                  <span className="font-mono">
                    {selectedLandmark.distance} · {selectedLandmark.driveTime}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#18181B]">{selectedLandmark.name}</p>
                <p className="text-xs text-[#57534E] mt-1">{selectedLandmark.description}</p>
              </div>
            </div>
          </div>

          {/* Right: Honnavar Distances & Travel Perks */}
          <div className="lg:col-span-5 bg-white border border-[#E4E0D8] rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-xl font-semibold text-[#18181B] mb-4">
                Nearby Beaches, Transit & Landmarks
              </h3>
              <div className="divide-y divide-[#E4E0D8]">
                {HONNAVAR_LANDMARKS.map((lm) => {
                  const isActive = lm.id === selectedId;
                  return (
                    <button
                      key={lm.id}
                      type="button"
                      onClick={() => setSelectedId(lm.id)}
                      className={`w-full py-3.5 px-2 text-left flex items-center justify-between gap-4 transition-colors rounded-lg cursor-pointer ${
                        isActive ? 'bg-[#FAF9F6]' : 'hover:bg-[#FAF9F6]/60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            isActive ? 'text-[#0F5257]' : 'text-[#78716C]'
                          }`}
                        />
                        <div>
                          <div className="text-sm font-semibold text-[#18181B]">{lm.name}</div>
                          <div className="text-xs text-[#57534E]">{lm.category}</div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs shrink-0 tabular-nums">
                        <div className="font-semibold text-[#18181B]">{lm.distance}</div>
                        <div className="text-[#57534E]">{lm.driveTime}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E4E0D8] flex items-start gap-3 text-xs text-[#57534E]">
              <Train className="w-4 h-4 text-[#0F5257] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-[#18181B]">
                  Complimentary Honnavar Station Pickup
                </p>
                <p className="mt-0.5">
                  Tick the station pickup option in our booking form if arriving via Konkan Railway
                  (2.4 km away). Dedicated gated parking is included for highway guests.
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-[#57534E]">
              <span className="inline-flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-[#0F5257]" />
                <span>24/7 Front Desk: {HOTEL_INFO.phone}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
