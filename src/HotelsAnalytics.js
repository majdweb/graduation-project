import { Fragment, useEffect, useState } from 'react';
import { getAdminDashboard, getRoomTypesForHotel, deleteReview } from './services/hotels';
import { getRoomReviews } from './services/guest';

function formatMoney(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString()}`;
}

// CHANGED BY AI (2026-07-13): please review — one room type's card in the hotel drill-down, with
// its reviews shown/moderated inline (view + delete). Manages its own reviews fetch/expand state
// so opening one room's reviews doesn't affect its siblings.
function RoomTypeCard({ hotelId, room }) {
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [reviewsError, setReviewsError] = useState('');
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function loadReviews() {
    setLoadingReviews(true);
    setReviewsError('');
    try {
      const data = await getRoomReviews(hotelId, room.id);
      setReviewData(data);
    } catch (err) {
      setReviewsError(err.message || 'Unable to load reviews.');
    } finally {
      setLoadingReviews(false);
    }
  }

  function toggleReviews() {
    const next = !reviewsOpen;
    setReviewsOpen(next);
    if (next && !reviewData) loadReviews();
  }

  async function handleDelete(reviewId) {
    if (!window.confirm('Permanently delete this review? This cannot be undone.')) return;
    setDeletingId(reviewId);
    try {
      await deleteReview(reviewId);
      await loadReviews();
    } catch (err) {
      alert('Unable to delete review: ' + (err.message || err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="ha-room-card">
      <div className="ha-room-card-header">
        <div className="ha-room-card-main">
          <strong>{room.name}</strong>
          <span className="muted small">{room.capacity} guest{room.capacity !== 1 ? 's' : ''} · {formatMoney(room.price)}/night</span>
        </div>
        <button className="ha-sort-btn" onClick={toggleReviews}>
          {room.reviewCount > 0 ? `★ ${room.avgScore}/10 · ${room.reviewCount} review${room.reviewCount !== 1 ? 's' : ''}` : 'No reviews yet'}
          <span style={{ marginLeft: 6 }}>{reviewsOpen ? '▲' : '▼'}</span>
        </button>
      </div>

      {reviewsOpen && (
        <div className="ha-review-list">
          {loadingReviews && <p className="ha-hint">Loading reviews...</p>}
          {reviewsError && <p className="ha-hint" style={{ color: '#e05555' }}>{reviewsError}</p>}
          {!loadingReviews && !reviewsError && reviewData && reviewData.reviews.length === 0 && (
            <p className="ha-hint">No reviews yet.</p>
          )}
          {!loadingReviews && !reviewsError && reviewData && reviewData.reviews.map((r) => (
            <div key={r.id} className="ha-review-item">
              <div className="ha-review-item-header">
                <span className="ha-review-item-name">{r.guestName}</span>
                <span className="ha-review-item-score">{r.overallScore}/10</span>
                <span className="ha-review-item-date">{new Date(r.createdAt).toLocaleDateString()}</span>
                <button
                  className="ha-review-delete-btn"
                  disabled={deletingId === r.id}
                  onClick={() => handleDelete(r.id)}
                  title="Delete this review"
                >
                  {deletingId === r.id ? '...' : '🗑'}
                </button>
              </div>
              <p className="ha-review-item-comment">{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// New room-type drill-down for a hotel row in the admin analytics ranking tables (previously
// there was no way to see a hotel's rooms here at all).
function HotelRoomsRow({ hotelId }) {
  const [rooms, setRooms] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getRoomTypesForHotel(hotelId)
      .then((list) => { if (mounted) setRooms(list); })
      .catch((err) => { if (mounted) setError(err.message || 'Unable to load rooms.'); });
    return () => { mounted = false; };
  }, [hotelId]);

  return (
    <tr className="ha-row-active">
      <td colSpan={5} style={{ padding: '12px 14px' }}>
        {error && <p className="ha-hint" style={{ color: '#e05555' }}>{error}</p>}
        {!error && !rooms && <p className="ha-hint">Loading rooms...</p>}
        {!error && rooms && rooms.length === 0 && <p className="ha-hint">This hotel has no room types yet.</p>}
        {!error && rooms && rooms.length > 0 && (
          <div className="ha-room-list">
            {rooms.map((r) => (
              <RoomTypeCard key={r.id} hotelId={hotelId} room={r} />
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

/* ── small CSS bar chart ── */
function BarChart({ items, valueKey, labelKey, color = '#6C8BC7', formatValue }) {
  const max = Math.max(1, ...items.map((it) => Number(it[valueKey]) || 0));
  return (
    <div className="ha-chart">
      {items.map((it, i) => {
        const v = Number(it[valueKey]) || 0;
        const pct = Math.round((v / max) * 100);
        return (
          <div className="ha-bar-row" key={it.id ?? it[labelKey] ?? i}>
            <div className="ha-bar-label" title={it[labelKey]}>{it[labelKey]}</div>
            <div className="ha-bar-track">
              <div className="ha-bar-fill" style={{ width: `${pct}%`, background: color }}>
                <span className="ha-bar-value">{formatValue ? formatValue(v) : v}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankingTable({ title, icon, items, valueKey, valueLabel, formatValue }) {
  const [expandedHotelId, setExpandedHotelId] = useState(null);

  return (
    <div className="admin-card">
      <div className="admin-card-title">{icon} {title}</div>
      <p className="ha-hint" style={{ margin: '2px 0 8px' }}>Click a hotel to see its rooms.</p>
      <div className="ha-table-wrap">
        <table className="ha-table">
          <thead>
            <tr>
              <th>Hotel</th>
              <th>City</th>
              <th>Country</th>
              <th className="ha-stars-col">Stars</th>
              <th className="ha-num">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((h) => {
              const n = Math.min(5, Math.max(0, Number(h.starRating) || 0));
              const isExpanded = expandedHotelId === h.hotelId;
              return (
              <Fragment key={h.hotelId}>
              <tr
                className={isExpanded ? 'ha-row-active' : ''}
                onClick={() => setExpandedHotelId(isExpanded ? null : h.hotelId)}
              >
                <td><strong>{h.hotelName}</strong></td>
                <td>{h.city}</td>
                <td>{h.country}</td>
                <td className="ha-stars-col">
                  <span className="ha-star-rating">
                    <span className="ha-star-filled">{'★'.repeat(n)}</span>
                    <span className="ha-star-empty">{'★'.repeat(5 - n)}</span>
                  </span>
                </td>
                <td className="ha-num">{formatValue(h[valueKey])}</td>
              </tr>
              {isExpanded && <HotelRoomsRow hotelId={h.hotelId} />}
              </Fragment>
              );
            })}
            {items.length === 0 && (
              <tr><td colSpan={5} className="ha-hint">No hotels yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function HotelsAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    getAdminDashboard()
      .then((d) => { if (mounted) setData(d); })
      .catch((err) => { if (mounted) setError(err.message || 'Unable to load platform analytics.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return <p className="admin-stat-sub">Loading platform analytics...</p>;
  if (error) return <p className="admin-stat-sub" style={{ color: '#e05555' }}>{error}</p>;
  if (!data) return null;

  const { revenue, bookingStats, topHotelsByRevenue, topHotelsByBookings } = {
    revenue: data.revenue,
    bookingStats: data.bookingStats,
    topHotelsByRevenue: data.topHotelsByRevenue || [],
    topHotelsByBookings: data.topHotelsByBookings || [],
  };

  return (
    <div className="ha-root">
      {/* Summary stat cards */}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Platform Revenue</div>
          <div className="admin-stat-value" style={{ fontSize: 20 }}>{formatMoney(revenue.totalRevenue)}</div>
          <div className="admin-stat-sub">Booking fees + cancellation penalties</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Booking Fees</div>
          <div className="admin-stat-value" style={{ fontSize: 20 }}>{formatMoney(revenue.totalPlatformRevenue)}</div>
          <div className="admin-stat-sub">15% of confirmed/completed bookings</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Cancellation Revenue</div>
          <div className="admin-stat-value" style={{ fontSize: 20 }}>{formatMoney(revenue.totalCancellationRevenue)}</div>
          <div className="admin-stat-sub">Penalty share from cancellations</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Hotels / Users</div>
          <div className="admin-stat-value" style={{ fontSize: 20 }}>{bookingStats.totalHotels} / {bookingStats.totalUsers}</div>
          <div className="admin-stat-sub">Total registered</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-title">📅 Bookings by Status</div>
        <BarChart
          items={[
            { key: 'Confirmed', value: bookingStats.confirmedBookings },
            { key: 'Pending', value: bookingStats.pendingBookings },
            { key: 'Completed', value: bookingStats.completedBookings },
            { key: 'Cancelled', value: bookingStats.cancelledBookings },
          ]}
          valueKey="value"
          labelKey="key"
          color="#6C8BC7"
        />
        <p className="ha-hint">{bookingStats.totalBookings} bookings total across the platform.</p>
      </div>

      <RankingTable
        title="Top Hotels by Revenue"
        icon="💰"
        items={topHotelsByRevenue}
        valueKey="grossRevenue"
        valueLabel="Gross Revenue"
        formatValue={formatMoney}
      />

      <RankingTable
        title="Top Hotels by Bookings"
        icon="📊"
        items={topHotelsByBookings}
        valueKey="bookingsCount"
        valueLabel="Bookings"
        formatValue={(v) => v}
      />
    </div>
  );
}
