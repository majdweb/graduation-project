import './home.css';
import heroImage from './assets/homepage_slider.webp';
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useSiteContent } from './useSiteContent';

export default function Home() {
  const content = useSiteContent();

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
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Hotels', href: '/hotels' },
    { label: 'Rooms', href: '/rooms' },
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
          <a className="btn login" href="/login">Login</a>
          <a className="btn signup" href="/signup">Sign Up</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <h1>{content.hero.brand}</h1>
          <p>{content.hero.tagline}</p>
          <div className="hero-buttons">
            <a href="/hotels" className="cta-btn">{content.hero.cta1}</a>
            <a href="#about" className="cta-btn">{content.hero.cta2}</a>
          </div>
        </div>
        <div className="hero-image"><img src={heroImage} alt="Hero" /></div>
      </header>

      <section id="services" className="services-section">
        <h2 className="section-title">{content.services.sectionTitle}</h2>
        <div className="services-grid">
          {content.services.cards.map(card => (
            <div key={card.id} className="service-card snow-card">
              <div className="snow-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          ))}
        </div>
        <div className="services-more-wrapper">
          <a href="/services" className="services-more-btn">Explore More Services →</a>
        </div>
      </section>

      <section id="testimonials" className="testimonials-section">
        <h2 className="section-title">{content.testimonials.sectionTitle}</h2>
        <div className="testimonials-grid" id="reviews-container">
          {content.testimonials.reviews.map(review => (
            <div key={review.id} className="testimonial-card">
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

      <section id="about" className="about-section">
        <div className="about-left">
          <h2 className="about-title">{content.about.title}</h2>
          <p className="about-text">{content.about.paragraph1}</p>
          <p className="about-text">{content.about.paragraph2}</p>
          <a href="/about" className="about-btn">Learn More →</a>
        </div>
        <div className="about-right">
          <div className="about-grid">
            <img src="https://images.unsplash.com/photo-1505691938895-1758d7feb511" alt="Hotel Room" />
            <img src="https://images.unsplash.com/photo-1502672023488-70e25813eb80" alt="Hotel Lobby" />
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267" alt="Luxury Suite" />
            <img src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae" alt="Hotel Bed" />
            <img src="https://images.unsplash.com/photo-1505693416388-ac5ce068fe85" alt="Hotel View" />
            <img src="https://images.unsplash.com/photo-1505691723518-36a5ac3be353" alt="Hotel View" />
          </div>
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="contact-left">
          <h2>{content.contact.heading}</h2>
          <p>{content.contact.subtext}</p>
          <a href="/contact" className="contact-btn">Go to Contact Page →</a>
        </div>
        <div className="contact-divider"></div>
        <div className="contact-right">
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
