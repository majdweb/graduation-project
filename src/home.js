import './home.css';
import heroImage from './assets/homepage_slider.webp';
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSiteContent } from './useSiteContent';
import { getHotels, getStats } from './services/hotels';

import hotelsStatImg  from './assets/verified hotels.jpg';
import citiesStatImg  from './assets/city.jpg';
import roomsStatImg     from './assets/rooms.jpg';
import bookingsStatImg  from './assets/total bookings.jpg';
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

  const [searchForm, setSearchForm] = useState({ destination: '', checkIn: '', checkOut: '', guests: 1 });
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [hotelStats, setHotelStats] = useState({ hotels: 0, cities: 0, bookings: 0, rooms: 0 });

  useEffect(() => {
    getHotels().then(hotels => {
      const highStar = hotels.filter(h => Number(h.stars) >= 4);
      const byCity = {};
      highStar.forEach(h => {
        if (!byCity[h.city] || Number(h.stars) > Number(byCity[h.city].stars)) {
          byCity[h.city] = h;
        }
      });
      setFeaturedHotels(Object.values(byCity).sort((a, b) => Number(b.stars) - Number(a.stars)));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    getStats().then(s => setHotelStats(s)).catch(() => {});
  }, []);

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
  }, [featuredHotels]);

  return (
    <div className="home" id="home">
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

      {/* ── Featured Hotels ── */}
      {featuredHotels.length > 0 && (
        <section className="fh-section">
          <div className="fh-header" data-reveal>
            <h2 className="fh-title">Recommended Hotels</h2>
            <button
              className="fh-more-btn"
              onClick={() => navigate('/hotels', { state: { initialFilters: { stars: [4, 5] } } })}
            >
              View More →
            </button>
          </div>
          <div className="fh-grid">
            {featuredHotels.map((hotel, i) => (
              <div
                key={hotel.hotelId || hotel.hotelName}
                className="fh-card"
                data-reveal
                style={{ transitionDelay: `${i * 0.08}s` }}
                onClick={() => navigate('/hotels', { state: { initialFilters: { city: hotel.city } } })}
              >
                <div className="fh-img">
                  {hotel.cardPhoto
                    ? <img src={hotel.cardPhoto} alt={hotel.hotelName} />
                    : <span className="fh-img-icon">🏨</span>
                  }
                </div>
                <div className="fh-card-body">
                  <div className="fh-stars">{'★'.repeat(Number(hotel.stars) || 0)}</div>
                  <h3 className="fh-hotel-name">{hotel.hotelName}</h3>
                  <p className="fh-city">{hotel.city}</p>
                  {hotel.minPrice && (
                    <p className="fh-price">From ${hotel.minPrice}/night</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Live Stats ── */}
      <section className="ls-section">
        <div className="ls-heading">
          <h2 className="ls-title">Numbers</h2>
          <p className="ls-subtitle">Live data from our platform</p>
        </div>
        <div className="ls-grid">
          <div className="ls-card">
            <div className="ls-card-img">
              <img src={hotelsStatImg} alt="Hotels" />
            </div>
            <div className="ls-card-overlay" />
            <div className="ls-card-body">
              <span className="ls-num">{hotelStats.hotels || '—'}</span>
              <span className="ls-label">Verified Hotels</span>
            </div>
          </div>
          <div className="ls-card">
            <div className="ls-card-img">
              <img src={citiesStatImg} alt="Cities" />
            </div>
            <div className="ls-card-overlay" />
            <div className="ls-card-body">
              <span className="ls-num">{hotelStats.cities || '—'}</span>
              <span className="ls-label">Cities Covered</span>
            </div>
          </div>
          <div className="ls-card">
            <div className="ls-card-img">
              <img src={bookingsStatImg} alt="Bookings" />
            </div>
            <div className="ls-card-overlay" />
            <div className="ls-card-body">
              <span className="ls-num">{hotelStats.bookings || '—'}</span>
              <span className="ls-label">Total Bookings</span>
            </div>
          </div>
          <div className="ls-card">
            <div className="ls-card-img">
              <img src={roomsStatImg} alt="Rooms" />
            </div>
            <div className="ls-card-overlay" />
            <div className="ls-card-body">
              <span className="ls-num">{hotelStats.rooms || '—'}</span>
              <span className="ls-label">Rooms Available</span>
            </div>
          </div>
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
