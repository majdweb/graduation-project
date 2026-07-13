import React, { useEffect, useMemo, useState } from 'react';
import { getAdminUsers, getAdminUserBookings, suspendUser, unsuspendUser, getReviewDetail, deleteReview } from './services/hotels';

function formatMoney(value) {
  return `$${Math.round(Number(value) || 0).toLocaleString()}`;
}

const CAT_LABELS = { staff: 'Staff', location: 'Location', facilities: 'Facilities', cleanliness: 'Cleanliness', comfort: 'Comfort', value: 'Value' };

// CHANGED BY AI (2026-07-13): please review — full review detail modal for admin moderation.
function ReviewDetailModal({ reviewId, onClose, onDeleted }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    getReviewDetail(reviewId)
      .then((data) => { if (mounted) setReview(data); })
      .catch((err) => { if (mounted) setError(err.message || 'Unable to load review.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [reviewId]);

  async function handleDelete() {
    if (!window.confirm('Permanently delete this review? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteReview(reviewId);
      onDeleted();
    } catch (err) {
      alert('Unable to delete review: ' + (err.message || err));
      setDeleting(false);
    }
  }

  return (
    <div className="rv-overlay" onClick={onClose}>
      <div className="rv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rv-modal-header">
          <div>
            <h3>Review</h3>
            {review && <p>{review.roomName} · {review.hotelName}</p>}
          </div>
          <button className="rv-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {loading && <p className="muted small">Loading review...</p>}
        {error && <p className="muted small" style={{ color: '#e05555' }}>{error}</p>}

        {review && (
          <>
            <div className="rv-score-preview">
              Overall score
              <strong>{review.overallScore} / 10</strong>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0' }}>
              {Object.entries(CAT_LABELS).map(([key, label]) => (
                <div key={key} style={{ background: '#f3f4f6', borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a2340' }}>{review[key]}</div>
                </div>
              ))}
            </div>

            <div className="rv-comment">
              <label>Guest</label>
              <p style={{ margin: '4px 0 12px' }}>{review.guestName} · {new Date(review.createdAt).toLocaleDateString()}</p>
              <label>Comment</label>
              <p style={{ margin: '4px 0' }}>{review.comment}</p>
            </div>

            <div className="rv-actions">
              <button type="button" className="back-btn" onClick={onClose} disabled={deleting}>Close</button>
              <button type="button" className="cta" style={{ background: '#c0392b' }} onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : '🗑 Delete Review'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function formatSuspendedUntil(value) {
  if (!value) return 'indefinitely';
  const date = new Date(value);
  if (date.getFullYear() > 9000) return 'indefinitely'; // DateTimeOffset.MaxValue sentinel
  return `until ${date.toLocaleDateString()}`;
}

const ROLE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'guest', label: 'Guests' },
  { key: 'owner', label: 'Owners' },
  { key: 'admin', label: 'Admins' },
];

const SUSPEND_DURATIONS = [
  { key: '1', label: '1 day' },
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: 'indefinite', label: 'Indefinitely' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [suspendFormId, setSuspendFormId] = useState(null);
  const [suspendDuration, setSuspendDuration] = useState('7');
  const [actionSavingId, setActionSavingId] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [expandedBookings, setExpandedBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');
  const [openReviewId, setOpenReviewId] = useState(null);

  function load() {
    setLoading(true);
    setError('');
    return getAdminUsers()
      .then(setUsers)
      .catch((err) => setError(err.message || 'Unable to load users.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    const c = { guest: 0, owner: 0, admin: 0 };
    users.forEach((u) => {
      const key = String(u.role || '').toLowerCase();
      if (c[key] !== undefined) c[key] += 1;
    });
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const roleOk = roleFilter === 'all' || String(u.role || '').toLowerCase() === roleFilter;
      const term = search.trim().toLowerCase();
      const searchOk = !term
        || String(u.username || '').toLowerCase().includes(term)
        || String(u.email || '').toLowerCase().includes(term);
      return roleOk && searchOk;
    });
  }, [users, roleFilter, search]);

  async function handleConfirmSuspend(userId) {
    setActionSavingId(userId);
    try {
      let until = null;
      if (suspendDuration !== 'indefinite') {
        const d = new Date();
        d.setDate(d.getDate() + Number(suspendDuration));
        until = d.toISOString();
      }
      await suspendUser(userId, until);
      setSuspendFormId(null);
      await load();
    } catch (err) {
      alert('Unable to suspend user: ' + (err.message || err));
    } finally {
      setActionSavingId(null);
    }
  }

  async function handleUnsuspend(userId) {
    setActionSavingId(userId);
    try {
      await unsuspendUser(userId);
      await load();
    } catch (err) {
      alert('Unable to unsuspend user: ' + (err.message || err));
    } finally {
      setActionSavingId(null);
    }
  }

  async function loadBookingsFor(userId) {
    setExpandedBookings([]);
    setBookingsError('');
    setBookingsLoading(true);
    try {
      const data = await getAdminUserBookings(userId);
      setExpandedBookings(data);
    } catch (err) {
      setBookingsError(err.message || 'Unable to load bookings.');
    } finally {
      setBookingsLoading(false);
    }
  }

  function toggleExpand(userId) {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(userId);
    loadBookingsFor(userId);
  }

  // CHANGED BY AI (2026-07-13): please review — refreshes the currently-expanded user's bookings
  // after a review is deleted from the modal, so the row updates to "No review yet" right away.
  function handleReviewDeleted() {
    setOpenReviewId(null);
    if (expandedUserId != null) loadBookingsFor(expandedUserId);
  }

  if (loading) return <p className="admin-stat-sub">Loading users...</p>;
  if (error) return <p className="admin-stat-sub" style={{ color: '#e05555' }}>{error}</p>;

  return (
    <div className="ha-root">
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Total Users</div>
          <div className="admin-stat-value">{users.length}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Guests</div>
          <div className="admin-stat-value">{counts.guest}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Owners</div>
          <div className="admin-stat-value">{counts.owner}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Admins</div>
          <div className="admin-stat-value">{counts.admin}</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-title">👥 All Users</div>
        <div className="ha-controls">
          <div className="ha-sort-group">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.key}
                className={`ha-sort-btn ${roleFilter === f.key ? 'active' : ''}`}
                onClick={() => setRoleFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            className="sr-filter-input"
            style={{ maxWidth: 240 }}
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="ha-table-wrap">
          <table className="ha-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="ha-num">Bookings</th>
                <th className="ha-num">Paid to Platform</th>
                <th>Hotels Owned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isAdmin = String(u.role || '').toLowerCase() === 'admin';
                const saving = actionSavingId === u.id;
                return (
                  <React.Fragment key={u.id}>
                  <tr
                    className={expandedUserId === u.id ? 'ha-row-active' : ''}
                    onClick={() => toggleExpand(u.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td><strong>{u.username}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.phoneNumber || '—'}</td>
                    <td>{u.role}</td>
                    <td>
                      <span className={`booking-status booking-status-${u.isSuspended ? 'cancelled' : 'confirmed'}`}>
                        {u.isSuspended ? `Suspended (${formatSuspendedUntil(u.suspendedUntil)})` : 'Active'}
                      </span>
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="ha-num">{u.bookingsCount}</td>
                    <td className="ha-num">{formatMoney(u.amountPaidToPlatform)}</td>
                    <td>{u.ownedHotelNames.length ? u.ownedHotelNames.join(', ') : '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <span className="muted small">—</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {u.isSuspended ? (
                            <button className="ha-sort-btn" disabled={saving} onClick={() => handleUnsuspend(u.id)}>
                              {saving ? '...' : 'Unsuspend'}
                            </button>
                          ) : suspendFormId === u.id ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <select value={suspendDuration} onChange={(e) => setSuspendDuration(e.target.value)}>
                                {SUSPEND_DURATIONS.map((d) => (
                                  <option key={d.key} value={d.key}>{d.label}</option>
                                ))}
                              </select>
                              <button className="ha-sort-btn active" disabled={saving} onClick={() => handleConfirmSuspend(u.id)}>
                                {saving ? '...' : 'Confirm'}
                              </button>
                              <button className="ha-sort-btn" onClick={() => setSuspendFormId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button className="ha-sort-btn" onClick={() => setSuspendFormId(u.id)}>Suspend</button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedUserId === u.id && (
                    <tr>
                      <td colSpan={10} style={{ background: '#f8fafc', padding: 16 }}>
                        {bookingsLoading && <p className="muted small">Loading bookings...</p>}
                        {bookingsError && <p className="muted small" style={{ color: '#e05555' }}>{bookingsError}</p>}
                        {!bookingsLoading && !bookingsError && (
                          expandedBookings.length === 0 ? (
                            <p className="muted small">No bookings for this user.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {expandedBookings.map((b) => (
                                <div key={b.id} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', background: '#fff' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                    <strong>{b.hotelName}</strong>
                                    <span className={`booking-status booking-status-${b.status}`}>{b.status}</span>
                                  </div>
                                  <div className="muted small" style={{ marginTop: 4 }}>
                                    {b.checkIn} → {b.checkOut} · {formatMoney(b.totalAmount)}
                                  </div>
                                  {/* CHANGED BY AI (2026-07-13): please review — now shows the
                                      real review for this booking, if one exists; click it to see
                                      the full review and moderate (delete) it. */}
                                  {b.hasReview ? (
                                    <div
                                      className="muted small"
                                      style={{ marginTop: 6, cursor: 'pointer' }}
                                      onClick={() => setOpenReviewId(b.reviewId)}
                                      title="Click to view full review"
                                    >
                                      <strong style={{ color: '#2a3d66' }}>★ {b.reviewScore}/10</strong>
                                      {b.reviewComment && <span> — {b.reviewComment}</span>}
                                    </div>
                                  ) : (
                                    <div className="muted small" style={{ marginTop: 6, fontStyle: 'italic' }}>
                                      No review yet
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="ha-hint">No users match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {openReviewId != null && (
        <ReviewDetailModal
          reviewId={openReviewId}
          onClose={() => setOpenReviewId(null)}
          onDeleted={handleReviewDeleted}
        />
      )}
    </div>
  );
}
