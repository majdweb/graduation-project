import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import './ownerDashboard.css';
import { addRequest, getRequests, subscribeRequests, REQUEST_FIELDS } from './data/hotelRequests';
import { fileToResizedDataUrl } from './data/imageUtil';

const MAX_DOC_BYTES = 8 * 1024 * 1024; // 8MB source cap (image is downscaled before storing)

const emptyForm = { hotelName: '', city: '', address: '', phoneNumber: '', description: '' };

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pending review', cls: 'orq-badge-pending' },
    approved: { label: 'Approved', cls: 'orq-badge-approved' },
    rejected: { label: 'Rejected', cls: 'orq-badge-rejected' },
  };
  const s = map[status] || map.pending;
  return <span className={`orq-badge ${s.cls}`}>{s.label}</span>;
}

export default function OwnerRequests() {
  const owner = useMemo(() => {
    try {
      const raw = localStorage.getItem('mock_auth_user');
      const parsed = raw ? JSON.parse(raw) : {};
      const user = parsed?.user || {};
      return {
        ownerName: user.username || 'Owner',
        ownerEmail: user.email || '',
        hotelId: String(user.hotelId || user.hotelName || user.id || ''),
        hotelName: user.hotelName || '',
        city: user.city || '',
        address: user.address || '',
        phoneNumber: user.phoneNumber || '',
        description: user.description || '',
      };
    } catch {
      return { ownerName: 'Owner', ownerEmail: '', hotelId: '' };
    }
  }, []);

  const [type, setType] = useState('edit'); // 'edit' | 'create'
  const [identity, setIdentity] = useState({ ownerName: owner.ownerName, ownerEmail: owner.ownerEmail });
  const [form, setForm] = useState(emptyForm);
  const [doc, setDoc] = useState(null); // { name, dataUrl }
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [allRequests, setAllRequests] = useState(() => getRequests());

  useEffect(() => subscribeRequests(setAllRequests), []);

  // Prefill edit form with the owner's current hotel info
  useEffect(() => {
    if (type === 'edit') {
      setForm({
        hotelName: owner.hotelName || '',
        city: owner.city || '',
        address: owner.address || '',
        phoneNumber: owner.phoneNumber || '',
        description: owner.description || '',
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
    setSuccess('');
  }, [type, owner]);

  const myRequests = useMemo(
    () =>
      allRequests
        .filter(
          (r) =>
            (identity.ownerEmail && r.ownerEmail === identity.ownerEmail) ||
            (owner.hotelId && String(r.hotelId) === String(owner.hotelId))
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [allRequests, identity, owner]
  );

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSuccess('');
  }

  async function handleDoc(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      setError('Document image is too large (max 8MB).');
      e.target.value = '';
      return;
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      setDoc({ name: file.name, dataUrl });
      setError('');
    } catch {
      setError('Could not read the document image. Try another file.');
    }
    e.target.value = '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.hotelName.trim()) {
      setError('Hotel name is required.');
      return;
    }
    if (!doc) {
      setError('Please attach a document image (license / ownership proof).');
      return;
    }
    if (!identity.ownerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    try {
      addRequest({
        type,
        hotelId: type === 'edit' ? owner.hotelId : '',
        ownerName: identity.ownerName.trim(),
        ownerEmail: identity.ownerEmail.trim(),
        changes: {
          hotelName: form.hotelName.trim(),
          city: form.city.trim(),
          address: form.address.trim(),
          phoneNumber: form.phoneNumber.trim(),
          description: form.description.trim(),
        },
        document: doc,
      });
    } catch (err) {
      setError(err.message || 'Could not submit the request.');
      return;
    }
    setDoc(null);
    setSuccess(
      type === 'create'
        ? 'New hotel request submitted. The admin will review it.'
        : 'Edit request submitted. The admin will review it.'
    );
  }

  return (
    <div className="owner-dashboard">
      <header className="od-header">
        <h1>Hotel Requests</h1>
        <p className="muted">Request a new hotel or changes to your hotel details. An admin must approve them.</p>
      </header>

      <div style={{ marginBottom: 14 }}>
        <Link to="/ownerhome" className="cta" style={{ textDecoration: 'none', display: 'inline-block' }}>
          Back to Owner Home
        </Link>
      </div>

      {error && <div className="orq-alert orq-alert-error">{error}</div>}
      {success && <div className="orq-alert orq-alert-success">{success}</div>}

      <section className="od-row">
        <form onSubmit={handleSubmit}>
          <div className="orq-type-toggle">
            <button
              type="button"
              className={`orq-type-btn ${type === 'edit' ? 'active' : ''}`}
              onClick={() => setType('edit')}
            >
              ✏️ Edit my hotel
            </button>
            <button
              type="button"
              className={`orq-type-btn ${type === 'create' ? 'active' : ''}`}
              onClick={() => setType('create')}
            >
              ➕ Register new hotel
            </button>
          </div>

          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <label>
              <div className="small muted" style={{ marginBottom: 4 }}>Your Name</div>
              <input value={identity.ownerName}
                onChange={(e) => setIdentity((p) => ({ ...p, ownerName: e.target.value }))}
                placeholder="Owner name" required className="orq-input" />
            </label>
            <label>
              <div className="small muted" style={{ marginBottom: 4 }}>Your Email</div>
              <input type="email" value={identity.ownerEmail}
                onChange={(e) => setIdentity((p) => ({ ...p, ownerEmail: e.target.value }))}
                placeholder="you@email.com" className="orq-input" />
            </label>
            <label>
              <div className="small muted" style={{ marginBottom: 4 }}>Hotel Name</div>
              <input value={form.hotelName} onChange={(e) => updateField('hotelName', e.target.value)}
                placeholder="Hotel name" required className="orq-input" />
            </label>
            <label>
              <div className="small muted" style={{ marginBottom: 4 }}>City</div>
              <input value={form.city} onChange={(e) => updateField('city', e.target.value)}
                placeholder="City" className="orq-input" />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <div className="small muted" style={{ marginBottom: 4 }}>Address</div>
              <input value={form.address} onChange={(e) => updateField('address', e.target.value)}
                placeholder="Street, district, details" className="orq-input" />
            </label>
            <label>
              <div className="small muted" style={{ marginBottom: 4 }}>Phone Number</div>
              <input value={form.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)}
                placeholder="+1 555 123 4567" className="orq-input" />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <div className="small muted" style={{ marginBottom: 4 }}>Description</div>
              <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)}
                placeholder="Short description of your hotel" rows={4} className="orq-input" style={{ resize: 'vertical' }} />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              <div className="small muted" style={{ marginBottom: 4 }}>Document image (license / ownership proof) — required</div>
              <input type="file" accept="image/*" onChange={handleDoc} />
              {doc && (
                <div className="orq-doc-preview">
                  <img src={doc.dataUrl} alt="Document" />
                  <span className="small muted">{doc.name}</span>
                </div>
              )}
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <button className="save-btn" type="submit">Submit request</button>
          </div>
        </form>
      </section>

      <section className="od-row" style={{ marginTop: 18 }}>
        <h2 style={{ marginTop: 0 }}>My requests</h2>
        {myRequests.length === 0 && <p className="muted small">You haven't submitted any requests yet.</p>}
        <div className="orq-list">
          {myRequests.map((r) => (
            <div key={r.id} className="orq-card">
              <div className="orq-card-head">
                <div>
                  <strong>{r.type === 'create' ? 'New hotel' : 'Edit hotel'}</strong>
                  {' · '}
                  <span className="muted small">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <div className="orq-changes">
                {REQUEST_FIELDS.map((f) =>
                  r.changes?.[f.key] ? (
                    <div key={f.key} className="orq-change-line">
                      <span className="muted small">{f.label}:</span> {r.changes[f.key]}
                    </div>
                  ) : null
                )}
              </div>
              {r.status === 'rejected' && r.rejectionReason && (
                <div className="orq-reject-reason">
                  <strong>Rejection reason:</strong> {r.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
