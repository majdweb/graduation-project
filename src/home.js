import './home.css';
import heroImage from './assets/homepage_slider.webp';
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSiteContent } from './useSiteContent';
import { getCurrentRole, getCurrentUser, clearAuth } from './services/auth';
import damascusImg from './assets/Damascus.jpg';
import aleppoImg   from './assets/Aleppo.jpg';
import tartousImg  from './assets/Tartous.jpg';
import latakiaImg  from './assets/Latakia.jpg';

const todayStr = () => new Date().toISOString().slice(0, 10);

const TOP_CITIES = [
  { name: 'Damascus', img: damascusImg },
  { name: 'Aleppo',   img: aleppoImg },
  { name: 'Tartous',  img: tartousImg },
  { name: 'Latakia',  img: latakiaImg },
];

export default function Home() {
  const content = useSiteContent();
  const navigate = useNavigate();

  const role = getCurrentRole();
  const isAdmin = role === 'admin';
  const isGuest = role === 'guest';
  const currentUser = isGuest ? getCurrentUser() : null;

  const [searchForm, setSearchForm] = useState({ destination: '', checkIn: '', checkOut: '', guests: 1 });

  const handleSearchChange = (e) => {
    const { name, value } = e.target;
    setSearchForm((prev) => ({ ...prev, [name]: name === 'guests' ? Number(value) : value }));
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate('/search', {
      state: {
        destination: searchForm.destination,
        checkIn: searchForm.checkIn,
        checkOut: searchForm.checkOut,
        guests: searchForm.guests,
      },
    });
  };

  const handleSignOut = () => {
    clearAuth();
    navigate('/');
  };

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

  useEffect(() => {
    const els = document.querySelectorAll('[data-reveal]');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.12 }
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Hotels', href: '/hotels' },
    { label: 'Facilities & Attractions', href: '/facilities-attractions' },
    { label: 'About Us', href: '/about' }
  ];

  return (
    <div className="home" id="home">
      <nav className="navbar navbar-solid">
        <div className="brand">{content.hero.brand}</div>
        <ul className="nav-links">
          {navLinks.map(link => (
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

      <header className="hero">
        <div className="hero-text">
          <h1>{content.hero.brand}</h1>
          <p>{content.hero.tagline}</p>
          <form className="home-search-bar" onSubmit={handleSearchSubmit}>
            <label className="home-search-field">
              <span className="home-search-label">Where do you want to go?</span>
              <input
                type="text"
                name="destination"
                placeholder="City or destination"
                value={searchForm.destination}
                onChange={handleSearchChange}
              />
            </label>
            <label className="home-search-field">
              <span className="home-search-label">Check-in</span>
              <input
                type="date"
                name="checkIn"
                min={todayStr()}
                value={searchForm.checkIn}
                onChange={handleSearchChange}
              />
            </label>
            <label className="home-search-field">
              <span className="home-search-label">Check-out</span>
              <input
                type="date"
                name="checkOut"
                min={searchForm.checkIn || todayStr()}
                value={searchForm.checkOut}
                onChange={handleSearchChange}
              />
            </label>
            <label className="home-search-field home-search-field-guests">
              <span className="home-search-label">Guests</span>
              <input
                type="number"
                name="guests"
                min={1}
                value={searchForm.guests}
                onChange={handleSearchChange}
              />
            </label>
            <button type="submit" className="home-search-btn">Search</button>
          </form>
        </div>
        <div className="hero-image"><img src={heroImage} alt="Hero" /></div>
      </header>

      <section id="services" className="services-section">
        <h2 className="section-title" data-reveal>{content.services.sectionTitle}</h2>
        <div className="services-grid">
          {content.services.cards.map((card, i) => (
            <div key={card.id} className="service-card snow-card" data-reveal style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="snow-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
        <div className="services-more-wrapper" data-reveal>
          <a href="/services" className="services-more-btn">Explore More Services →</a>
        </div>
      </section>

      {/* ── Explore by City ── */}
      <section className="ec-section">
        <div className="ec-header" data-reveal>
          <h2 className="ec-title">Explore by City</h2>
          <Link to="/cities" className="ec-all-btn">All Cities →</Link>
        </div>
        <div className="ec-grid">
          {TOP_CITIES.map((city, i) => (
            <div
              key={city.name}
              className="ec-card"
              data-reveal
              style={{ transitionDelay: `${i * 0.1}s` }}
              onClick={() => navigate('/hotels', { state: { initialFilters: { city: city.name } } })}
            >
              <div className="ec-img-placeholder">
                {city.img
                  ? <img src={city.img} alt={city.name} />
                  : <span className="ec-city-icon">🏙️</span>
                }
              </div>
              <div className="ec-card-body">
                <h3 className="ec-city-name">{city.name}</h3>
                <button className="ec-explore-btn">Explore Hotels →</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="hs-section">
        <h2 className="hs-main-title" data-reveal>★ Numbers ★</h2>
        <div className="hs-stats-row" data-reveal>
          <div className="hs-stat">
            <div className="hs-num-wrap">
              <span className="hs-star">★</span>
              <p className="hs-number">50+</p>
              <span className="hs-star">★</span>
            </div>
            <p className="hs-label">Over Verified Hotels</p>
          </div>

          <div className="hs-divider" />

          <div className="hs-stat">
            <span className="hs-star">★</span>
            <p className="hs-number">5K+</p>
            <span className="hs-star">★</span>
            <p className="hs-label">Over 5K Bookings</p>
          </div>
        </div>

        <div className="hs-avail" data-reveal>
          <h2 className="hs-avail-title">★ Availability ★ </h2>
          <p className="hs-avail-sub">Available in all Syrian cities</p>
        </div>
      </section>

      <section id="testimonials" className="testimonials-section">
        <h2 className="hs-main-title" data-reveal>{content.testimonials.sectionTitle}</h2>
        <div className="testimonials-grid" id="reviews-container">
          {content.testimonials.reviews.map((review, i) => (
            <div key={review.id} className="testimonial-card" data-reveal style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="testimonial-user">
                <img src={review.img} alt={review.name} />
                <h4>{review.name}</h4>
              </div>
              <p className="testimonial-text">{review.text}</p>
              <div className="stars">
                {"★".repeat(review.stars)}{"☆".repeat(5 - review.stars)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="contact-left" data-reveal="left">
          <h2>{content.contact.heading}</h2>
          <p>{content.contact.subtext}</p>
          <a href="/contact" className="contact-btn">Go to Contact Page →</a>
        </div>
        <div className="contact-divider"></div>
        <div className="contact-right" data-reveal="right">
          <div className="contact-item">
            <span className="icon">📧</span>
            <p>{content.contact.email}</p>
          </div>
          <div className="contact-item">
            <span className="icon">📞</span>
            <p>{content.contact.phone}</p>
          </div>
          <div className="contact-item">
            <span className="icon">📍</span>
            <p>{content.contact.address}</p>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>{content.footer.text}</p>
      </footer>
    </div>
  );
}
