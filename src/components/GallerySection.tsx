import { useState } from 'react';
import { Expand, X, Image as ImageIcon } from 'lucide-react';
import { GALLERY_PHOTOS, type GalleryPhoto } from '../data/hotelContent';

const FILTERS = ['All', 'Rooms', 'Attached Bathroom', 'Coastal Dining', 'Exterior & Lobby'] as const;

export function GallerySection() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});

  const visiblePhotos =
    filter === 'All' ? GALLERY_PHOTOS : GALLERY_PHOTOS.filter((p) => p.category === filter);

  return (
    <section id="gallery" className="py-16 sm:py-20 border-b border-[#E4E0D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium text-[#0F5257] mb-2">
              03. Property Photography
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B] tracking-tight">
              Inside Mahadev Residency
            </h2>
          </div>

          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F3F1EC] rounded-lg border border-[#E4E0D8]">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filter === f
                    ? 'bg-white text-[#18181B] shadow-xs'
                    : 'text-[#57534E] hover:text-[#18181B]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Asymmetric Editorial Photo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visiblePhotos.map((photo, idx) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightbox(photo)}
              className={`group text-left bg-white border border-[#E4E0D8] rounded-xl overflow-hidden flex flex-col cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5257] ${
                filter === 'All' && idx === 0 ? 'md:col-span-2 lg:col-span-2' : ''
              }`}
            >
              <div
                className={`relative w-full bg-[#F3F1EC] overflow-hidden ${
                  filter === 'All' && idx === 0 ? 'h-64 sm:h-80' : 'h-60 sm:h-64'
                }`}
              >
                {!failedIds[photo.id] ? (
                  <img
                    src={photo.src}
                    alt={photo.title}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedIds((prev) => ({ ...prev, [photo.id]: true }))}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <ImageIcon className="w-8 h-8 text-[#0F5257] mb-2" />
                    <span className="text-sm font-medium text-[#18181B]">{photo.title}</span>
                  </div>
                )}
                <span className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/55 text-white inline-flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Expand className="w-4 h-4" />
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-xs text-[#57534E] mb-1">{photo.category}</p>
                <h3 className="text-base font-semibold text-[#18181B]">{photo.title}</h3>
                <p className="text-sm text-[#57534E] mt-1 line-clamp-2">{photo.caption}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full overflow-hidden border border-[#E4E0D8]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E4E0D8]">
              <div>
                <p className="text-xs text-[#57534E]">{lightbox.category}</p>
                <h3 className="font-display text-lg font-semibold text-[#18181B]">
                  {lightbox.title}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close photo preview"
                onClick={() => setLightbox(null)}
                className="w-9 h-9 rounded-lg inline-flex items-center justify-center text-[#57534E] hover:bg-[#F3F1EC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-[#18181B] max-h-[70vh] flex items-center justify-center">
              <img
                src={lightbox.src}
                alt={lightbox.title}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
            <div className="px-5 py-3.5 text-sm text-[#57534E]">{lightbox.caption}</div>
          </div>
        </div>
      )}
    </section>
  );
}
