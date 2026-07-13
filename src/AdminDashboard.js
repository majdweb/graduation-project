import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import HotelsAnalytics from './HotelsAnalytics';
import HotelRequests from './HotelRequests';
import AdminStats from './AdminStats';
import AdminUsers from './AdminUsers';
import { clearAuth } from './services/auth';
import './AdminDashboard.css';

/* ── Overview Tab ── */
function OverviewTab({ onTabChange }) {
  const sections = [
    { key: 'hotels', icon: '🏨', label: 'Hotels Analytics', desc: 'Platform revenue, bookings, and top hotels' },
    { key: 'stats', icon: '📈', label: 'Revenue Stats', desc: 'Monthly/quarterly/yearly revenue charts' },
    { key: 'users', icon: '👥', label: 'Users', desc: 'All users, their activity, and hotels owned' },
    { key: 'requests', icon: '📥', label: 'Hotel Requests', desc: 'Approve or reject hotel owner requests' },
  ];

  return (
    <div className="admin-card">
      <div className="admin-card-title">📋 Quick Navigation</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {sections.map((s) => (
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
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(42,61,102,0.12)'; e.currentTarget.style.borderColor = '#6C8BC7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--adm-border)'; }}
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
  );
}

/* ══════════════════════════════════
   MAIN ADMIN DASHBOARD COMPONENT
══════════════════════════════════ */
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const NAV_ITEMS = [
    { key: 'overview', icon: '📊', label: 'Overview' },
    { key: 'hotels', icon: '🏨', label: 'Hotels Analytics' },
    { key: 'stats', icon: '📈', label: 'Revenue Stats' },
    { key: 'users', icon: '👥', label: 'Users' },
    { key: 'requests', icon: '📥', label: 'Hotel Requests' },
  ];

  const SECTION_DESCRIPTIONS = {
    overview: 'Admin panel overview and quick navigation',
    hotels: 'Platform revenue, bookings, and top hotels',
    stats: 'Monthly, quarterly, and yearly revenue charts across all hotels',
    users: 'All users, their booking activity, and hotels owned',
    requests: 'Approve or reject hotel owner requests to create or edit a hotel',
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
          {NAV_ITEMS.map((item) => (
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
          <div className="admin-section-header">
            <h2>
              {NAV_ITEMS.find((n) => n.key === activeTab)?.icon}{' '}
              {NAV_ITEMS.find((n) => n.key === activeTab)?.label}
            </h2>
            <p>{SECTION_DESCRIPTIONS[activeTab]}</p>
          </div>

          {activeTab === 'overview' && <OverviewTab onTabChange={setActiveTab} />}
          {activeTab === 'hotels' && <HotelsAnalytics />}
          {activeTab === 'stats' && <AdminStats />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'requests' && <HotelRequests />}
        </main>
      </div>
    </div>
  );
}
