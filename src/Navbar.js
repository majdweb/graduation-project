import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCurrentRole, getCurrentUser, clearAuth } from './services/auth';
import NotificationBell from './NotificationBell';

const NAV_LINKS = [
  { label: 'Home',                     href: '/' },
  { label: 'Services',                 href: '/services' },
  { label: 'Hotels',                   href: '/hotels' },
  { label: 'Facilities & Attractions', href: '/facilities-attractions' },
  { label: 'About Us',                 href: '/about' },
];

export default function Navbar({ transparent = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getCurrentRole();
  const isAdmin = role === 'admin';
  const isGuest = role === 'guest';
  const currentUser = isGuest ? getCurrentUser() : null;
  const [solid, setSolid] = useState(!transparent);

  useEffect(() => {
    if (!transparent) {
      setSolid(true);
      return;
    }
    const update = () => {
      const hero = document.querySelector('.hero');
      const heroH = hero ? hero.offsetHeight : 0;
      if (!heroH) { setSolid(true); return; }
      if (window.scrollY === 0) setSolid(true);
      else if (window.scrollY < heroH - 80) setSolid(false);
      else setSolid(true);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
    return () => window.removeEventListener('scroll', update);
  }, [transparent]);

  const handleSignOut = () => { clearAuth(); navigate('/'); };

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' || location.pathname === '/home' : location.pathname === href;

  return (
    <nav className={`navbar${solid ? ' navbar-solid' : ''}`}>
      <Link className="brand" to="/">Velvet Compass</Link>
      <ul className="nav-links">
        {NAV_LINKS.map(link => (
          <li key={link.href}>
            <Link
              to={link.href}
              className={isActive(link.href) ? 'nav-active' : ''}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="auth-buttons">
        {isAdmin ? (
          <>
            {/* CHANGED BY AI (2026-07-13): please review — moved from a fixed floating widget to
                sit inline, left of the account controls. */}
            <NotificationBell inline />
            <Link className="btn login" to="/admin">Admin Dashboard</Link>
            <button type="button" className="btn signup" onClick={handleSignOut}>Sign Out</button>
          </>
        ) : isGuest ? (
          <div className="owner-profile-slot">
            {/* CHANGED BY AI (2026-07-13): please review — moved from a fixed floating widget to
                sit left of the profile icon. */}
            <NotificationBell inline />
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
            <Link className="btn login" to="/login">Login</Link>
            <Link className="btn signup" to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
