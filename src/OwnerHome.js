import './home.css';
import heroImage from './assets/homepage_slider.webp';
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function OwnerHome() {
  const navigate = useNavigate();

  const ownerProfile = (() => {
    try {
      const raw = localStorage.getItem('mock_auth_user');
      const parsed = raw ? JSON.parse(raw) : {};
      const user = parsed?.user || {};
      const pendingRaw = sessionStorage.getItem('pending_signup_profile');
      const pendingProfile = pendingRaw ? JSON.parse(pendingRaw) : {};
      return {
        username: user.username || pendingProfile.username || 'Owner',
        hotelName: user.hotelName || parsed?.hotelName || pendingProfile.hotelName || 'Your Hotel',
      };
    } catch (error) {
      return { username: 'Owner', hotelName: 'Your Hotel' };
    }
  })();

  const ownerStats = [
    { label: "New bookings", value: "12", note: "+3 since yesterday" },
    { label: "Pending approvals", value: "4", note: "Needs your review" },
    { label: "Occupancy", value: "86%", note: "This week" },
    { label: "Revenue", value: "$4.2k", note: "Projected this month" },
  ];

  useEffect(() => {
    const reviews = [
      {
        name: "Lina Mansour",
        text: "The booking process was incredibly smooth and the interface feels premium.",
        stars: 5,
        img: "https://i.pravatar.cc/150?img=11"
      },
      {
        name: "Hadi Nasser",
        text: "I found great hotel deals that I couldn't find anywhere else. Highly recommended!",
        stars: 4,
        img: "https://i.pravatar.cc/150?img=22"
      },
      {
        name: "Emily Carter",
        text: "Fast, reliable, and beautifully designed. This platform is now my go‑to for hotel reservations.",
        stars: 5,
        img: "https://i.pravatar.cc/150?img=36"
      }
    ];

    const container = document.getElementById("reviews-container-owner");
    if (container) {
      container.innerHTML = reviews.map(r => `
        <div class="testimonial-card">
          <div class="testimonial-user">
            <img src="${r.img}" alt="${r.name}">
            <h4>${r.name}</h4>
          </div>
          <p class="testimonial-text">${r.text}</p>
          <div class="stars">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</div>
        </div>
      `).join("");
    }
  }, []);

  useEffect(() => {
    const navbar = document.querySelector(".navbar");
    const hero = document.querySelector(".hero");

    const handleScroll = () => {
      const heroHeight = hero.offsetHeight;

      if (window.scrollY === 0) {
        navbar.classList.add("navbar-solid");
      } else if (window.scrollY > 0 && window.scrollY < heroHeight - 80) {
        navbar.classList.remove("navbar-solid");
      } else {
        navbar.classList.add("navbar-solid");
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: 'Services', href: '/services' },
    { label: 'Rooms', href: '/rooms' },
    { label: 'About Us', href: '/about' },
    { label: 'Owner Dashboard', href: '/owner/dashboard' }
  ];

  const handleSignOut = () => {
    try {
      localStorage.removeItem('mock_auth_user');
      localStorage.removeItem('mock_auth_role');
      localStorage.removeItem('mock_auth_token');
      sessionStorage.removeItem('pending_signup_role');
      sessionStorage.removeItem('pending_signup_profile');
    } catch (error) {}
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
          <div className="owner-profile-menu" tabIndex={0}>
            <button className="owner-profile-trigger" type="button" aria-label="Owner profile">
              <span className="owner-profile-icon">👤</span>
            </button>
            <div className="owner-profile-dropdown">
              <p className="owner-profile-line"><strong>{ownerProfile.username}</strong></p>
              <p className="owner-profile-line">{ownerProfile.hotelName}</p>
              <Link to="/owner/dashboard" className="owner-profile-dashboard-link">Dashboard</Link>
              <Link to="/owner/hotel-info" className="owner-profile-dashboard-link">Edit Hotel Info</Link>
              <button type="button" className="owner-profile-signout-btn" onClick={handleSignOut}>Sign Out</button>
            </div>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <p className="owner-kicker">Owner Portal</p>
          <h1>Welcome back, hotel owner</h1>
          <p>
            Manage bookings, check pending requests, and keep your rooms updated from one place.
          </p>
          <div className="hero-buttons">
            <a className="cta-btn" href="/owner/dashboard">Open Owner Dashboard</a>
            <a href="#overview" className="cta-btn">View overview</a>
          </div>
        </div>
        <div className="hero-image owner-hero-panel">
          <img src={heroImage} alt="Hero Image" />
          <div className="owner-badge">Hotel owner mode</div>
        </div>
      </header>

      <section id="overview" className="services-section">
        <h2 className="section-title">Today at a glance</h2>
        <div className="services-grid">
          {ownerStats.map((item) => (
            <div key={item.label} className="service-card snow-card">
              <div className="snow-icon">📊</div>
              <h3>{item.label}</h3>
              <p style={{ fontSize: 28, fontWeight: 700, margin: '10px 0 6px' }}>{item.value}</p>
              <p>{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="services-section">
        <h2 className="section-title">Our Premium Services</h2>
        <div className="services-grid">
          <div className="service-card snow-card">
            <div className="snow-icon">🗂️</div>
            <h3>Manage Rooms</h3>
            <p>Add, edit, block, or remove rooms from the dashboard.</p>
          </div>
          <div className="service-card snow-card">
            <div className="snow-icon">✅</div>
            <h3>Approve Requests</h3>
            <p>Review pending bookings and confirm them quickly.</p>
          </div>
          <div className="service-card snow-card">
            <div className="snow-icon">📅</div>
            <h3>Check Calendar</h3>
            <p>See arrivals, departures, and in-house guests for each day.</p>
          </div>
          <div className="service-card snow-card">
            <div className="snow-icon">⚙️</div>
            <h3>Update Settings</h3>
            <p>Control campaign, cancellation policy, and auto-accept rules.</p>
          </div>
        </div>
      </section>

      <section id="testimonials" className="testimonials-section">
        <h2 className="section-title">Owner tips</h2>
        <div className="testimonials-grid" id="reviews-container-owner"></div>
      </section>

      <section id="contact" className="contact-section">
        <div className="contact-left">
          <h2>Need support?</h2>
          <p>Use the owner dashboard for operations, or contact the team for account help.</p>
          <a href="/owner/dashboard" className="contact-btn">Go to Owner Dashboard →</a>
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
            <span className="icon">📍</span>
            <p>Owner support desk, Booking City</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>© 2026 Velvet Compass. All rights reserved.</p>
      </footer>
    </div>
  );
}
