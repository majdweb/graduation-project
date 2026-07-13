import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './room.css';
import { getMyBookings, cancelBooking, updateBooking, submitReview } from './services/guest';
import { getCurrentUser } from './services/auth';

const CATEGORIES = [
  { key: 'staff',       label: 'Staff',          question: 'How helpful and friendly was the property staff?' },
  { key: 'location',    label: 'Location',        question: 'How would you rate the safety and convenience of the location?' },
  { key: 'facilities',  label: 'Facilities',      question: 'How were the common areas? (Lobby, elevator, pool, gym, etc.)' },
  { key: 'cleanliness', label: 'Cleanliness',     question: 'Was your room spotless, fresh, and well-maintained?', highWeight: true },
  { key: 'comfort',     label: 'Comfort',         question: "How comfortable was the bed and the room's noise levels?", highWeight: true },
  { key: 'value',       label: 'Value for Money', question: 'Considering what you paid, did the stay meet your expectations?' },
];

function computePreview(ratings) {
  const { staff, location, facilities, cleanliness, comfort, value } = ratings;
  return Math.round(((staff + location + facilities + cleanliness * 2 + comfort * 2 + value) / 8) * 10) / 10;
}

function ReviewModal({ booking, userId, onClose, onSubmitted }) {
  const [ratings, setRatings] = useState({ staff: 7, location: 7, facilities: 7, cleanliness: 7, comfort: 7, value: 7 });
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const overallScore = useMemo(() => computePreview(ratings), [ratings]);

  const handleSubmit = async () => {
    if (comment.trim().length < 10) {
      setSubmitError('Comment must be at least 10 characters.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitReview(booking.id, userId, ratings, comment.trim());
      onSubmitted();
    } catch (err) {
      setSubmitError(err.message || 'Unable to submit review.');
      setSubmitting(false);
    }
  };

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rv-modal-header">
          <div>
            <h3>Rate your stay</h3>
            <p>{booking.roomName} · {booking.hotelName} · {booking.checkIn} → {booking.checkOut}</p>
          </div>
          <button className="rv-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="rv-score-preview">
          Weighted overall score
          <strong>{overallScore} / 10</strong>
        </div>

        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="rv-category">
            <div className="rv-cat-header">
              <span className="rv-cat-label">{cat.label}</span>
              {cat.highWeight && <span className="rv-cat-weight">Higher weight</span>}
              <span className="rv-cat-value">{ratings[cat.key]} / 10</span>
            </div>
            <p className="rv-cat-question">{cat.question}</p>
            <input
              type="range"
              min={1}
              max={10}
              value={ratings[cat.key]}
              onChange={(e) => setRatings((prev) => ({ ...prev, [cat.key]: Number(e.target.value) }))}
              className="rv-slider"
            />
            <div className="rv-slider-ends"><span>1</span><span>10</span></div>
          </div>
        ))}

        <div className="rv-comment">
          <label>Your comment</label>
          <textarea
            rows={4}
            placeholder="Share your experience… (minimum 10 characters)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <span className="rv-char-count">{comment.length} characters</span>
        </div>

        {submitError && <p className="rv-error">{submitError}</p>}

        <div className="rv-actions">
          <button type="button" className="back-btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            type="button"
            className="cta"
            onClick={handleSubmit}
            disabled={submitting || comment.trim().length < 10}
          >
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

// CHANGED BY AI (2026-07-13): please review — removed the old "pending bookings are always free
// to cancel" special case, since the real backend (BookingService.CancelAsync) doesn't special-
// case Pending at all; it applies the same hotel policy regardless of status. This now matches
// exactly what the backend actually charges.
function isCancellationFree(booking) {
  const policy = booking.cancelPolicy || { freeCancel: true, daysBefore: 2 };
  if (!policy.freeCancel) return false;
  const daysUntilCheckIn = Math.floor((new Date(booking.checkIn) - new Date()) / (1000 * 60 * 60 * 24));
  return daysUntilCheckIn >= Number(policy.daysBefore || 0);
}

