import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './room.css';
import { searchRooms } from './services/hotels';
import { getRoomReviews } from './services/guest';
import PriceRangeSlider from './PriceRangeSlider';

const CAT_LABELS = {
  staff: 'Staff', location: 'Location', facilities: 'Facilities',
  cleanliness: 'Cleanliness', comfort: 'Comfort', value: 'Value',
};

const SCORE_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '6+', value: 6 },
  { label: '7+', value: 7 },
  { label: '8+', value: 8 },
  { label: '9+', value: 9 },
];

const SORT_OPTIONS = [
  { value: 'recommended',  label: 'Recommended' },
  { value: 'price_asc',    label: 'Price: Low → High' },
  { value: 'price_desc',   label: 'Price: High → Low' },
  { value: 'score_desc',   label: 'Review Score' },
  { value: 'stars_desc',   label: 'Hotel Stars' },
];

/* ── Reviews modal ── */
function ReviewsModal({ room, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRoomReviews(room.hotelId, room.id).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [room.hotelId, room.id]);

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rvv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rv-modal-header">
          <div>
            <h3>{room.name}</h3>
            <p>{room.hotelName} · {room.city}</p>
            {data && data.reviewCount > 0 && (
              <p style={{ marginTop: 4 }}>
                <span className="rvv-avg">{data.avgScore}</span>
                <span className="rvv-count">/ 10 · {data.reviewCount} review{data.reviewCount !== 1 ? 's' : ''}</span>
              </p>
            )}
          </div>
          <button className="rv-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {loading && <p style={{ color: '#6b7280' }}>Loading reviews…</p>}

        {!loading && data && data.categoryAverages && (
          <div className="rvv-cats">
            {Object.entries(CAT_LABELS).map(([key, label]) => (
              <div key={key} className="rvv-cat-pill">
                <span>{label}</span>
                <span>{data.categoryAverages[key]}</span>
              </div>
            ))}
          </div>
        )}

        {!loading && data && (
          <div className="rvv-list">
            {data.reviews.length === 0 && <p style={{ color: '#9ca3af' }}>No reviews yet.</p>}
            {data.reviews.map((r) => (
              <div key={r.id} className="rvv-item">
                <div className="rvv-item-header">
                  <span className="rvv-item-name">{r.guestName}</span>
                  <span className="rvv-item-score">{r.overallScore}/10</span>
                  <span className="rvv-item-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="rvv-item-comment">{r.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function SearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const incoming = location.state || {};

  const checkIn  = incoming.checkIn  || '';
  const checkOut = incoming.checkOut || '';

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewsRoom, setReviewsRoom] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Filters
  const [destination, setDestination] = useState(incoming.destination || '');
  const [guests, setGuests]           = useState(incoming.guests || 1);
  const [priceMin, setPriceMin]       = useState(null);  // null = no filter
  const [priceMax, setPriceMax]       = useState(null);  // null = no filter
  const [selectedStars, setSelectedStars] = useState([]);
  const [minScore, setMinScore]       = useState(0);
  const [sortBy, setSortBy]           = useState('recommended');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    searchRooms({ checkIn, checkOut })
      .then((data) => { if (!mounted) return; setRooms(Array.isArray(data) ? data : []); })
      .catch((err)  => { if (!mounted) return; setError(err.message || 'Unable to load rooms.'); })
      .finally(()   => { if (!mounted) return; setLoading(false); });
    return () => { mounted = false; };
  }, [checkIn, checkOut]);

  const maxPrice = useMemo(() => {
    if (!rooms.length) return 1000;
    return Math.ceil(Math.max(...rooms.map((r) => r.price)) / 100) * 100;
  }, [rooms]);

  const toggleStar = (s) =>
    setSelectedStars((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (priceMin !== null) n++;
    if (priceMax !== null) n++;
    if (selectedStars.length) n++;
    if (minScore > 0) n++;
    return n;
  }, [priceMin, priceMax, selectedStars, minScore]);

  const clearFilters = () => {
    setPriceMin(null);
    setPriceMax(null);
    setSelectedStars([]);
    setMinScore(0);
    setSortBy('recommended');
  };

  const results = useMemo(() => {
    const destValue = destination.trim().toLowerCase();
    let filtered = rooms.filter((room) => {
      const okCity     = !destValue || String(room.city || '').toLowerCase().includes(destValue);
      const okGuests   = !guests || room.capacity >= Number(guests);
      const okPriceMin = priceMin === null || room.price >= priceMin;
      const okPriceMax = priceMax === null || room.price <= priceMax;
      const okStars    = selectedStars.length === 0 || selectedStars.includes(room.hotelStars);
      const okScore    = minScore === 0 || (room.avgScore !== null && room.avgScore >= minScore);
      return okCity && okGuests && okPriceMin && okPriceMax && okStars && okScore;
    });

    if (sortBy === 'price_asc')   filtered.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price_desc')  filtered.sort((a, b) => b.price - a.price);
    else if (sortBy === 'score_desc')  filtered.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
    else if (sortBy === 'stars_desc')  filtered.sort((a, b) => (b.hotelStars || 0) - (a.hotelStars || 0));

    return filtered;
  }, [rooms, destination, guests, priceMin, priceMax, selectedStars, minScore, sortBy]);

  const handleBook = (room) => {
    navigate('/reservation', {
      state: {
        room: {
          id: room.id, hotelId: room.hotelId, name: room.name,
          hotel: room.hotelName, city: room.city, price: room.price,
          rating: room.hotelStars, img: room.photos?.[0],
          capacity: room.capacity, amount: room.amount,
        },
        checkIn, checkOut, guests,
      },
    });
  };

  const dateSummary = checkIn && checkOut ? `${checkIn} → ${checkOut}` : null;

  return (
    <div className="sr-page">
      {/* Top bar */}
      <div className="sr-topbar">
        <button type="button" className="back-btn" onClick={() => navigate('/')}>← Home</button>
        <div className="sr-topbar-center">
          <h1 className="sr-title">{destination ? `Rooms in ${destination}` : 'Search Results'}</h1>
          {dateSummary && <span className="sr-dates">{dateSummary}</span>}
        </div>
        <button className="sr-filter-toggle" onClick={() => setSidebarOpen((v) => !v)}>
          {sidebarOpen ? '✕ Hide filters' : '⊞ Filters'}
          {activeFilterCount > 0 && <span className="sr-filter-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {loading && <p className="sr-status">Loading rooms…</p>}
      {error   && <p className="sr-status sr-error">{error}</p>}

      <div className="sr-body">
        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside className="sr-sidebar">
            <div className="sr-sidebar-header">
              <span className="sr-sidebar-title">Filters</span>
              {activeFilterCount > 0 && (
                <button className="sr-clear-btn" onClick={clearFilters}>Clear all</button>
              )}
            </div>

            {/* Destination */}
            <div className="sr-filter-section">
              <label className="sr-filter-label">Destination</label>
              <input
                className="sr-filter-input"
                placeholder="City or hotel name"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </div>

            {/* Guests */}
            <div className="sr-filter-section">
              <label className="sr-filter-label">Guests</label>
              <input
                className="sr-filter-input"
                type="number"
                min={1}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value) || 1)}
              />
            </div>

            {/* Sort */}
            <div className="sr-filter-section">
              <label className="sr-filter-label">Sort by</label>
              <div className="sr-sort-list">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`sr-sort-btn ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="sr-filter-section">
              <label className="sr-filter-label">Price per night</label>
              <PriceRangeSlider
                min={0}
                max={maxPrice}
                valueMin={priceMin ?? 0}
                valueMax={priceMax ?? maxPrice}
                disabled={loading}
                onChange={({ min: lo, max: hi }) => {
                  setPriceMin(lo > 0 ? lo : null);
                  setPriceMax(hi < maxPrice ? hi : null);
                }}
              />
            </div>

            {/* Hotel Stars */}
            <div className="sr-filter-section">
              <label className="sr-filter-label">Hotel Stars</label>
              <div className="sr-star-row">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    className={`sr-star-btn ${selectedStars.includes(s) ? 'active' : ''}`}
                    onClick={() => toggleStar(s)}
                    title={`${s} star${s > 1 ? 's' : ''}`}
                  >
                    {'★'.repeat(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Review Score */}
            <div className="sr-filter-section">
              <label className="sr-filter-label">Guest Review Score</label>
              <div className="sr-score-row">
                {SCORE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`sr-score-btn ${minScore === opt.value ? 'active' : ''}`}
                    onClick={() => setMinScore(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* ── Results ── */}
        <div className="sr-results">
          <p className="sr-count">
            {results.length} room{results.length !== 1 ? 's' : ''} found
            {guests > 1 && <> · {guests} guests</>}
          </p>

          <div className="sr-grid">
            {results.map((room) => (
              <div key={room.id} className="sr-card">
                {room.photos?.[0]
                  ? <img className="sr-card-img" src={room.photos[0]} alt={room.name} />
                  : <div className="sr-card-img-placeholder" />
                }
                <div className="sr-card-body">
                  <h3 className="sr-card-name">{room.name}</h3>
                  <p className="sr-card-hotel">{room.hotelName} · {room.city || '—'}</p>

                  {room.hotelStars ? (
                    <p className="sr-card-stars">
                      {'★'.repeat(room.hotelStars)}{'☆'.repeat(5 - room.hotelStars)}
                    </p>
                  ) : null}

                  {room.reviewCount > 0 ? (
                    <button className="rv-badge" onClick={() => setReviewsRoom(room)}>
                      ★ {room.avgScore}/10 · {room.reviewCount} review{room.reviewCount !== 1 ? 's' : ''}
                    </button>
                  ) : <p className="sr-card-no-reviews">No reviews yet</p>}

                  <div className="sr-card-footer">
                    <p className="sr-card-price">
                      <span className="sr-price-amount">${room.price}</span>
                      <span className="sr-price-night"> / night</span>
                      <span className="sr-capacity"> · Sleeps {room.capacity}</span>
                    </p>
                    <button className="sr-book-btn" onClick={() => handleBook(room)}>Book Now</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!loading && !error && results.length === 0 && (
            <div className="sr-empty">
              <p style={{ fontSize: 40, marginBottom: 8 }}>🔍</p>
              <p style={{ fontWeight: 700, fontSize: 18, color: '#1a2340' }}>No rooms match your filters</p>
              <p style={{ color: '#6b7280', marginTop: 4 }}>Try adjusting your filters or clearing them.</p>
              {activeFilterCount > 0 && (
                <button className="sr-clear-btn-lg" onClick={clearFilters}>Clear all filters</button>
              )}
            </div>
          )}
        </div>
      </div>

      {reviewsRoom && (
        <ReviewsModal room={reviewsRoom} onClose={() => setReviewsRoom(null)} />
      )}
    </div>
  );
}
