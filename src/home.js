import './home.css';
import heroImage from './assets/homepage_slider.webp';
import { useEffect } from "react";
export default function Home() {
    /* use effect to transparent */
useEffect(() => {
  const navbar = document.querySelector(".navbar");
  const hero = document.querySelector(".hero");

  const handleScroll = () => {
    const heroHeight = hero.offsetHeight;

    if (window.scrollY === 0) {
      // أول ما أفتح الصفحة → غامق
      navbar.classList.add("navbar-solid");
    } 
    else if (window.scrollY > 0 && window.scrollY < heroHeight - 80) {
      // داخل الـHero → شفاف
      navbar.classList.remove("navbar-solid");
    } 
    else {
      // بعد الـHero → غامق
      navbar.classList.add("navbar-solid");
    }
  };

  window.addEventListener("scroll", handleScroll);
  handleScroll();

  return () => window.removeEventListener("scroll", handleScroll);
}, []);




      const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Services', href: '#services' },
    { label: 'Rooms', href: '#rooms' },
    { label: 'Reservation', href: '#reservation' },
    { label: 'About Us', href: '#about' },
    { label: 'Contact', href: '#contact' },

  ];
  return (
    <div className="home" id="home">
      <nav className="navbar navbar-solid">
        <div className="brand">Velvet Compass</div>
        <ul className="nav-links">
          {navLinks.map(link => (
            <li key={link.href}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
        <div className="auth-buttons">
          <a className="btn login" href="/login.html">Login</a>
          <a className="btn signup" href="/signup.html">Sign Up</a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-text">
          <h1>Velvet Compass</h1>
          <p>Your trusted hotel booking platform connecting guests directly with hotel owners for the best deals and experiences.</p>
          <div className="hero-buttons">
            <button className="cta-btn">Explore Hotels</button>
            <a href="#about" className="cta-btn">Learn More</a>
          </div>
        </div>
        <div className="hero-image"><img src={heroImage} alt="Hero Image" /></div>
      </header>
      


<section id="services" className="services-section">
  <h2 className="section-title">Our Premium Services</h2>

  <div className="services-grid">

    <div className="service-card snow-card">
      <div className="snow-icon">🧭</div>
      <h3>Smart Booking</h3>
      <p>Direct prices, real‑time availability, and a seamless booking experience.</p>
    </div>

    <div className="service-card snow-card">
      <div className="snow-icon">🏨</div>
      <h3>Hotel Owner Tools</h3>
      <p>Manage rooms, bookings, and pricing with a powerful dashboard.</p>
    </div>

    <div className="service-card snow-card">
      <div className="snow-icon">⚡</div>
      <h3>Instant Confirmation</h3>
      <p>Immediate confirmation for guests and instant notifications for owners.</p>
    </div>

    <div className="service-card snow-card">
      <div className="snow-icon">🔒</div>
      <h3>Secure Payments</h3>
      <p>Encrypted transactions with industry‑grade security.</p>
    </div>
  </div>

  <div className="services-more-wrapper">
  <a href="/services" className="services-more-btn">
    Explore More Services →
  </a>
</div>

</section>



      <section id="testimonials" className="section">
        <h2>What Our Users Say</h2>
        <div className="testimonials">
          <div className="testimonial">
            <p>"Velvet Compass made finding the perfect hotel room so easy. The direct booking saved me money and time!"</p>
            <cite>- Sarah Johnson, Traveler</cite>
          </div>
          <div className="testimonial">
            <p>"As a hotel owner, this platform has increased my bookings significantly. Highly recommended!"</p>
            <cite>- Ahmed Al-Rashid, Hotel Owner</cite>
          </div>
          <div className="testimonial">
            <p>"The user interface is intuitive and the support team is always helpful. Great experience overall."</p>
            <cite>- Maria Garcia, Frequent Traveler</cite>
          </div>
        </div>
        <button className="section-btn" onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}>Contact Us</button>
      </section>

      <section id="about" className="section">
        <h2>About Us</h2>
        <p>Velvet Compass is a revolutionary hotel booking platform designed to bridge the gap between hotel owners and travelers. Our mission is to provide a seamless, direct booking experience that benefits both parties. Hotel owners can list their rooms easily, while guests enjoy competitive prices and personalized service.</p>
        <p>Founded in 2026, we have quickly become a trusted name in the hospitality industry, offering innovative solutions for modern travel needs.</p>
        <button className="section-btn" onClick={() => document.getElementById('services').scrollIntoView({ behavior: 'smooth' })}>Our Services</button>
      </section>

      <section id="contact" className="section">
        <h2>Contact Us</h2>
        <p>Have questions or need assistance? We're here to help!</p>
        <p>Email: support@velvetcompass.com</p>
        <p>Phone: +1-800-555-0123</p>
        <p>Address: 123 Hotel Street, Booking City, BC 12345</p>
        <button className="section-btn" onClick={() => document.getElementById('home').scrollIntoView({ behavior: 'smooth' })}>Back to Top</button>
      </section>

      <footer className="footer">
        <p>© 2026 Velvet Compass. All rights reserved.</p>
      </footer>
    </div>
  );
}