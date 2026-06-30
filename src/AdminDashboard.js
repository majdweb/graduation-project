import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_CONTENT, STORAGE_KEY } from './useSiteContent';
import HotelsAnalytics from './HotelsAnalytics';
import HotelRequests from './HotelRequests';
import './AdminDashboard.css';

const ADMIN_PASSWORD = 'velvet2026';

/* ── helpers ── */
function loadContent() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function mergeWithDefaults(data) {
  if (!data) return JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  return {
    hero: { ...DEFAULT_CONTENT.hero, ...data.hero },
    services: {
      sectionTitle: data.services?.sectionTitle ?? DEFAULT_CONTENT.services.sectionTitle,
      cards: data.services?.cards ?? JSON.parse(JSON.stringify(DEFAULT_CONTENT.services.cards))
    },
    testimonials: {
      sectionTitle: data.testimonials?.sectionTitle ?? DEFAULT_CONTENT.testimonials.sectionTitle,
      reviews: data.testimonials?.reviews ?? JSON.parse(JSON.stringify(DEFAULT_CONTENT.testimonials.reviews))
    },
    about: { ...DEFAULT_CONTENT.about, ...data.about },
    contact: { ...DEFAULT_CONTENT.contact, ...data.contact },
    footer: { ...DEFAULT_CONTENT.footer, ...data.footer }
  };
}

