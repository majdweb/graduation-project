import './home.css';
import heroImage from './assets/homepage_slider.webp';
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { getCurrentUser, clearAuth } from './services/auth';
import NotificationBell from './NotificationBell';

const QUICK_ACTIONS = [
  {
    icon: '📊',
    title: 'Dashboard',
    desc: 'View bookings, manage reservations, and track your calendar.',
    href: '/owner/dashboard',
  },
  {
    icon: '🏨',
    title: 'Hotel Info',
    desc: 'Update your hotel details, address, star rating, and rooms.',
    href: '/owner/hotel-info',
  },
  {
    icon: '📋',
    title: 'Hotel Requests',
    desc: 'Submit requests to update your hotel listing or settings.',
    href: '/owner/requests',
  },
  {
    icon: '📈',
    title: 'Revenue & Stats',
    desc: 'See earnings, occupancy trends, and performance metrics.',
    href: '/owner/stats',
  },
];

const navLinks = [
  { label: 'Services',         href: '/services' },
  { label: 'Hotels',           href: '/hotels' },
  { label: 'About Us',         href: '/about' },
  { label: 'Owner Dashboard',  href: '/owner/dashboard' },
];

export default function OwnerHome() {
  const navigate = useNavigate();

  const ownerProfile = (() => {
    try {
      const user = getCurrentUser() || {};
      const pending = sessionStorage.getItem('pending_signup_profile');
      const p = pending ? JSON.parse(pending) : {};
      return {
        username:  user.username  || p.username  || 'Owner',
        hotelName: user.hotelName || p.hotelName || 'Your Hotel',
      };
    } catch {
      return { username: 'Owner', hotelName: 'Your Hotel' };
    }
  })();

  useEffect(() => {
    const navbar = document.querySelector('.navbar');
    const hero   = document.querySelector('.hero');
    if (!navbar || !hero) return;
    const onScroll = () => {
      const h = hero.offsetHeight;
      if (window.scrollY === 0)        navbar.classList.add('navbar-solid');
      else if (window.scrollY < h - 80) navbar.classList.remove('navbar-solid');
      else                              navbar.classList.add('navbar-solid');
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = () => {
    clearAuth();
    try {
      sessionStorage.removeItem('pending_signup_role');
      sessionStorage.removeItem('pending_signup_profile');
    } catch {}
    navigate('/');
  };

  return (
    <div className="home" id="home">
      <nav className="navbar navbar-solid owner-navbar">
        <Link to="/" className="brand">Velvet Compass</Link>
        <ul className="nav-links">
          {navLinks.map(link => (
            <li key={link.href}>
              <Link to={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
        <div className="owner-profile-slot">
          {/* CHANGED BY AI (2026-07-13): please review — same placement as Navbar.js, inline
              and left of the profile icon. */}
          <NotificationBell inline />
          <div className="owner-profile-menu" tabIndex={0}>
            <button className="owner-profile-trigger" type="button" aria-label="Owner profile">
              <span className="owner-profile-icon">👤</span>
            </button>
            <div className="owner-profile-dropdown">
              <p className="owner-profile-line"><strong>{ownerProfile.username}</strong></p>
              <p className="owner-profile-line">{ownerProfile.hotelName}</p>
              <Link to="/owner/dashboard"  className="owner-profile-dashboard-link">Dashboard</Link>
              <Link to="/owner/hotel-info" className="owner-profile-dashboard-link">Edit Hotel Info</Link>
              <Link to="/owner/requests"   className="owner-profile-dashboard-link">Hotel Requests</Link>
              <button type="button" className="owner-profile-signout-btn" onClick={handleSignOut}>Sign Out</button>
            </div>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <p className="oh-kicker">Owner Portal</p>
          <h1>Welcome back, {ownerProfile.username}</h1>
          <p>{ownerProfile.hotelName} · Manage your hotel from one place</p>
          <div className="hero-buttons">
            <Link className="cta-btn" to="/owner/dashboard">Open Dashboard →</Link>
          </div>
        </div>
        <div className="hero-image">
          <img src={heroImage} alt="Hotel" />
        </div>
      </header>

      <section className="oh-actions-section">
        <div className="oh-actions-header">
          <h2 className="oh-actions-title">Quick Access</h2>
          <p className="oh-actions-sub">Everything you need to manage {ownerProfile.hotelName}</p>
        </div>
        <div className="oh-grid">
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} to={action.href} className="oh-card">
              <span className="oh-card-icon">{action.icon}</span>
              <h3 className="oh-card-title">{action.title}</h3>
              <p className="oh-card-desc">{action.desc}</p>
              <span className="oh-card-arrow">→</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="contact-section">
        <div className="contact-left">
          <h2>Need support?</h2>
          <p>Contact the team for account help or platform issues.</p>
          <a href="/contact" className="contact-btn">Go to Contact →</a>
        </div>
        <div className="contact-divider"></div>
        <div className="contact-right">
          <div className="contact-item">
            <span className="icon">📧</span>
            <p>support@velvetcompass.com</p>
          </div>
          <div className="contact-item">
            <span className="icon">📞</span>
            <p>+1-800-555-0123</p>
          </div>
          <div className="contact-item">
            <span className="icon">⏰</span>
            <p>Mon – Fri, 9 AM – 6 PM</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>© 2026 Velvet Compass. All rights reserved.</p>
      </footer>
    </div>
  );
}
