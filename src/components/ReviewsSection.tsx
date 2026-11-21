import { useState } from 'react';
import { Star, Plus, X } from 'lucide-react';
import type { GuestReview, RoomType } from '../types/hotel';

interface ReviewsSectionProps {
  reviews: GuestReview[];
  onReviewAdded: (review: GuestReview) => void;
}

const STAY_FILTERS = ['All', 'Family', 'Solo Business', 'Couple', 'Friends'] as const;

export function ReviewsSection({ reviews, onReviewAdded }: ReviewsSectionProps) {
  const [filter, setFilter] = useState<(typeof STAY_FILTERS)[number]>('All');
  const [modalOpen, setModalOpen] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [stayCategory, setStayCategory] = useState<GuestReview['stayCategory']>('Family');
  const [roomType, setRoomType] = useState<RoomType>('Double');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '4.9';

  const visibleReviews =
    filter === 'All' ? reviews : reviews.filter((r) => r.stayCategory === filter);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName,
          originCity,
          stayCategory,
          roomType,
          rating,
          title,
          comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save review.');
      } else {
        onReviewAdded(data.review);
        setGuestName('');
        setOriginCity('');
        setTitle('');
        setComment('');
        setRating(5);
        setModalOpen(false);
      }
    } catch {
      setError('Network error while submitting review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="py-16 sm:py-20 border-b border-[#E4E0D8] bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs font-medium text-[#0F5257] mb-2">
              04. Verified Guest Feedback
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#18181B] tracking-tight">
              Guest Reviews & Stay Stories
            </h2>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[#57534E]">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#18181B]">
                <Star className="w-4 h-4 fill-[#B45309] text-[#B45309]" />
                <span className="font-mono tabular-nums">{avgRating} / 5.0</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{reviews.length} verified stays</span>
              <span aria-hidden="true">·</span>
              <span>Cleanliness 4.9 · Attached Baths 4.9 · Coastal Dining 4.8</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F3F1EC] rounded-lg border border-[#E4E0D8]">
              {STAY_FILTERS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab
                      ? 'bg-white text-[#18181B] shadow-xs'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#0F5257] border border-[#0F5257] hover:bg-[#0F5257] hover:text-white rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Write a Review</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleReviews.map((review) => (
            <article
              key={review.id}
              className="bg-[#FAF9F6] border border-[#E4E0D8] rounded-xl p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < review.rating
                            ? 'fill-[#B45309] text-[#B45309]'
                            : 'text-[#D6D3CD]'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[#57534E]">
                    {review.stayCategory} · {review.roomType} Room
                  </span>
                </div>

                <h3 className="text-base font-semibold text-[#18181B] mb-2">
                  {review.title}
                </h3>
                <p className="text-sm text-[#57534E] leading-relaxed">
                  {review.comment}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-[#E4E0D8] flex items-center justify-between text-xs text-[#57534E]">
                <span className="font-medium text-[#18181B]">
                  {review.guestName}, {review.originCity}
                </span>
                <span>{review.stayedMonth}</span>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Add Guest Review Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submit Guest Review"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-xl max-w-lg w-full border border-[#E4E0D8] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E4E0D8] flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-[#18181B]">
                Share Your Stay Experience
              </h3>
              <button
                type="button"
                aria-label="Close review modal"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#57534E] hover:bg-[#F3F1EC] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#DC2626]">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Your Name
                  </label>
                  <input
                    required
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Rajesh Shetty"
                    className="w-full px-3 py-2 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    City
                  </label>
                  <input
                    required
                    type="text"
                    value={originCity}
                    onChange={(e) => setOriginCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Trip Type
                  </label>
                  <select
                    value={stayCategory}
                    onChange={(e) =>
                      setStayCategory(e.target.value as GuestReview['stayCategory'])
                    }
                    className="w-full px-3 py-2 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  >
                    <option value="Family">Family</option>
                    <option value="Solo Business">Solo Business</option>
                    <option value="Couple">Couple</option>
                    <option value="Friends">Friends</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Room Stayed
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as RoomType)}
                    className="w-full px-3 py-2 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  >
                    <option value="Single">Single Room</option>
                    <option value="Double">Double Bed Room</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Rating
                  </label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                  >
                    <option value={5}>5 Stars</option>
                    <option value={4}>4 Stars</option>
                    <option value={3}>3 Stars</option>
                    <option value={2}>2 Stars</option>
                    <option value={1}>1 Star</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Review Headline
                </label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Clean attached bathroom and wonderful neer dosa"
                  className="w-full px-3 py-2 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#57534E] mb-1">
                  Your Review
                </label>
                <textarea
                  required
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about the room, attached bathroom, dining, or Honnavar travel tips..."
                  className="w-full px-3 py-2 text-sm border border-[#E4E0D8] rounded-lg focus:outline-none focus:border-[#0F5257]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#57534E] hover:text-[#18181B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-[#0F5257] hover:bg-[#0B3E42] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Publishing...' : 'Publish Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