/* ── Toast ── */
function Toast({ toasts }) {
  return (
    <div className="admin-toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`admin-toast admin-toast-${t.type}`}>
          <span className="admin-toast-icon">{t.type === 'success' ? '✓' : '✕'}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

/* ── Login Screen ── */
function LoginScreen({ onLogin }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem('admin_auth', 'true');
      onLogin();
    } else {
      setErr('Incorrect password.');
      setTimeout(() => setErr(''), 3000);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">Velvet Compass</div>
        <div className="admin-login-subtitle">Admin Control Panel</div>
        <form className="admin-login-form" onSubmit={submit}>
          <div>
            <label className="admin-login-label">Admin Password</label>
            <input
              className="admin-login-input"
              type="password"
              placeholder="Enter password…"
              value={pw}
              onChange={e => setPw(e.target.value)}
              autoFocus
            />
          </div>
          {err && <div className="admin-login-error">⚠ {err}</div>}
          <button className="admin-login-btn" type="submit">Sign In →</button>
        </form>
        <p className="admin-login-hint">Default: velvet2026</p>
      </div>
    </div>
  );
}

/* ── Hero Editor ── */
function HeroEditor({ data, onChange }) {
  const field = (key) => ({
    value: data[key],
    onChange: e => onChange('hero', key, e.target.value)
  });

  return (
    <>
      <div className="admin-card">
        <div className="admin-card-title">🌟 Hero Section</div>
        <div className="admin-form-row">
          <div className="admin-form-group">
            <label className="admin-label">Brand Name</label>
            <input className="admin-input" {...field('brand')} />
            <span className="admin-hint">Appears in navbar and hero heading</span>
          </div>
          <div className="admin-form-row" style={{ gridColumn: 'span 1', gridTemplateColumns: '1fr 1fr' }}>
            <div className="admin-form-group">
              <label className="admin-label">CTA Button 1</label>
              <input className="admin-input" {...field('cta1')} />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">CTA Button 2</label>
              <input className="admin-input" {...field('cta2')} />
            </div>
          </div>
        </div>
        <div className="admin-form-group">
          <label className="admin-label">Hero Tagline</label>
          <textarea className="admin-textarea" rows={3} {...field('tagline')} />
        </div>
      </div>
    </>
  );
}

/* ── Services Editor ── */
function ServicesEditor({ data, onChange, onUpdateCard }) {
  return (
    <>
      <div className="admin-card">
        <div className="admin-card-title">🛎 Services Section</div>
        <div className="admin-form-group">
          <label className="admin-label">Section Title</label>
          <input
            className="admin-input"
            value={data.sectionTitle}
            onChange={e => onChange('services', 'sectionTitle', e.target.value)}
          />
        </div>
      </div>
      <div className="admin-item-list">
        {data.cards.map((card, i) => (
          <div className="admin-item-card" key={card.id}>
            <div className="admin-item-card-header">
              <span className="admin-item-card-number">Card {i + 1}</span>
              <div className="admin-icon-preview">{card.icon || '?'}</div>
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Icon (emoji)</label>
                <input
                  className="admin-input"
                  value={card.icon}
                  onChange={e => onUpdateCard(i, 'icon', e.target.value)}
                  maxLength={4}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Title</label>
                <input
                  className="admin-input"
                  value={card.title}
                  onChange={e => onUpdateCard(i, 'title', e.target.value)}
                />
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Description</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={card.description}
                onChange={e => onUpdateCard(i, 'description', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── Testimonials Editor ── */
function TestimonialsEditor({ data, onChange, onUpdateReview, onAddReview, onRemoveReview }) {
  return (
    <>
      <div className="admin-card">
        <div className="admin-card-title">💬 Testimonials Section</div>
        <div className="admin-form-group">
          <label className="admin-label">Section Title</label>
          <input
            className="admin-input"
            value={data.sectionTitle}
            onChange={e => onChange('testimonials', 'sectionTitle', e.target.value)}
          />
        </div>
      </div>

      <div className="admin-item-list">
        {data.reviews.map((review, i) => (
          <div className="admin-item-card" key={review.id}>
            <div className="admin-item-card-header">
              <span className="admin-item-card-number">Review {i + 1}</span>
              <button
                className="admin-btn-remove"
                onClick={() => onRemoveReview(i)}
                title="Remove review"
              >
                🗑 Remove
              </button>
            </div>
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-label">Name</label>
                <input
                  className="admin-input"
                  value={review.name}
                  onChange={e => onUpdateReview(i, 'name', e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-label">Stars</label>
                <div className="admin-star-picker">
                  {[1, 2, 3, 4, 5].map(s => (
                    <span
                      key={s}
                      className={`admin-star ${s <= review.stars ? 'filled' : ''}`}
                      onClick={() => onUpdateReview(i, 'stars', s)}
                    >★</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Review Text</label>
              <textarea
                className="admin-textarea"
                rows={2}
                value={review.text}
                onChange={e => onUpdateReview(i, 'text', e.target.value)}
              />
            </div>
            <div className="admin-form-group">
              <label className="admin-label">Avatar URL</label>
              <input
                className="admin-input"
                value={review.img}
                onChange={e => onUpdateReview(i, 'img', e.target.value)}
                placeholder="https://i.pravatar.cc/150?img=1"
              />
              <div className="admin-avatar-preview">
                {review.img && (
                  <img
                    src={review.img}
                    alt={review.name}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                )}
                <span className="admin-avatar-hint">
                  Tip: use https://i.pravatar.cc/150?img=N (N = 1–70)
                </span>
              </div>
            </div>
          </div>
        ))}
        <button className="admin-btn-add" onClick={onAddReview}>
          + Add Review
        </button>
      </div>
    </>
  );
}

/* ── About Editor ── */
function AboutEditor({ data, onChange }) {
  const field = (key) => ({
    value: data[key],
    onChange: e => onChange('about', key, e.target.value)
  });
  return (
    <div className="admin-card">
      <div className="admin-card-title">🏢 About Section</div>
      <div className="admin-form-group">
        <label className="admin-label">Section Title</label>
        <input className="admin-input" {...field('title')} />
      </div>
      <div className="admin-form-group">
        <label className="admin-label">Paragraph 1</label>
        <textarea className="admin-textarea" rows={4} {...field('paragraph1')} />
      </div>
      <div className="admin-form-group">
        <label className="admin-label">Paragraph 2</label>
        <textarea className="admin-textarea" rows={3} {...field('paragraph2')} />
      </div>
    </div>
  );
}

/* ── Contact Editor ── */
function ContactEditor({ data, onChange }) {
  const field = (key) => ({
    value: data[key],
    onChange: e => onChange('contact', key, e.target.value)
  });
  return (
    <div className="admin-card">
      <div className="admin-card-title">📬 Contact Section</div>
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label className="admin-label">Heading</label>
          <input className="admin-input" {...field('heading')} />
        </div>
        <div className="admin-form-group">
          <label className="admin-label">Sub-text</label>
          <input className="admin-input" {...field('subtext')} />
        </div>
      </div>
      <hr className="admin-divider" />
      <div className="admin-form-row">
        <div className="admin-form-group">
          <label className="admin-label">📧 Email</label>
          <input className="admin-input" type="email" {...field('email')} />
        </div>
        <div className="admin-form-group">
          <label className="admin-label">📞 Phone</label>
          <input className="admin-input" {...field('phone')} />
        </div>
      </div>
      <div className="admin-form-group">
        <label className="admin-label">📍 Address</label>
        <input className="admin-input" {...field('address')} />
      </div>
    </div>
  );
}

/* ── Footer Editor ── */
function FooterEditor({ data, onChange }) {
  return (
    <div className="admin-card">
      <div className="admin-card-title">🔧 Footer</div>
      <div className="admin-form-group">
        <label className="admin-label">Copyright Text</label>
        <input
          className="admin-input"
          value={data.text}
          onChange={e => onChange('footer', 'text', e.target.value)}
        />
      </div>
    </div>
  );
}

/* ── Overview Tab ── */
function OverviewTab({ content, onTabChange }) {
  const sections = [
    { key: 'hero',         icon: '🌟', label: 'Hero',         desc: 'Brand name, tagline, CTA buttons' },
    { key: 'services',     icon: '🛎', label: 'Services',     desc: `${content.services.cards.length} service cards` },
    { key: 'testimonials', icon: '💬', label: 'Testimonials', desc: `${content.testimonials.reviews.length} reviews` },
    { key: 'about',        icon: '🏢', label: 'About',        desc: 'Mission paragraphs' },
    { key: 'contact',      icon: '📬', label: 'Contact',      desc: `${content.contact.email} · ${content.contact.phone}` },
    { key: 'footer',       icon: '🔧', label: 'Footer',       desc: content.footer.text }
  ];

  return (
    <>
      <div className="admin-stats-row">
        <div className="admin-stat-card">
          <div className="admin-stat-label">Sections</div>
          <div className="admin-stat-value">6</div>
          <div className="admin-stat-sub">Homepage sections</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Services</div>
          <div className="admin-stat-value">{content.services.cards.length}</div>
          <div className="admin-stat-sub">Service cards</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Reviews</div>
          <div className="admin-stat-value">{content.testimonials.reviews.length}</div>
          <div className="admin-stat-sub">Testimonials</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-label">Brand</div>
          <div className="admin-stat-value" style={{ fontSize: 16 }}>{content.hero.brand}</div>
          <div className="admin-stat-sub">Site name</div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-title">📋 Quick Navigation</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {sections.map(s => (
            <div
              key={s.key}
              onClick={() => onTabChange(s.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                background: 'var(--adm-surface2)',
                border: '1px solid var(--adm-border)',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(42,61,102,0.12)'; e.currentTarget.style.borderColor = '#6C8BC7'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
            >
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--adm-text)' }}>{s.label}</div>
                <div style={{ fontSize: 12, color: 'var(--adm-text-light)', marginTop: 2 }}>{s.desc}</div>
              </div>
              <span style={{ marginLeft: 'auto', color: '#6C8BC7', fontSize: 16 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-title">ℹ How It Works</div>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--adm-text-light)', lineHeight: 2, fontSize: 14 }}>
          <li>Edit any section using the sidebar navigation</li>
          <li>Click <strong style={{ color: 'var(--adm-text)' }}>Save Changes</strong> to apply — changes appear on the site instantly</li>
          <li>Use <strong style={{ color: 'var(--adm-text)' }}>Export JSON</strong> to download a backup of all settings</li>
          <li>Use <strong style={{ color: 'var(--adm-text)' }}>Import JSON</strong> to restore from a backup file</li>
          <li>Use <strong style={{ color: 'var(--adm-text)' }}>Reset Defaults</strong> to revert everything to original content</li>
        </ol>
      </div>
    </>
  );
}

/* ══════════════════════════════════
   MAIN ADMIN DASHBOARD COMPONENT
══════════════════════════════════ */
export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem('admin_auth') === 'true'
  );
  const [activeTab, setActiveTab] = useState('overview');
  const [content, setContent] = useState(() => mergeWithDefaults(loadContent()));
  const [isDirty, setIsDirty] = useState(false);
  const [toasts, setToasts] = useState([]);
  const importRef = useRef(null);
  const toastId = useRef(0);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  /* ── field updaters ── */
  const handleFieldChange = useCallback((section, key, value) => {
    setContent(prev => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    setIsDirty(true);
  }, []);

  const handleUpdateServiceCard = useCallback((index, key, value) => {
    setContent(prev => {
      const cards = prev.services.cards.map((c, i) => i === index ? { ...c, [key]: value } : c);
      return { ...prev, services: { ...prev.services, cards } };
    });
    setIsDirty(true);
  }, []);

  const handleUpdateReview = useCallback((index, key, value) => {
    setContent(prev => {
      const reviews = prev.testimonials.reviews.map((r, i) => i === index ? { ...r, [key]: value } : r);
      return { ...prev, testimonials: { ...prev.testimonials, reviews } };
    });
    setIsDirty(true);
  }, []);

  const handleAddReview = useCallback(() => {
    setContent(prev => {
      const maxId = prev.testimonials.reviews.reduce((m, r) => Math.max(m, r.id), 0);
      const reviews = [...prev.testimonials.reviews, {
        id: maxId + 1,
        name: "New Reviewer",
        text: "Write your review here.",
        stars: 5,
        img: "https://i.pravatar.cc/150?img=50"
      }];
      return { ...prev, testimonials: { ...prev.testimonials, reviews } };
    });
    setIsDirty(true);
  }, []);

  const handleRemoveReview = useCallback((index) => {
    setContent(prev => {
      const reviews = prev.testimonials.reviews.filter((_, i) => i !== index);
      return { ...prev, testimonials: { ...prev.testimonials, reviews } };
    });
    setIsDirty(true);
  }, []);

  /* ── save / reset / export / import ── */
  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
      window.dispatchEvent(new Event('velvetContentUpdated'));
      setIsDirty(false);
      addToast('Changes saved and applied to the site!', 'success');
    } catch {
      addToast('Failed to save. Storage may be full.', 'error');
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset all content to default? This will discard all changes.')) return;
    localStorage.removeItem(STORAGE_KEY);
    setContent(mergeWithDefaults(null));
    window.dispatchEvent(new Event('velvetContentUpdated'));
    setIsDirty(false);
    addToast('Content reset to defaults.', 'success');
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'site-content.json';
    a.click();
    URL.revokeObjectURL(url);
    addToast('JSON file downloaded!', 'success');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setContent(mergeWithDefaults(parsed));
        setIsDirty(true);
        addToast('JSON imported. Click Save Changes to apply.', 'success');
      } catch {
        addToast('Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  const NAV_ITEMS = [
    { key: 'overview',      icon: '📊', label: 'Overview' },
    { key: 'hotels',        icon: '🏨', label: 'Hotels Analytics' },
    { key: 'requests',      icon: '📥', label: 'Hotel Requests' },
    { key: 'hero',          icon: '🌟', label: 'Hero Section' },
    { key: 'services',      icon: '🛎', label: 'Services' },
    { key: 'testimonials',  icon: '💬', label: 'Testimonials' },
    { key: 'about',         icon: '🏢', label: 'About Us' },
    { key: 'contact',       icon: '📬', label: 'Contact' },
    { key: 'footer',        icon: '🔧', label: 'Footer' }
  ];

  const SECTION_DESCRIPTIONS = {
    overview:     'Site overview and quick navigation',
    hotels:       'Bookings, monthly trends, and hotel vs platform profit across all hotels',
    requests:     'Approve or reject hotel owner requests to create or edit a hotel',
    hero:         'Edit the hero banner — brand name, tagline, and CTA buttons',
    services:     'Edit the 4 service cards shown on the homepage',
    testimonials: 'Manage customer reviews and ratings',
    about:        'Edit the About Us section text',
    contact:      'Update contact information',
    footer:       'Edit footer copyright text'
  };

  return (
    <div className="admin-root">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-brand">
          Velvet Compass <span>Admin Panel</span>
        </div>
        <div className="admin-header-actions">
          <div className="admin-preview-live">
            <div className="admin-pulse" />
            Live Site
          </div>
          <Link to="/" target="_blank" className="admin-header-btn admin-header-btn-outline">
            ↗ View Site
          </Link>
          <button className="admin-header-btn admin-header-btn-danger" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="admin-body">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-label">Navigation</div>
          {NAV_ITEMS.map(item => (
            <div
              key={item.key}
              className={`admin-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main className="admin-main">
          {/* Toolbar */}
          {activeTab !== 'hotels' && activeTab !== 'requests' && (
          <div className="admin-toolbar">
            <button className="admin-toolbar-btn admin-btn-save" onClick={handleSave}>
              💾 Save Changes
            </button>
            <button className="admin-toolbar-btn admin-btn-export" onClick={handleExport}>
              ↓ Export JSON
            </button>
            <label className="admin-btn-import-label">
              ↑ Import JSON
              <input type="file" accept=".json" ref={importRef} onChange={handleImport} />
            </label>
            <button className="admin-toolbar-btn admin-btn-reset" onClick={handleReset}>
              ↺ Reset Defaults
            </button>
            <div className="admin-toolbar-spacer" />
            {isDirty && (
              <div className="admin-unsaved-badge">
                ● Unsaved changes
              </div>
            )}
          </div>
          )}

          {/* Section Header */}
          <div className="admin-section-header">
            <h2>
              {NAV_ITEMS.find(n => n.key === activeTab)?.icon}{' '}
              {NAV_ITEMS.find(n => n.key === activeTab)?.label}
            </h2>
            <p>{SECTION_DESCRIPTIONS[activeTab]}</p>
          </div>

          {/* Section Content */}
          {activeTab === 'overview' && (
            <OverviewTab content={content} onTabChange={setActiveTab} />
          )}
          {activeTab === 'hotels' && (
            <HotelsAnalytics />
          )}
          {activeTab === 'requests' && (
            <HotelRequests />
          )}
          {activeTab === 'hero' && (
            <HeroEditor data={content.hero} onChange={handleFieldChange} />
          )}
          {activeTab === 'services' && (
            <ServicesEditor
              data={content.services}
              onChange={handleFieldChange}
              onUpdateCard={handleUpdateServiceCard}
            />
          )}
          {activeTab === 'testimonials' && (
            <TestimonialsEditor
              data={content.testimonials}
              onChange={handleFieldChange}
              onUpdateReview={handleUpdateReview}
              onAddReview={handleAddReview}
              onRemoveReview={handleRemoveReview}
            />
          )}
          {activeTab === 'about' && (
            <AboutEditor data={content.about} onChange={handleFieldChange} />
          )}
          {activeTab === 'contact' && (
            <ContactEditor data={content.contact} onChange={handleFieldChange} />
          )}
          {activeTab === 'footer' && (
            <FooterEditor data={content.footer} onChange={handleFieldChange} />
          )}
        </main>
      </div>

      <Toast toasts={toasts} />
    </div>
  );
}