// Mirrors BookingService.ComputeCancellationPenalty, for showing the guest the real fee before
// they confirm cancelling.
function computeCancellationPenalty(booking) {
  if (isCancellationFree(booking)) return 0;
  const policy = booking.cancelPolicy || { feeType: 'percentage', feeValue: 0 };
  const total = Number(booking.totalAmount) || 0;
  const fee = policy.feeType === 'flat' ? policy.feeValue : total * (Number(policy.feeValue) / 100);
  return Math.min(Math.round(fee * 100) / 100, total);
}

// Mirrors BookingService.ModifyDatesAsync's late-modification fee, for warning the guest before
// they submit a date change within 24 hours of check-in.
function computeModificationFee(booking) {
  const hoursUntilCheckIn = (new Date(booking.checkIn) - new Date()) / (1000 * 60 * 60);
  if (hoursUntilCheckIn >= 24) return 0;
  return booking.totalNights <= 1 ? (Number(booking.totalAmount) || 0) : (Number(booking.pricePerNight) || 0);
}

export default function MyBookings() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modifyingId, setModifyingId] = useState(null);
  const [modifyDates, setModifyDates] = useState({ checkIn: '', checkOut: '' });
  const [modifyError, setModifyError] = useState('');
  const [modifySaving, setModifySaving] = useState(false);
  const [reviewingBooking, setReviewingBooking] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let mounted = true;
    getMyBookings(user.id)
      .then((data) => {
        if (!mounted) return;
        setBookings(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Unable to load your bookings.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [user?.id]);

  const handleCancel = async (booking) => {
    const free = isCancellationFree(booking);
    const penalty = free ? 0 : computeCancellationPenalty(booking);
    const message = free
      ? `Cancel your booking for ${booking.roomName} at ${booking.hotelName}? This cancellation is free.`
      : `Cancel your booking for ${booking.roomName} at ${booking.hotelName}? Per this hotel's cancellation policy, you'll be charged a $${penalty.toFixed(2)} fee. Cancel anyway?`;
    if (!window.confirm(message)) return;
    try {
      await cancelBooking(booking.id, user.id);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status: 'cancelled' } : b)));
    } catch (err) {
      alert(err.message || 'Unable to cancel this booking.');
    }
  };

  const openModify = (booking) => {
    setModifyingId(booking.id);
    setModifyDates({ checkIn: booking.checkIn, checkOut: booking.checkOut });
    setModifyError('');
  };

  const closeModify = () => { setModifyingId(null); setModifyError(''); };

  const handleModifySubmit = async (booking) => {
    setModifyError('');
    if (!modifyDates.checkIn || !modifyDates.checkOut) { setModifyError('Please select both dates.'); return; }
    if (modifyDates.checkIn >= modifyDates.checkOut) { setModifyError('Check-out must be after check-in.'); return; }
    const lateFee = computeModificationFee(booking);
    if (lateFee > 0 && !window.confirm(`This is within 24 hours of check-in, so a $${lateFee.toFixed(2)} late-modification fee applies. Continue?`)) {
      return;
    }
    setModifySaving(true);
    try {
      const updated = await updateBooking(booking.id, user.id, modifyDates.checkIn, modifyDates.checkOut);
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? {
        ...b,
        checkIn: updated.checkIn,
        checkOut: updated.checkOut,
        status: updated.status,
        totalAmount: updated.totalAmount,
        modificationFee: updated.modificationFee,
      } : b)));
      closeModify();
      if (updated.modificationFee) {
        alert(`Dates updated. A $${Number(updated.modificationFee).toFixed(2)} late-modification fee was applied.${updated.status === 'pending' ? ' This booking now needs the hotel to re-confirm it.' : ''}`);
      } else if (updated.status === 'pending' && booking.status === 'confirmed') {
        alert('Dates updated. This booking now needs the hotel to re-confirm it.');
      }
    } catch (err) {
      setModifyError(err.message || 'Unable to modify this booking.');
    } finally {
      setModifySaving(false);
    }
  };

  const handleReviewSubmitted = (bookingId) => {
    setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, hasReview: true, reviewable: false } : b));
    setReviewingBooking(null);
  };

  return (
    <div className="rooms-page">
      <div className="back-wrapper">
        <button type="button" className="back-btn" onClick={() => navigate('/')}>← Back to home</button>
      </div>

      <h1 className="section-title">My Bookings</h1>

      {!user?.id && <div className="empty-state"><p>Please log in to see your bookings.</p></div>}
      {loading && <p style={{ textAlign: 'center', marginBottom: 20 }}>Loading your bookings...</p>}
      {error && <p style={{ textAlign: 'center', color: '#9b1c1c', marginBottom: 20 }}>{error}</p>}

      {user?.id && !loading && !error && (
        <div className="bookings-list">
          {bookings.map((b) => (
            <div key={b.id} className="booking-row" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div className="booking-row-info">
                <h3>{b.roomName}</h3>
                <p className="hotel-name">{b.hotelName}</p>
              </div>
              <div className="booking-row-dates">{b.checkIn} → {b.checkOut}</div>
              <span className={`booking-status booking-status-${b.status}`}>{b.status}</span>
              {b.modificationFee ? (
                <span className="muted small" title="A late-modification fee was charged when these dates were last changed.">
                  (${Number(b.modificationFee).toFixed(2)} late fee applied)
                </span>
              ) : null}

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {(b.status === 'pending' || b.status === 'confirmed') && (
                  <>
                    <button type="button" className="back-btn" onClick={() => openModify(b)}>Modify</button>
                    <button type="button" className="back-btn" onClick={() => handleCancel(b)}>Cancel</button>
                  </>
                )}
                {b.reviewable && (
                  <button type="button" className="cta" style={{ fontSize: 13, padding: '6px 14px' }} onClick={() => setReviewingBooking(b)}>
                    ✍ Write a Review
                  </button>
                )}
                {b.hasReview && (
                  <span className="rv-reviewed">✓ Reviewed</span>
                )}
              </div>

              {modifyingId === b.id && (
                <div style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px', marginTop: 4 }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 600 }}>Change dates</p>
                  {computeModificationFee(b) > 0 && (
                    <p style={{ margin: '0 0 12px', fontSize: 13, color: '#9b1c1c' }}>
                      ⚠ This is within 24 hours of check-in — modifying will charge a ${computeModificationFee(b).toFixed(2)} late fee.
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                      Check-in
                      <input type="date" value={modifyDates.checkIn} min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setModifyDates((d) => ({ ...d, checkIn: e.target.value }))}
                        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }} />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                      Check-out
                      <input type="date" value={modifyDates.checkOut} min={modifyDates.checkIn || new Date().toISOString().split('T')[0]}
                        onChange={(e) => setModifyDates((d) => ({ ...d, checkOut: e.target.value }))}
                        style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6 }} />
                    </label>
                    <button type="button" className="cta" onClick={() => handleModifySubmit(b)} disabled={modifySaving} style={{ height: 36 }}>
                      {modifySaving ? 'Saving…' : 'Save'}
                    </button>
                    <button type="button" className="back-btn" onClick={closeModify} disabled={modifySaving} style={{ height: 36 }}>Cancel</button>
                  </div>
                  {modifyError && <p style={{ color: '#9b1c1c', marginTop: 8, fontSize: 13 }}>{modifyError}</p>}
                </div>
              )}
            </div>
          ))}
          {bookings.length === 0 && <div className="empty-state"><p>You don't have any bookings yet.</p></div>}
        </div>
      )}

      {reviewingBooking && (
        <ReviewModal
          booking={reviewingBooking}
          userId={user?.id}
          onClose={() => setReviewingBooking(null)}
          onSubmitted={() => handleReviewSubmitted(reviewingBooking.id)}
        />
      )}
    </div>
  );
}
