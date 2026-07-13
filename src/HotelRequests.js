import { useEffect, useMemo, useState } from 'react';
import {
  getAllHotelRequests,
  approveHotelRequest,
  rejectHotelRequest,
  REQUEST_FIELDS,
} from './services/hotelRequests';

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending', cls: 'hrq-badge-pending' },
    approved: { label: 'Approved', cls: 'hrq-badge-approved' },
    rejected: { label: 'Rejected', cls: 'hrq-badge-rejected' },
  };
  const s = map[status] || map.pending;
  return <span className={`hrq-badge ${s.cls}`}>{s.label}</span>;
}

function RequestCard({ req, onApprove, onReject, history }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [zoom, setZoom] = useState(false);

  const submitReject = () => {
    if (!reason.trim()) return;
    onReject(req.id, reason.trim());
    setRejecting(false);
    setReason('');
  };

  return (
    <div className={`hrq-card ${history ? 'hrq-card-history' : ''}`}>
      <div className="hrq-card-head">
        <div>
          <span className="hrq-type">{req.type === 'create' ? '➕ New hotel' : '✏️ Edit hotel'}</span>
          <span className="hrq-meta"> · {req.ownerName}{req.ownerEmail ? ` (${req.ownerEmail})` : ''}</span>
          <div className="hrq-meta hrq-date">{new Date(req.createdAt).toLocaleString()}</div>
        </div>
        <StatusBadge status={req.status} />
      </div>

      <div className="hrq-body">
        <div className="hrq-changes">
          {REQUEST_FIELDS.map((f) =>
            req.changes?.[f.key] ? (
              <div key={f.key} className="hrq-change-line">
                <span className="hrq-change-label">{f.label}</span>
                <span className="hrq-change-value">
                  {f.render ? f.render(req.changes[f.key]) : req.changes[f.key]}
                </span>
              </div>
            ) : null
          )}
        </div>
        {req.document?.dataUrl && (
          <div className="hrq-doc">
            <div className="hrq-doc-label">📄 Document</div>
            <img
              src={req.document.dataUrl}
              alt={req.document.name || 'Document'}
              className="hrq-doc-img"
              onClick={() => setZoom(true)}
              title="Click to enlarge"
            />
          </div>
        )}
      </div>

      {req.status === 'rejected' && req.rejectionReason && (
        <div className="hrq-reason"><strong>Rejection reason:</strong> {req.rejectionReason}</div>
      )}
      {req.status === 'approved' && req.reviewedAt && (
        <div className="hrq-reviewed">Approved on {new Date(req.reviewedAt).toLocaleString()}</div>
      )}

      {!history && (
        <div className="hrq-actions">
          {!rejecting ? (
            <>
              <button className="hrq-btn hrq-btn-approve" onClick={() => onApprove(req.id)}>✓ Approve</button>
              <button className="hrq-btn hrq-btn-reject" onClick={() => setRejecting(true)}>✕ Reject</button>
            </>
          ) : (
            <div className="hrq-reject-form">
              <input
                className="hrq-reason-input"
                placeholder="Reason for rejection (sent to owner)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
              <button className="hrq-btn hrq-btn-reject" disabled={!reason.trim()} onClick={submitReject}>
                Send rejection
              </button>
              <button className="hrq-btn hrq-btn-cancel" onClick={() => { setRejecting(false); setReason(''); }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {zoom && req.document?.dataUrl && (
        <div className="hrq-lightbox" onClick={() => setZoom(false)}>
          <img src={req.document.dataUrl} alt={req.document.name || 'Document'} />
        </div>
      )}
    </div>
  );
}

export default function HotelRequests() {
  const [requests, setRequests] = useState([]);
  const [loadError, setLoadError] = useState('');

  function load() {
    return getAllHotelRequests()
      .then(setRequests)
      .catch((err) => setLoadError(err.message || 'Unable to load hotel requests.'));
  }

  useEffect(() => { load(); }, []);

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const history = useMemo(
    () =>
      requests
        .filter((r) => r.status !== 'pending')
        .sort((a, b) => new Date(b.reviewedAt || b.createdAt) - new Date(a.reviewedAt || a.createdAt)),
    [requests]
  );

  // The backend creates or updates the real hotel (whichever this request needed) and only
  // marks it Approved if that succeeds — so a failed approval no longer looks like a success.
  const handleApprove = async (id) => {
    try {
      await approveHotelRequest(id);
      await load();
    } catch (e) {
      alert('Could not approve this request: ' + (e.message || e));
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await rejectHotelRequest(id, reason);
      await load();
    } catch (e) {
      alert('Could not reject this request: ' + (e.message || e));
    }
  };

  return (
    <div className="hrq-root">
      {loadError && <p className="admin-stat-sub" style={{ color: '#e05555' }}>{loadError}</p>}
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Pending</div>
          <div className="admin-stat-value">{pending.length}</div>
          <div className="admin-stat-sub">Awaiting your review</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Approved</div>
          <div className="admin-stat-value">{requests.filter((r) => r.status === 'approved').length}</div>
          <div className="admin-stat-sub">Total approved</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Rejected</div>
          <div className="admin-stat-value">{requests.filter((r) => r.status === 'rejected').length}</div>
          <div className="admin-stat-sub">Total rejected</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">All Requests</div>
          <div className="admin-stat-value">{requests.length}</div>
          <div className="admin-stat-sub">Submitted by owners</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-title">📥 Pending Requests</div>
        {pending.length === 0 ? (
          <p className="hrq-empty">No pending requests. New owner submissions will appear here.</p>
        ) : (
          <div className="hrq-list">
            {pending.map((r) => (
              <RequestCard key={r.id} req={r} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        )}
      </div>

      <div className="admin-card">
        <div className="admin-card-title">🗂 Previous Requests</div>
        {history.length === 0 ? (
          <p className="hrq-empty">No reviewed requests yet.</p>
        ) : (
          <div className="hrq-list">
            {history.map((r) => (
              <RequestCard key={r.id} req={r} history />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
