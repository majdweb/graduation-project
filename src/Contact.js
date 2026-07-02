import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentRole, getCurrentUser, clearAuth } from './services/auth';
import './home.css';
import './contact.css';

const INFO_ITEMS = [
  { icon: '📧', label: 'Email',         value: 'support@velvetcompass.com' },
  { icon: '📞', label: 'Phone',         value: '+1-800-555-0123' },
  { icon: '📍', label: 'Address',       value: '123 Booking Avenue, Travel City' },
  { icon: '⏰', label: 'Support Hours', value: 'Mon – Fri, 9 AM – 6 PM' },
];

const NAV_LINKS = [
  { label: 'Home',     href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Hotels',   href: '/hotels' },
  { label: 'About Us', href: '/about' },
  { label: 'Contact',  href: '/contact' },
];

export default function Contact() {
  const navigate = useNavigate();
  const role = getCurrentRole();
  const isGuest = role === 'guest';
  const isAdmin = role === 'admin';
  const currentUser = isGuest ? getCurrentUser() : null;

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.1 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleSignOut = () => {
    clearAuth();
    navigate('/');
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in your name, email, and message.');
      return;
    }
    setError('');
    setSent(true);
  };

  return (
    <div className="cp-page">
      {/* Same navbar as home.js */}
      <nav className="navbar navbar-solid">
        <div className="brand">Velvet Compass</div>
        <ul className="nav-links">
          {NAV_LINKS.map(link => (
            <li key={link.href}>
              <Link to={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
        <div className="auth-buttons">
          {isAdmin ? (
            <>
              <Link className="btn login" to="/admin">Admin Dashboard</Link>
              <button type="button" className="btn signup" onClick={handleSignOut}>Sign Out</button>
            </>
          ) : isGuest ? (
            <div className="owner-profile-slot">
              <div className="owner-profile-menu" tabIndex={0}>
                <button className="owner-profile-trigger" type="button" aria-label="Account profile">
                  <span className="owner-profile-icon">👤</span>
                </button>
                <div className="owner-profile-dropdown">
                  <p className="owner-profile-line"><strong>{currentUser?.username || 'Guest'}</strong></p>
                  <p className="owner-profile-line">{currentUser?.email || ''}</p>
                  <Link to="/my-bookings" className="owner-profile-dashboard-link">My Bookings</Link>
                  <button type="button" className="owner-profile-signout-btn" onClick={handleSignOut}>Sign Out</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <a className="btn login" href="/login">Login</a>
              <a className="btn signup" href="/signup">Sign Up</a>
            </>
          )}
        </div>
      </nav>

      <header className="cp-hero">
        <h1>Get in Touch</h1>
        <p>We'd love to hear from you — questions, feedback, or just a hello.</p>
      </header>

      <section className="cp-body">
        <div className="cp-form-card" data-reveal>
          <h2>Send us a message</h2>

          {sent ? (
            <div className="cp-success">
              <div className="cp-success-icon">✉️</div>
              <h3>Message sent!</h3>
              <p>
                Thanks, <strong>{form.name}</strong>. We'll get back to you at{' '}
                <strong>{form.email}</strong> shortly.
              </p>
              <button
                className="cp-reset-btn"
                onClick={() => {
                  setSent(false);
                  setForm({ name: '', email: '', subject: '', message: '' });
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="cp-form">
              <div className="cp-field">
                <label htmlFor="cp-name">Full Name</label>
                <input
                  id="cp-name"
                  name="name"
                  placeholder="Jane Doe"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className="cp-field">
                <label htmlFor="cp-email">Email Address</label>
                <input
                  id="cp-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              <div className="cp-field">
                <label htmlFor="cp-subject">Subject</label>
                <input
                  id="cp-subject"
                  name="subject"
                  placeholder="What is this about?"
                  value={form.subject}
                  onChange={handleChange}
                />
              </div>
              <div className="cp-field">
                <label htmlFor="cp-message">Message</label>
                <textarea
                  id="cp-message"
                  name="message"
                  rows={6}
                  placeholder="Write your message here…"
                  value={form.message}
                  onChange={handleChange}
                />
              </div>
              {error && <p className="cp-error">{error}</p>}
              <button type="submit" className="cp-submit-btn">Send Message</button>
            </form>
          )}
        </div>

        <div className="cp-info">
          {INFO_ITEMS.map((item, i) => (
            <div
              key={item.label}
              className="cp-info-card"
              data-reveal="right"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <span className="cp-info-icon">{item.icon}</span>
              <div>
                <h4>{item.label}</h4>
                <p>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="cp-footer">
        <p>© 2026 Velvet Compass. All rights reserved.</p>
      </footer>
    </div>
  );
}
